import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { sampleDoctors, sampleHospitals } from "@/lib/demo-data";

let initPromise: Promise<void> | undefined;

declare global {
  var medintelSql: ReturnType<typeof neon> | undefined;
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured. Add a Neon PostgreSQL connection string in Vercel Project Settings.");
  globalThis.medintelSql ??= neon(url);
  return globalThis.medintelSql;
}

export async function queryRows<Row extends Record<string, unknown>>(query: unknown): Promise<Row[]> {
  const result = await (query as PromiseLike<unknown>);
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Row[];
  }
  return [];
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient','doctor','admin')), full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `DO $$ DECLARE role_rule TEXT; BEGIN
     SELECT pg_get_constraintdef(oid) INTO role_rule FROM pg_constraint
       WHERE conrelid='users'::regclass AND conname='users_role_check';
     IF role_rule IS NULL THEN
       ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient','doctor','admin'));
     ELSIF role_rule NOT LIKE '%admin%' THEN
       ALTER TABLE users DROP CONSTRAINT users_role_check;
       ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('patient','doctor','admin'));
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS patients (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dob DATE, gender TEXT DEFAULT '', blood_group TEXT DEFAULT 'Not known',
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb, conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    emergency_contact JSONB NOT NULL DEFAULT '{}'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS hospitals (
    id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, address TEXT NOT NULL,
    city TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL, lng DOUBLE PRECISION NOT NULL,
    phone TEXT NOT NULL, rating DOUBLE PRECISION NOT NULL DEFAULT 0,
    emergency BOOLEAN NOT NULL DEFAULT FALSE, specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_seed BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS doctors (
    id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    specialization TEXT NOT NULL, qualification TEXT NOT NULL, license_number TEXT NOT NULL DEFAULT '',
    experience INTEGER NOT NULL DEFAULT 0, hospital_id BIGINT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    fee INTEGER NOT NULL DEFAULT 0, languages JSONB NOT NULL DEFAULT '[]'::jsonb, bio TEXT NOT NULL DEFAULT '',
    photo_data TEXT, rating DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    availability JSONB NOT NULL DEFAULT '{}'::jsonb, is_seed BOOLEAN NOT NULL DEFAULT FALSE
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY, patient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    hospital_id BIGINT NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL, time_slot TEXT NOT NULL, symptoms TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_seed_doctor_name_hospital ON doctors(name,hospital_id) WHERE is_seed=TRUE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_appointments_doctor_time ON appointments(doctor_id,visit_date,time_slot) WHERE status NOT IN ('declined','cancelled')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_appointments_patient_time ON appointments(patient_id,visit_date,time_slot) WHERE status NOT IN ('declined','cancelled')`,
];

function slotSchedule(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    const dateKey = day.toISOString().slice(0, 10);
    const start = day.getDay() === 0 || day.getDay() === 6 ? 10 : 9;
    const end = day.getDay() === 0 || day.getDay() === 6 ? 13 : 17;
    result[dateKey] = [];
    for (let hour = start; hour < end; hour += 1) {
      result[dateKey].push(`${String(hour).padStart(2, "0")}:00`, `${String(hour).padStart(2, "0")}:30`);
    }
  }
  return result;
}

async function initialize(): Promise<void> {
  const sql = getSql();
  for (const statement of schemaStatements) await sql.query(statement);
  const countRows = await queryRows<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM hospitals WHERE is_seed = TRUE`);
  if (Number(countRows[0]?.count ?? 0) > 0) {
    await refreshSampleAvailability(sql);
    await ensureDemoAccounts();
    await ensureAdminAccount();
    return;
  }

  for (const hospital of sampleHospitals) {
    await sql.query(
      `INSERT INTO hospitals(name,address,city,lat,lng,phone,rating,emergency,specialties,is_seed)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,TRUE) ON CONFLICT(name) DO NOTHING`,
      [hospital.name,hospital.address,hospital.city,hospital.lat,hospital.lng,hospital.phone,hospital.rating,hospital.emergency,JSON.stringify(hospital.specialties)],
    );
  }
  const hospitalRows = await queryRows<{ id: number; name: string }>(sql`SELECT id,name FROM hospitals WHERE is_seed=TRUE ORDER BY id`);
  const hospitalIds = new Map(hospitalRows.map((row) => [String(row.name), Number(row.id)]));
  const availability = JSON.stringify(slotSchedule());
  for (const doctor of sampleDoctors) {
    const hospitalId = hospitalIds.get(doctor.hospitalName ?? "");
    if (!hospitalId) continue;
    await sql.query(
      `INSERT INTO doctors(name,specialization,qualification,experience,hospital_id,fee,languages,bio,rating,availability,is_seed)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10::jsonb,TRUE)
      ON CONFLICT(name,hospital_id) DO NOTHING`,
      [doctor.name,doctor.specialization,doctor.qualification,doctor.experience,hospitalId,doctor.fee,JSON.stringify(doctor.languages),doctor.bio,doctor.rating,availability],
    );
  }
  await ensureDemoAccounts();
  await ensureAdminAccount();
}

async function refreshSampleAvailability(sql: ReturnType<typeof neon>): Promise<void> {
  await sql`UPDATE doctors SET availability=${JSON.stringify(slotSchedule())}::jsonb WHERE is_seed=TRUE`;
}

async function ensureDemoAccounts(): Promise<void> {
  const sql = getSql();
  const patientHash = await bcrypt.hash("PatientDemo123!", 12);
  const doctorHash = await bcrypt.hash("DoctorDemo123!", 12);
  await sql.query(
    `INSERT INTO users(email,password_hash,role,full_name)
     VALUES('patient@medintel.demo',$1,'patient','Demo Patient') ON CONFLICT(email) DO NOTHING`,
    [patientHash],
  );
  await sql.query(
    `INSERT INTO users(email,password_hash,role,full_name)
     VALUES('doctor@medintel.demo',$1,'doctor','Dr. Demo Physician') ON CONFLICT(email) DO NOTHING`,
    [doctorHash],
  );
  await sql`INSERT INTO patients(user_id) SELECT id FROM users WHERE email='patient@medintel.demo' ON CONFLICT DO NOTHING`;
  const rows = await queryRows<{ id: number }>(sql`SELECT id FROM users WHERE email='doctor@medintel.demo'`);
  const doctorUserId = rows[0]?.id;
  if (doctorUserId) {
    await sql.query(
      `UPDATE doctors SET user_id=$1 WHERE id=(SELECT id FROM doctors WHERE is_seed=TRUE ORDER BY id LIMIT 1) AND user_id IS NULL`,
      [doctorUserId],
    );
  }
}

async function ensureAdminAccount(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) return;
  const sql = getSql();
  const passwordHash = await bcrypt.hash(password, 12);
  await sql.query(
    `INSERT INTO users(email,password_hash,role,full_name)
     VALUES($1,$2,'admin','Medintel Administrator') ON CONFLICT(email) DO NOTHING`,
    [email,passwordHash],
  );
}

export async function ensureDb(): Promise<void> {
  initPromise ??= initialize().catch((error: unknown) => {
    initPromise = undefined;
    throw error;
  });
  await initPromise;
}
