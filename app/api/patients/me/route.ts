import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "patient") return NextResponse.json({ error: "Patient sign-in required." }, { status: 401 });
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows(sql`SELECT p.dob,p.gender,p.blood_group,p.allergies,p.conditions,p.emergency_contact,u.full_name,u.email,u.phone FROM patients p JOIN users u ON u.id=p.user_id WHERE p.user_id=${user.id}`);
    return rows.length ? NextResponse.json({ profile: rows[0] }) : NextResponse.json({ error: "Patient profile was not found." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Patient profile storage is unavailable." }, { status: 503 });
  }
}
