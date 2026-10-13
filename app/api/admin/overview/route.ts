import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ensureDb, getSql, queryRows } from "@/lib/db";

export const dynamic = "force-dynamic";

// Read-only platform overview. Deliberately excludes symptoms, notes, and health profile data.
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrator sign-in required." }, { status: 401 });
  try {
    await ensureDb();
    const sql = getSql();
    const [roles, statuses, totals, recentAppointments, recentUsers, topSpecialties] = await Promise.all([
      queryRows<{ role: string; count: number }>(sql`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
      queryRows<{ status: string; count: number }>(sql`SELECT status, COUNT(*)::int AS count FROM appointments GROUP BY status`),
      queryRows<{ hospitals: number; doctors: number; appointments: number; upcoming: number }>(sql`SELECT (SELECT COUNT(*)::int FROM hospitals) AS hospitals, (SELECT COUNT(*)::int FROM doctors) AS doctors, (SELECT COUNT(*)::int FROM appointments) AS appointments, (SELECT COUNT(*)::int FROM appointments WHERE visit_date >= CURRENT_DATE AND status IN ('pending','accepted')) AS upcoming`),
      queryRows(sql`SELECT a.id, a.visit_date, a.time_slot, a.status, d.name AS doctor_name, h.name AS hospital_name FROM appointments a JOIN doctors d ON d.id=a.doctor_id JOIN hospitals h ON h.id=a.hospital_id ORDER BY a.created_at DESC LIMIT 10`),
      queryRows(sql`SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10`),
      queryRows<{ specialization: string; count: number }>(sql`SELECT d.specialization, COUNT(a.id)::int AS count FROM doctors d LEFT JOIN appointments a ON a.doctor_id=d.id GROUP BY d.specialization ORDER BY count DESC, d.specialization LIMIT 6`),
    ]);
    return NextResponse.json({ roles, statuses, totals: totals[0] ?? {}, recentAppointments, recentUsers, topSpecialties });
  } catch {
    return NextResponse.json({ error: "Admin overview is unavailable. Check DATABASE_URL and JWT_SECRET." }, { status: 503 });
  }
}
