import { NextResponse } from "next/server";
import { ensureDb, getSql, queryRows } from "@/lib/db";
import { sampleDoctors } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

type DoctorRow = {
  id: number; user_id: number | null; name: string; email: string; phone: string;
  specialization: string; qualification: string; experience: number; hospital_id: number;
  fee: number; languages: string[] | string; bio: string; photo_data: string | null;
  rating: number; availability: Record<string, string[]> | string; is_seed: boolean;
  hospital_name: string; hospital_city: string; hospital_lat: number; hospital_lng: number;
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const hospitalId = Number(params.get("hospitalId") ?? 0);
  const specialty = params.get("specialty") ?? "";
  const query = (params.get("q") ?? "").toLowerCase();
  try {
    await ensureDb();
    const sql = getSql();
    const rows = await queryRows<DoctorRow>(sql`SELECT d.id,d.user_id,d.name,d.email,d.phone,d.specialization,d.qualification,d.experience,d.hospital_id,d.fee,d.languages,d.bio,d.photo_data,d.rating,d.availability,d.is_seed,h.name AS hospital_name,h.city AS hospital_city,h.lat AS hospital_lat,h.lng AS hospital_lng FROM doctors d JOIN hospitals h ON h.id=d.hospital_id ORDER BY d.rating DESC,d.experience DESC,d.name`);
    const doctors = rows.map((doctor) => ({ ...doctor, id: Number(doctor.id), hospitalId: Number(doctor.hospital_id), hospitalName: doctor.hospital_name, hospitalCity: doctor.hospital_city, hospitalLat: doctor.hospital_lat, hospitalLng: doctor.hospital_lng, isSample: doctor.is_seed, languages: typeof doctor.languages === "string" ? JSON.parse(doctor.languages) : doctor.languages, availability: typeof doctor.availability === "string" ? JSON.parse(doctor.availability) : doctor.availability }));
    return NextResponse.json({ doctors: doctors.filter((doctor) => matches(doctor, hospitalId, specialty, query)) });
  } catch {
    return NextResponse.json({ doctors: sampleDoctors.filter((doctor) => matches(doctor, hospitalId, specialty, query)), sampleMode: true });
  }
}

function matches(doctor: { hospitalId?: number; hospital_id?: number; specialization: string; name: string; hospitalCity?: string; hospital_city?: string }, hospitalId: number, specialty: string, query: string) {
  const homeId = Number(doctor.hospitalId ?? doctor.hospital_id ?? 0);
  const city = doctor.hospitalCity ?? doctor.hospital_city ?? "";
  return (!hospitalId || homeId === hospitalId) && (!specialty || doctor.specialization === specialty) && (!query || `${doctor.name} ${doctor.specialization} ${city}`.toLowerCase().includes(query));
}
