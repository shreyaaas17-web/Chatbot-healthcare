import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";
import { sampleDoctors } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "patient") return NextResponse.json({ error: "Sign in as a patient to view bookable slots." }, { status: 401 });
  const { id } = await params;
  const day = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows(sql`SELECT availability FROM doctors WHERE id=${Number(id)}`);
    if (!rows.length) return NextResponse.json({ error: "Clinician not found." }, { status: 404 });
    const availability = typeof rows[0].availability === "string" ? JSON.parse(rows[0].availability) : rows[0].availability;
    const booked = await queryRows(sql`SELECT time_slot FROM appointments WHERE doctor_id=${Number(id)} AND visit_date=${day}::date AND status NOT IN ('declined','cancelled')`);
    const taken = new Set(booked.map((row) => String(row.time_slot)));
    return NextResponse.json({ slots: ((availability as Record<string,string[]>)[day] ?? []).filter((slot) => !taken.has(slot)) });
  } catch {
    const doctor = sampleDoctors.find((item) => item.id === Number(id));
    return NextResponse.json({ error: doctor ? "Booking requires DATABASE_URL. Sample clinicians are preview-only." : "Clinician not found." }, { status: doctor ? 503 : 404 });
  }
}
