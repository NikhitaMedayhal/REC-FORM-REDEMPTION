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
    SELECT srn, prn, name, role, program, branch, section, semester,
           email, phone, campus, created_at, last_login
    FROM users
    ORDER BY last_login DESC
  `);

  return NextResponse.json({ users: result.rows });
}
