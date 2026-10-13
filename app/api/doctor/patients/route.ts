import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "doctor") return NextResponse.json({ error: "Clinician sign-in required." }, { status: 401 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows(sql`SELECT DISTINCT u.id,u.full_name,u.email,p.dob,p.blood_group,p.allergies,p.conditions FROM appointments a JOIN doctors d ON d.id=a.doctor_id JOIN users u ON u.id=a.patient_id LEFT JOIN patients p ON p.user_id=u.id WHERE d.user_id=${user.id} AND a.status NOT IN ('cancelled','declined') ORDER BY u.full_name`);
    return NextResponse.json({ patients: rows });
  } catch {
    return NextResponse.json({ error: "Patient list is unavailable." }, { status: 503 });
  }
}
