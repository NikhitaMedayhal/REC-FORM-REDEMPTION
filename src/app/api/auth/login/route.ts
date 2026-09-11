import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken, COOKIE_NAME } from "@/lib/jwt";
import { checkAuthRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface PesuProfile {
  name?: string;
  prn?: string;
  srn?: string;
  program?: string;
  branch?: string;
  semester?: string;
  section?: string;
  email?: string;
  phone?: string;
  campusCode?: string;
  campus?: string;
}

interface PesuAuthResponse {
  status: boolean;
  message?: string;
  profile?: PesuProfile;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  let body: { userName?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userName, password } = body;
  if (!userName || !password) {
    return NextResponse.json(
      { error: "userName and password are required" },
      { status: 400 }
    );
  }

  if (!checkAuthRateLimit(ip, userName)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let pesuData: PesuAuthResponse;
  try {
    const pesuRes = await fetch("https://pesu-auth.onrender.com/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userName,
        password,
        profile: true,
      }),
    });
    pesuData = await pesuRes.json();
  } catch (err) {
    console.error("[login] PESU Auth API request failed:", err);
    return NextResponse.json(
      { error: "Authentication service is unavailable" },
      { status: 502 }
    );
  }

  if (pesuData.status !== true || !pesuData.profile) {
    return NextResponse.json(
      { error: pesuData.message ?? "Invalid credentials" },
      { status: 401 }
    );
  }

  const profile = pesuData.profile;
  const srn = profile.srn;
  if (!srn) {
    return NextResponse.json(
      { error: "PESU Auth response is missing an SRN" },
      { status: 502 }
    );
  }

  const client = await db();

  await client.execute({
    sql: `
      INSERT INTO users (srn, prn, name, program, branch, section, semester, email, phone, campus, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(srn) DO UPDATE SET
        prn = excluded.prn, name = excluded.name, program = excluded.program,
        branch = excluded.branch, section = excluded.section,
        semester = excluded.semester, email = excluded.email,
        phone = excluded.phone, campus = excluded.campus,
        last_login = datetime('now')
    `,
    args: [
      srn,
      profile.prn ?? null,
      profile.name ?? "",
      profile.program ?? null,
      profile.branch ?? null,
      profile.section ?? null,
      profile.semester ?? null,
      profile.email ?? null,
      profile.phone ?? null,
      profile.campus ?? profile.campusCode ?? null,
    ],
  });

  const adminSrns = (process.env.ADMIN_SRNS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminSrns.includes(srn)) {
    await client.execute({
      sql: `UPDATE users SET role = 'admin' WHERE srn = ?`,
      args: [srn],
    });
  }

  const roleResult = await client.execute({
    sql: `SELECT role, name, branch, semester FROM users WHERE srn = ?`,
    args: [srn],
  });
  const row = roleResult.rows[0] as unknown as
    | { role: string; name: string; branch: string; semester: string }
    | undefined;

  const role = (row?.role === "admin" ? "admin" : "member") as
    | "admin"
    | "member";
  const name = row?.name ?? profile.name ?? "";
  const branch = row?.branch ?? profile.branch ?? "";
  const semester = row?.semester ?? profile.semester ?? "";

  await client.execute({
    sql: `INSERT INTO audit_logs (srn, ip, user_type, action, detail) VALUES (?, ?, ?, ?, ?)`,
    args: [srn, ip, role, "login", `Logged in as ${role}`],
  });

  const token = await signToken({ srn, name, role, branch, semester });

  const response = NextResponse.json({
    success: true,
    user: { srn, name, role, branch, semester },
    profile: {
      name: profile.name ?? "",
      srn,
      prn: profile.prn ?? "",
      program: profile.program ?? "",
      branch: profile.branch ?? "",
      semester: profile.semester ?? "",
      section: profile.section ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      campus: profile.campus ?? profile.campusCode ?? "",
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
