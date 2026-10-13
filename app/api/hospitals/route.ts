import { NextResponse } from "next/server";
import { ensureDb, getSql, queryRows } from "@/lib/db";
import { sampleHospitals } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type HospitalRow = {
  id: number; name: string; address: string; city: string; lat: number; lng: number;
  phone: string; rating: number; emergency: boolean; specialties: string[] | string; is_seed: boolean;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").toLowerCase();
  const city = params.get("city") ?? "";
  const specialty = params.get("specialty") ?? "";
  const emergency = params.get("emergency") === "true";
  const rating = Number(params.get("rating") ?? 0);
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows<HospitalRow>(sql`SELECT id,name,address,city,lat,lng,phone,rating,emergency,specialties,is_seed FROM hospitals ORDER BY rating DESC,name`);
    const hospitals = rows.map((row) => ({ ...row, id: Number(row.id), isSample: Boolean(row.is_seed), specialties: typeof row.specialties === "string" ? JSON.parse(row.specialties) : row.specialties }));
    return NextResponse.json({ hospitals: hospitals.filter((item) => matches(item, query, city, specialty, emergency, rating)) });
  } catch {
    const rows = sampleHospitals.filter((item) => matches(item, query, city, specialty, emergency, rating));
    return NextResponse.json({ hospitals: rows, sampleMode: true });
  }
}

function matches(item: { name: string; city: string; address: string; specialties: string[]; emergency: boolean; rating: number }, query: string, city: string, specialty: string, emergency: boolean, rating: number) {
  const words = `${item.name} ${item.city} ${item.address} ${item.specialties.join(" ")}`.toLowerCase();
  return (!query || words.includes(query)) && (!city || item.city === city) && (!specialty || item.specialties.includes(specialty)) && (!emergency || item.emergency) && item.rating >= rating;
}
