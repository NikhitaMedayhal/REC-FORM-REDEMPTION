import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface L8TokenPayload extends JWTPayload {
  srn: string;
  name: string;
  role: "admin" | "member";
  branch: string;
  semester: string;
}

export const COOKIE_NAME = "l8_session";
const EXPIRY = "7d";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: Omit<L8TokenPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecretKey());
}

export async function verifyToken(
  token: string | undefined | null
): Promise<L8TokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as L8TokenPayload;
  } catch {
    return null;
  }
}
