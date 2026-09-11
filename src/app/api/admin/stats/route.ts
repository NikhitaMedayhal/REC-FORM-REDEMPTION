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

  const [usersCount, submissionsCount, ips, recentAudit, recentApps] =
    await Promise.all([
      client.execute(`SELECT COUNT(*) as count FROM users`),
      client.execute(`SELECT COUNT(*) as count FROM applications`),
      client.execute(`
        SELECT ip, COUNT(*) as hits, MAX(created_at) as last_seen
        FROM audit_logs
        WHERE ip IS NOT NULL
        GROUP BY ip
        ORDER BY hits DESC
        LIMIT 10
      `),
      client.execute(`
        SELECT srn, action, ip, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 15
      `),
      client.execute(`
        SELECT srn, fullName, createdAt
        FROM applications
        ORDER BY createdAt DESC
        LIMIT 15
      `),
    ]);

  const activity = [
    ...recentAudit.rows.map((r) => ({
      type: "audit" as const,
      srn: r.srn as string,
      action: r.action as string,
      ip: r.ip as string | null,
      created_at: r.created_at as string,
    })),
    ...recentApps.rows.map((r) => ({
      type: "application" as const,
      srn: r.srn as string,
      action: `Application submitted by ${r.fullName as string}`,
      ip: null,
      created_at: r.createdAt as string,
    })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15);

  return NextResponse.json({
    metrics: {
      totalUsers: Number(usersCount.rows[0]?.count ?? 0),
      totalSubmissions: Number(submissionsCount.rows[0]?.count ?? 0),
    },
    ips: ips.rows.map((r) => ({
      ip: r.ip,
      hits: Number(r.hits),
      last_seen: r.last_seen,
    })),
    activity,
  });
}
