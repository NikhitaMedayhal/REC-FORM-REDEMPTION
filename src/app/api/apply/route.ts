import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";
import { applicationSchema } from "@/lib/validation";
import { checkSubmissionRateLimit } from "@/lib/rateLimit";
import { appendFormSubmissionToSheet } from "@/lib/googleSheets";
import { deriveYear } from "@/lib/date";

export const runtime = "nodejs";

function getClientIp(req: NextRequest): string {
  // sourceIp must come from req.headers, not from the NextRequest object
  // itself — req.ip is unreliable/undefined on most deployment targets.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const SHEET_TAB_NAME = "Recruitment Applications";

const SHEET_HEADER_ROW = [
  "Full Name",
  "SRN",
  "Branch",
  "Year",
  "Email",
  "Phone",
  "Domains",
  "Experience",
  "Portfolio URL",
  "Why Join",
  "Tech: Cyber Experience",
  "Tech: Language",
  "Tech: Why Domain",
  "Tech: Prior Experience",
  "Tech: CTF Participated",
  "Tech: CTF Other",
  "Tech: CTF Confidence",
  "Tech: GitHub",
  "Tech: LinkedIn",
  "Tech: Project",
  "Events: Why Join",
  "Events: Prior Experience",
  "Events: Plan Steps",
  "Events: Orientation Ideas",
  "Events: Excites",
  "Marketing: Why Domain",
  "Marketing: Experience",
  "Marketing: Confidence",
  "Media: Why Domain",
  "Media: Tools",
  "Media: Portfolio",
  "Design: Why Domain",
  "Design: Tools",
  "Design: Confidence",
  "Feedback",
  "Submitted At",
];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Require a logged-in user.
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Rate limit by IP.
  if (!checkSubmissionRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please slow down." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Honeypot check (validation schema also enforces max length 0,
  // this is a fast-path short-circuit before full parsing).
  if (typeof body.website === "string" && body.website.length > 0) {
    // Pretend success so bots don't learn they were caught.
    return NextResponse.json({ ok: true });
  }

  // 4. Identity fields must never come from the client. Overwrite
  // whatever the request body claims with the verified values from the
  // JWT session before validation, so a tampered payload can't forge an
  // application under someone else's name/srn/branch, or claim a year
  // that doesn't match their actual semester.
  body.fullName = session.name;
  body.srn = session.srn;
  body.branch = session.branch;
  body.year = deriveYear(session.semester);

  // 5. Validate with the shared Zod schema.
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const clean = parsed.data;
  const client = await db();

  try {
    await client.execute({
      sql: `
        INSERT INTO applications (
          user_srn, fullName, srn, branch, year, email, phone,
          domains, domainAnswers, experience, portfolioUrl, whyJoin,
          techCyberExperience, techLanguage, techWhyDomain, techPriorExperience,
          techCtfParticipated, techCtfOther, techCtfConfidence, techGithub,
          techLinkedin, techProject,
          eventsWhyJoin, eventsPriorExperience, eventsPlanSteps,
          eventsOrientationIdeas, eventsExcites,
          marketingWhyDomain, marketingExperience, marketingConfidence,
          mediaWhyDomain, mediaTools, mediaPortfolio,
          designWhyDomain, designTools, designConfidence,
          feedback, sourceIp
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `,
      args: [
        session.srn,
        clean.fullName,
        clean.srn,
        clean.branch,
        clean.year,
        clean.email,
        clean.phone,
        JSON.stringify(clean.domains),
        clean.domainAnswers ? JSON.stringify(clean.domainAnswers) : null,
        clean.experience ?? null,
        clean.portfolioUrl ?? null,
        clean.whyJoin ?? null,
        clean.techCyberExperience ?? null,
        clean.techLanguage ?? null,
        clean.techWhyDomain ?? null,
        clean.techPriorExperience ?? null,
        clean.techCtfParticipated ?? null,
        clean.techCtfOther ?? null,
        clean.techCtfConfidence ?? null,
        clean.techGithub ?? null,
        clean.techLinkedin ?? null,
        clean.techProject ?? null,
        clean.eventsWhyJoin ?? null,
        clean.eventsPriorExperience ?? null,
        clean.eventsPlanSteps ?? null,
        clean.eventsOrientationIdeas ?? null,
        clean.eventsExcites ?? null,
        clean.marketingWhyDomain ?? null,
        clean.marketingExperience ?? null,
        clean.marketingConfidence ?? null,
        clean.mediaWhyDomain ?? null,
        clean.mediaTools ?? null,
        clean.mediaPortfolio ?? null,
        clean.designWhyDomain ?? null,
        clean.designTools ?? null,
        clean.designConfidence ?? null,
        clean.feedback ?? null,
        ip,
      ],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("UNIQUE") && message.includes("email")) {
      return NextResponse.json(
        { error: "An application with this email already exists" },
        { status: 409 }
      );
    }
    if (message.includes("UNIQUE") && message.includes("srn")) {
      return NextResponse.json(
        { error: "An application with this SRN already exists" },
        { status: 409 }
      );
    }
    if (message.includes("UNIQUE") && message.includes("user_srn")) {
      return NextResponse.json(
        { error: "You have already submitted an application" },
        { status: 409 }
      );
    }

    console.error("[apply] insert failed:", err);
    return NextResponse.json(
      { error: "Failed to save application" },
      { status: 500 }
    );
  }

  await client.execute({
    sql: `INSERT INTO audit_logs (srn, ip, user_type, action, detail) VALUES (?, ?, ?, ?, ?)`,
    args: [session.srn, ip, session.role, "apply", "Submitted application"],
  });

  // 8. Sync to Google Sheets — never fail the request if this errors.
  try {
    await appendFormSubmissionToSheet(
      SHEET_TAB_NAME,
      SHEET_HEADER_ROW,
      [
        clean.fullName,
        clean.srn,
        clean.branch,
        clean.year,
        clean.email,
        clean.phone,
        clean.domains.join(", "),
        clean.experience ?? "",
        clean.portfolioUrl ?? "",
        clean.whyJoin ?? "",
        clean.techCyberExperience ?? "",
        clean.techLanguage ?? "",
        clean.techWhyDomain ?? "",
        clean.techPriorExperience ?? "",
        clean.techCtfParticipated ?? "",
        clean.techCtfOther ?? "",
        clean.techCtfConfidence ?? "",
        clean.techGithub ?? "",
        clean.techLinkedin ?? "",
        clean.techProject ?? "",
        clean.eventsWhyJoin ?? "",
        clean.eventsPriorExperience ?? "",
        clean.eventsPlanSteps ?? "",
        clean.eventsOrientationIdeas ?? "",
        clean.eventsExcites ?? "",
        clean.marketingWhyDomain ?? "",
        clean.marketingExperience ?? "",
        clean.marketingConfidence ?? "",
        clean.mediaWhyDomain ?? "",
        clean.mediaTools ?? "",
        clean.mediaPortfolio ?? "",
        clean.designWhyDomain ?? "",
        clean.designTools ?? "",
        clean.designConfidence ?? "",
        clean.feedback ?? "",
        new Date().toISOString(),
      ],
      clean.srn
    );
  } catch (err) {
    console.error("[apply] Google Sheets sync failed:", err);
    // Don't fail the request — the application is already saved in the DB.
  }

  return NextResponse.json({ ok: true });
}
