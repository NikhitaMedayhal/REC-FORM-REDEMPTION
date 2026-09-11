import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ srn: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { srn: targetSrn } = await params;

  if (targetSrn === admin.srn) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const client = await db();

  const current = await client.execute({
    sql: `SELECT role FROM users WHERE srn = ?`,
    args: [targetSrn],
  });

  const currentRow = current.rows[0] as unknown as
    | { role: string }
    | undefined;
  if (!currentRow) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const newRole = currentRow.role === "admin" ? "member" : "admin";

  await client.execute({
    sql: `UPDATE users SET role = ? WHERE srn = ?`,
    args: [newRole, targetSrn],
  });

  await client.execute({
    sql: `INSERT INTO audit_logs (srn, ip, user_type, action, detail) VALUES (?, ?, ?, ?, ?)`,
    args: [
      admin.srn,
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown",
      admin.role,
      "role_change",
      `Changed ${targetSrn} to ${newRole}`,
    ],
  });

  return NextResponse.json({ success: true, srn: targetSrn, role: newRole });
}
