import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const client = await db();
  const result = await client.execute({
    sql: `SELECT srn, prn, name, program, branch, section, semester, email, phone, campus
          FROM users WHERE srn = ?`,
    args: [payload.srn],
  });
  const row = result.rows[0] as unknown as
    | {
        srn: string;
        prn: string | null;
        name: string;
        program: string | null;
        branch: string;
        section: string | null;
        semester: string;
        email: string | null;
        phone: string | null;
        campus: string | null;
      }
    | undefined;

  return NextResponse.json({
    user: {
      srn: payload.srn,
      name: payload.name,
      role: payload.role,
      branch: payload.branch,
      semester: payload.semester,
    },
    // Full PESU profile, reconstructed from the users table so the
    // recruitment form can still auto-fill after a page reload (the JWT
    // itself only carries a slim subset of fields).
    profile: row
      ? {
          name: row.name ?? "",
          srn: row.srn,
          prn: row.prn ?? "",
          program: row.program ?? "",
          branch: row.branch ?? "",
          semester: row.semester ?? "",
          section: row.section ?? "",
          email: row.email ?? "",
          phone: row.phone ?? "",
          campus: row.campus ?? "",
        }
      : null,
  });
}
