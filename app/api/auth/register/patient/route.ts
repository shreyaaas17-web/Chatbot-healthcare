import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { patientRegistrationSchema } from "@/lib/validation";
import { createSession } from "@/lib/auth";
import { ensureDb, getSql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = patientRegistrationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Check the form fields and password strength." }, { status: 400 });
    const input = parsed.data;
    if (input.emergencyContactPhone && !/^\+?[0-9][0-9 ()-]{7,18}$/.test(input.emergencyContactPhone)) {
      return NextResponse.json({ error: "Enter a valid emergency contact phone." }, { status: 400 });
    }
    await ensureDb();
    const sql = getSql();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const transaction = await sql.transaction([
      sql`INSERT INTO users(email,password_hash,role,full_name,phone) VALUES(${input.email.toLowerCase()},${passwordHash},'patient',${input.fullName},${input.phone}) RETURNING id,email,role,full_name,phone`,
      sql`INSERT INTO patients(user_id,dob,gender,blood_group,allergies,conditions,emergency_contact) SELECT id,${input.dob}::date,${input.gender},${input.bloodGroup},${JSON.stringify(input.allergies)}::jsonb,${JSON.stringify(input.conditions)}::jsonb,${JSON.stringify({ name: input.emergencyContactName, phone: input.emergencyContactPhone })}::jsonb FROM users WHERE email=${input.email.toLowerCase()}`,
    ]);
    const created = transaction[0] as unknown as Array<{ id: number; email: string; role: "patient"; full_name: string; phone: string }>;
    const user = created[0];
    await createSession({ id: Number(user.id), email: user.email, fullName: user.full_name, role: "patient" });
    return NextResponse.json({ user: { id: Number(user.id), email: user.email, role: "patient", fullName: user.full_name, phone: user.phone } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    const status = message.includes("unique") || message.includes("duplicate") ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "An account with this email already exists." : "Registration is temporarily unavailable. Check DATABASE_URL and try again." }, { status });
  }
}
