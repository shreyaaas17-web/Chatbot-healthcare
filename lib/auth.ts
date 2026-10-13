import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSql, queryRows } from "@/lib/db";

const COOKIE_NAME = "medintel_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secretKey(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}

export type SessionUser = { id: number; email: string; fullName: string; role: "patient" | "doctor" | "admin" };

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ email: user.email, fullName: user.fullName, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    const role = payload.role;
    if (!Number.isSafeInteger(id) || (role !== "patient" && role !== "doctor" && role !== "admin")) return null;
    return { id, email: String(payload.email ?? ""), fullName: String(payload.fullName ?? ""), role };
  } catch {
    return null;
  }
}

export async function requireSession(role?: SessionUser["role"]): Promise<SessionUser> {
  const user = await getSession();
  if (!user || (role && user.role !== role)) throw new Error("Unauthorized");
  return user;
}

export async function currentUserFromDb() {
  const user = await getSession();
  if (!user) return null;
  const sql = getSql();
  const rows = await queryRows(sql`SELECT id,email,full_name,role,phone FROM users WHERE id=${user.id}`);
  return rows[0] ?? null;
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
