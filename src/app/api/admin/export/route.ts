import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { buildApplicationsWorkbook, type ApplicationRow } from "@/lib/xlsxExport";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await db();
  const result = await client.execute(`
    SELECT id, fullName, srn, branch, year, email, phone,
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

  const applications = result.rows as unknown as ApplicationRow[];
  const workbook = buildApplicationsWorkbook(applications);
  const buffer = await workbook.xlsx.writeBuffer();

  await client.execute({
    sql: `INSERT INTO audit_logs (srn, ip, user_type, action, detail) VALUES (?, ?, ?, ?, ?)`,
    args: [
      admin.srn,
      null,
      admin.role,
      "export",
      `Exported ${applications.length} applications`,
    ],
  });

  const filename = `applications-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Exported-Count": String(applications.length),
    },
  });
}
