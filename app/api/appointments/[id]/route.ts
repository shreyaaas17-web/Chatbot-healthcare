import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "doctor") return NextResponse.json({ error: "Clinician sign-in required." }, { status: 401 });
  const { id } = await params;
  const status = (await request.json().catch(() => ({}))).status;
  if (status !== "accepted" && status !== "declined") return NextResponse.json({ error: "Choose accept or decline." }, { status: 400 });
  try {
    await ensureDb();
    const sql = getSql();
    const result = await queryRows(sql`UPDATE appointments SET status=${status} WHERE id=${Number(id)} AND status='pending' AND doctor_id IN (SELECT id FROM doctors WHERE user_id=${user.id}) RETURNING id`);
    return result.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Appointment not found or already handled." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not update this appointment." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || user.role !== "patient") return NextResponse.json({ error: "Patient sign-in required." }, { status: 401 });
  const { id } = await params;
  try {
    await ensureDb();
    const sql = getSql();
    const result = await queryRows(sql`UPDATE appointments SET status='cancelled' WHERE id=${Number(id)} AND patient_id=${user.id} AND status IN ('pending','accepted') RETURNING id`);
    return result.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Appointment not found or cannot be cancelled." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not cancel this appointment." }, { status: 503 });
  }
}
