import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken, type L8TokenPayload } from "./jwt";

/**
 * Reads the session cookie, verifies the JWT, and confirms the caller
 * has the 'admin' role. Returns the token payload on success, or null
 * if unauthenticated / not an admin.
 */
export async function requireAdmin(): Promise<L8TokenPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = await verifyToken(token);

  if (!payload || payload.role !== "admin") {
    return null;
  }

  return payload;
}

/**
 * Reads the session cookie and verifies the JWT for any logged-in user
 * (member or admin). Returns the token payload, or null if unauthenticated.
 */
export async function requireUser(): Promise<L8TokenPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return verifyToken(token);
}
