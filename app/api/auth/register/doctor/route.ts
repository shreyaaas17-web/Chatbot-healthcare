import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";
import { doctorRegistrationSchema } from "@/lib/validation";

export const runtime = "nodejs";

function doctorSchedule(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const start = date.getDay() === 0 || date.getDay() === 6 ? 10 : 9;
    const end = date.getDay() === 0 || date.getDay() === 6 ? 13 : 17;
    const key = date.toISOString().slice(0, 10);
    result[key] = [];
    for (let hour = start; hour < end; hour += 1) result[key].push(`${String(hour).padStart(2,"0")}:00`, `${String(hour).padStart(2,"0")}:30`);
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = doctorRegistrationSchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Check your details, phone number, and password strength." }, { status: 400 });
    const input = parsed.data;
    const photo = typeof payload.photoData === "string" ? payload.photoData : null;
    if (photo && (!photo.startsWith("data:image/") || photo.length > 900_000)) {
      return NextResponse.json({ error: "Use a PNG or JPG profile image under 650 KB." }, { status: 400 });
    }
    await ensureDb();
    const sql = getSql();
    const hospitalRows = await queryRows(sql`SELECT id FROM hospitals WHERE id=${input.hospitalId}`);
    if (!hospitalRows.length) return NextResponse.json({ error: "Select a listed sample facility." }, { status: 400 });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const transaction = await sql.transaction([
      sql`INSERT INTO users(email,password_hash,role,full_name,phone) VALUES(${input.email.toLowerCase()},${passwordHash},'doctor',${input.fullName},${input.phone}) RETURNING id,email,role,full_name,phone`,
      sql`INSERT INTO doctors(user_id,name,email,phone,specialization,qualification,license_number,experience,hospital_id,fee,languages,bio,photo_data,rating,availability,is_seed)
          SELECT id,${input.fullName},${input.email.toLowerCase()},${input.phone},${input.specialization},${input.qualification},${input.licenseNumber},${input.experience},${input.hospitalId},${input.fee},${JSON.stringify(input.languages)}::jsonb,${input.bio},${photo},0,${JSON.stringify(doctorSchedule())}::jsonb,FALSE FROM users WHERE email=${input.email.toLowerCase()}`,
    ]);
    const created = transaction[0] as unknown as Array<{ id: number; email: string; role: "doctor"; full_name: string; phone: string }>;
    const user = created[0];
    await createSession({ id: Number(user.id), email: user.email, fullName: user.full_name, role: "doctor" });
    return NextResponse.json({ user: { id: Number(user.id), email: user.email, role: "doctor", fullName: user.full_name, phone: user.phone } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed.";
    const status = message.includes("unique") || message.includes("duplicate") ? 409 : 500;
    return NextResponse.json({ error: status === 409 ? "An account with this email already exists." : "Registration is temporarily unavailable. Check DATABASE_URL and try again." }, { status });
  }
}
