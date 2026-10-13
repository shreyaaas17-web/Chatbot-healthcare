import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Sign in to see appointments." }, { status: 401 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = user.role === "patient"
      ? await sql`SELECT a.*,d.name AS doctor_name,d.specialization,h.name AS hospital_name,h.city AS hospital_city FROM appointments a JOIN doctors d ON d.id=a.doctor_id JOIN hospitals h ON h.id=a.hospital_id WHERE a.patient_id=${user.id} ORDER BY a.visit_date,a.time_slot`
      : await sql`SELECT a.*,p.full_name AS patient_name,d.name AS doctor_name,d.specialization,h.name AS hospital_name,h.city AS hospital_city FROM appointments a JOIN doctors d ON d.id=a.doctor_id JOIN hospitals h ON h.id=a.hospital_id JOIN users p ON p.id=a.patient_id WHERE d.user_id=${user.id} ORDER BY a.visit_date,a.time_slot`;
    return NextResponse.json({ appointments: rows });
  } catch {
    return NextResponse.json({ error: "Appointments require a configured DATABASE_URL." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || user.role !== "patient") return NextResponse.json({ error: "Sign in as a patient to book." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const doctorId = Number(body?.doctorId);
  const visitDate = String(body?.visitDate ?? "");
  const timeSlot = String(body?.timeSlot ?? "");
  const symptoms = String(body?.symptoms ?? "").slice(0,2000);
  const notes = String(body?.notes ?? "").slice(0,2000);
  if (!Number.isInteger(doctorId) || !/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || !/^\d{2}:\d{2}$/.test(timeSlot)) return NextResponse.json({ error: "Choose a clinician, date, and available time." }, { status: 400 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows(sql`SELECT id,hospital_id,availability FROM doctors WHERE id=${doctorId}`);
    if (!rows.length) return NextResponse.json({ error: "Clinician not found." }, { status: 404 });
    const availability = typeof rows[0].availability === "string" ? JSON.parse(rows[0].availability) : rows[0].availability;
    if (!((availability as Record<string,string[]>)[visitDate] ?? []).includes(timeSlot)) return NextResponse.json({ error: "That time is not in this clinician's schedule." }, { status: 400 });
    const saved = await queryRows(sql`INSERT INTO appointments(patient_id,doctor_id,hospital_id,visit_date,time_slot,symptoms,notes) VALUES(${user.id},${doctorId},${Number(rows[0].hospital_id)},${visitDate}::date,${timeSlot},${symptoms},${notes}) RETURNING id`);
    return NextResponse.json({ appointmentId: Number(saved[0].id), status: "pending" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Booking failed.";
    if (message.toLowerCase().includes("unique")) return NextResponse.json({ error: "That time was just booked. Pick another slot." }, { status: 409 });
    return NextResponse.json({ error: "Booking is temporarily unavailable. Verify DATABASE_URL." }, { status: 503 });
  }
}
