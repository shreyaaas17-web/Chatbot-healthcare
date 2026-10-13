import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email, password, and account type." }, { status: 400 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows<{ id: number; email: string; password_hash: string; role: "patient" | "doctor"; full_name: string; phone: string }>(sql`SELECT id,email,password_hash,role,full_name,phone FROM users WHERE email=${parsed.data.email.toLowerCase()} AND role=${parsed.data.role}`);
    const user = rows[0];
    if (!user || !await bcrypt.compare(parsed.data.password, String(user.password_hash))) {
      return NextResponse.json({ error: "Email, password, or account type is incorrect." }, { status: 401 });
    }
    await createSession({ id: Number(user.id), email: String(user.email), fullName: String(user.full_name), role: user.role });
    return NextResponse.json({ user: { id: Number(user.id), email: user.email, role: user.role, fullName: user.full_name, phone: user.phone } });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Check DATABASE_URL and JWT_SECRET." }, { status: 503 });
  }
}
