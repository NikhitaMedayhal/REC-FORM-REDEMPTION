import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await db();
  const result = await client.execute(`
    SELECT id, user_srn, fullName, srn, branch, year, email, phone,
           domains, domainAnswers, experience, portfolioUrl, whyJoin,
           techCyberExperience, techLanguage, techWhyDomain, techPriorExperience,
           techCtfParticipated, techCtfOther, techCtfConfidence, techGithub,
           techLinkedin, techProject,
           eventsWhyJoin, eventsPriorExperience, eventsPlanSteps,
           eventsOrientationIdeas, eventsExcites,
           marketingWhyDomain, marketingExperience, marketingConfidence,
           mediaWhyDomain, mediaTools, mediaPortfolio,
           designWhyDomain, designTools, designConfidence,
           feedback, createdAt
    FROM applications
    ORDER BY createdAt DESC
  `);

  const submissions = result.rows.map((row) => {
    let domains: string[] = [];
    try {
      domains = JSON.parse(row.domains as string);
    } catch {
      domains = [];
    }

    let domainAnswers: Record<string, unknown> | null = null;
    if (row.domainAnswers) {
      try {
        domainAnswers = JSON.parse(row.domainAnswers as string);
      } catch {
        domainAnswers = null;
      }
    }

    // sourceIp intentionally excluded from the response.
    const { sourceIp: _sourceIp, ...rest } = row as Record<string, unknown>;

    return { ...rest, domains, domainAnswers };
  });

  return NextResponse.json({ submissions });
}
