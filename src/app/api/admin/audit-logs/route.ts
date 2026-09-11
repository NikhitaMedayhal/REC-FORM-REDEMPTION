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
    SELECT id, srn, ip, user_type, action, detail, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 100
  `);

  return NextResponse.json({ logs: result.rows });
}
