import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, time, timedelta
from pathlib import Path
from threading import RLock
from typing import Iterator

import bcrypt
from dotenv import load_dotenv

from data.sample_data import (
    DOCTOR_FIRST_NAMES,
    DOCTOR_LAST_NAMES,
    LANGUAGE_OPTIONS,
    QUALIFICATIONS,
    SAMPLE_HOSPITALS,
)

_LOCK = RLock()
load_dotenv()


def database_path() -> Path:
    configured = os.getenv("DATABASE_PATH")
    if not configured:
        try:
            import streamlit as st
            configured = st.secrets.get("DATABASE_PATH")
        except Exception:
            configured = None
    path = Path(configured or Path(__file__).resolve().parents[1] / "clinic.db")
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(database_path(), timeout=20)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def _passwords(password: str) -> tuple[str, str, str]:
    salt = secrets.token_hex(16)
    pbkdf_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
    bcrypt_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return pbkdf_hash, salt, bcrypt_hash


def _availability(start: date | None = None) -> dict[str, list[str]]:
    start = start or date.today()
    schedule = {}
    for offset in range(7):
        day = start + timedelta(days=offset)
        if day.weekday() < 5:
            hours = range(9, 17)
        else:
            hours = range(10, 13)
        schedule[day.isoformat()] = [f"{hour:02d}:{minute:02d}" for hour in hours for minute in (0, 30)]
    return schedule


def init_db() -> None:
    with _LOCK, connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                pw_hash TEXT NOT NULL, salt TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('doctor','patient')),
                full_name TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS profiles(
                user_id INTEGER PRIMARY KEY, age INTEGER, sex TEXT,
                allergies TEXT DEFAULT '', conditions TEXT DEFAULT '', medicines TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS patients(
                id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE,
                dob TEXT, gender TEXT, blood_group TEXT,
                allergies TEXT DEFAULT '[]', conditions TEXT DEFAULT '[]',
                emergency_contact TEXT DEFAULT '',
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS hospitals(
                id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, address TEXT NOT NULL,
                city TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
                phone TEXT NOT NULL, rating REAL NOT NULL, emergency INTEGER NOT NULL,
                specialties TEXT NOT NULL, is_seed INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS doctors(
                id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE,
                name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT DEFAULT '',
                specialization TEXT NOT NULL, qualification TEXT NOT NULL,
                license_number TEXT DEFAULT '', experience INTEGER NOT NULL DEFAULT 0,
                hospital_id INTEGER NOT NULL, fee REAL NOT NULL DEFAULT 0,
                languages TEXT NOT NULL DEFAULT '[]', bio TEXT DEFAULT '', photo BLOB,
                rating REAL NOT NULL DEFAULT 4.5, availability TEXT NOT NULL DEFAULT '{}',
                is_seed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS appointments(
                id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, doctor_id INTEGER NOT NULL,
                hospital_id INTEGER NOT NULL, visit_date TEXT NOT NULL, time_slot TEXT NOT NULL,
                symptoms TEXT DEFAULT '', notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','accepted','declined','cancelled','completed')),
                created_at TEXT NOT NULL,
                FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
            );
            """
        )
        appointment_schema = db.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='appointments'"
        ).fetchone()["sql"]
        compact_schema = "".join(appointment_schema.upper().split())
        if "UNIQUE(DOCTOR_ID,VISIT_DATE,TIME_SLOT)" in compact_schema:
            db.execute(
                """CREATE TABLE appointments_new(
                       id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, doctor_id INTEGER NOT NULL,
                       hospital_id INTEGER NOT NULL, visit_date TEXT NOT NULL, time_slot TEXT NOT NULL,
                       symptoms TEXT DEFAULT '', notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
                           CHECK(status IN ('pending','accepted','declined','cancelled','completed')),
                       created_at TEXT NOT NULL,
                       FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
                       FOREIGN KEY(doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
                       FOREIGN KEY(hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE)"""
            )
            db.execute(
                """INSERT INTO appointments_new
                   SELECT id,patient_id,doctor_id,hospital_id,visit_date,time_slot,symptoms,notes,status,created_at
                   FROM appointments"""
            )
            db.execute("DROP TABLE appointments")
            db.execute("ALTER TABLE appointments_new RENAME TO appointments")
        db.execute(
            """CREATE UNIQUE INDEX IF NOT EXISTS ux_appointments_doctor_time
               ON appointments(doctor_id,visit_date,time_slot)
               WHERE status NOT IN ('declined','cancelled')"""
        )
        db.execute(
            """CREATE UNIQUE INDEX IF NOT EXISTS ux_appointments_patient_time
               ON appointments(patient_id,visit_date,time_slot)
               WHERE status NOT IN ('declined','cancelled')"""
        )
        columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        for name, declaration in (
            ("email", "TEXT"),
            ("phone", "TEXT DEFAULT ''"),
            ("password_hash", "TEXT"),
        ):
            if name not in columns:
                db.execute(f"ALTER TABLE users ADD COLUMN {name} {declaration}")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email ON users(email) WHERE email IS NOT NULL")
        db.execute(
            "INSERT OR IGNORE INTO profiles(user_id) SELECT id FROM users WHERE role='patient'"
        )
        db.execute(
            "INSERT OR IGNORE INTO patients(user_id) SELECT id FROM users WHERE role='patient'"
        )
        _seed_hospitals(db)
        _seed_doctors(db)
        _seed_demo_accounts(db)


def _seed_hospitals(db: sqlite3.Connection) -> None:
    for hospital in SAMPLE_HOSPITALS:
        db.execute(
            """INSERT OR IGNORE INTO hospitals
               (name,address,city,lat,lng,phone,rating,emergency,specialties,is_seed)
               VALUES(?,?,?,?,?,?,?,?,?,1)""",
            (
                hospital["name"], hospital["address"], hospital["city"],
                hospital["lat"], hospital["lng"], hospital["phone"],
                hospital["rating"], int(hospital["emergency"]),
                json.dumps(hospital["specialties"]),
            ),
        )


def _seed_doctors(db: sqlite3.Connection) -> None:
    hospitals = db.execute("SELECT id, specialties FROM hospitals WHERE is_seed=1 ORDER BY id").fetchall()
    today = date.today()
    for hospital_index, hospital in enumerate(hospitals):
        specialties = json.loads(hospital["specialties"])
        for doctor_index, specialty in enumerate(specialties):
            sequence = hospital_index * 4 + doctor_index
            name = f"Dr. {DOCTOR_FIRST_NAMES[sequence % len(DOCTOR_FIRST_NAMES)]} {DOCTOR_LAST_NAMES[(sequence + hospital_index) % len(DOCTOR_LAST_NAMES)]}"
            languages = [LANGUAGE_OPTIONS[(hospital_index + doctor_index) % len(LANGUAGE_OPTIONS)], "English"]
            db.execute(
                """INSERT OR IGNORE INTO doctors
                   (name,specialization,qualification,experience,hospital_id,fee,languages,
                    bio,rating,availability,is_seed)
                   VALUES(?,?,?,?,?,?,?,?,?,?,1)""",
                (
                    name, specialty, QUALIFICATIONS[sequence % len(QUALIFICATIONS)],
                    4 + (sequence * 3) % 16, hospital["id"],
                    float(400 + (sequence % 8) * 100), json.dumps(sorted(set(languages))),
                    f"Sample {specialty.lower()} clinician profile for demonstration purposes.",
                    round(4.1 + (sequence % 9) * 0.1, 1),
                    json.dumps(_availability(today)),
                ),
            )
    db.execute("CREATE UNIQUE INDEX IF NOT EXISTS ux_seed_doctor_name_hospital ON doctors(name,hospital_id)")
    db.execute("UPDATE doctors SET availability=? WHERE is_seed=1", (json.dumps(_availability(today)),))


def _ensure_demo_user(db: sqlite3.Connection, email: str, password: str, role: str, name: str) -> int:
    existing = db.execute("SELECT id FROM users WHERE username=?", (email,)).fetchone()
    if existing:
        return int(existing["id"])
    pbkdf_hash, salt, bcrypt_hash = _passwords(password)
    cursor = db.execute(
        """INSERT INTO users(username,pw_hash,salt,role,full_name,email,phone,password_hash)
           VALUES(?,?,?,?,?,?,?,?)""",
        (email, pbkdf_hash, salt, role, name, email, "", bcrypt_hash),
    )
    return cursor.lastrowid


def _seed_demo_accounts(db: sqlite3.Connection) -> None:
    patient_id = _ensure_demo_user(db, "patient@medintel.demo", "PatientDemo123!", "patient", "Demo Patient")
    db.execute("INSERT OR IGNORE INTO patients(user_id) VALUES(?)", (patient_id,))
    db.execute("INSERT OR IGNORE INTO profiles(user_id) VALUES(?)", (patient_id,))
    doctor_user_id = _ensure_demo_user(db, "doctor@medintel.demo", "DoctorDemo123!", "doctor", "Dr. Demo Physician")
    db.execute("UPDATE doctors SET user_id=? WHERE id=(SELECT MIN(id) FROM doctors WHERE is_seed=1)", (doctor_user_id,))


def hospitals() -> list[dict]:
    with connect() as db:
        rows = db.execute("SELECT * FROM hospitals ORDER BY city,name").fetchall()
    result = [dict(row) for row in rows]
    for item in result:
        item["specialties"] = json.loads(item["specialties"])
        item["emergency"] = bool(item["emergency"])
    return result


def doctors(hospital_id: int | None = None, specialization: str | None = None) -> list[dict]:
    query = """SELECT d.*, h.name AS hospital_name, h.city AS hospital_city,
                      h.lat AS hospital_lat, h.lng AS hospital_lng
               FROM doctors d JOIN hospitals h ON h.id=d.hospital_id WHERE 1=1"""
    params: list[object] = []
    if hospital_id is not None:
        query += " AND d.hospital_id=?"
        params.append(hospital_id)
    if specialization and specialization != "All specialties":
        query += " AND d.specialization=?"
        params.append(specialization)
    query += " ORDER BY d.rating DESC,d.experience DESC,d.name"
    with connect() as db:
        rows = db.execute(query, params).fetchall()
    result = [dict(row) for row in rows]
    for item in result:
        item["languages"] = json.loads(item["languages"] or "[]")
        item["availability"] = json.loads(item["availability"] or "{}")
    return result


def patient_profile(user_id: int) -> dict | None:
    with connect() as db:
        row = db.execute(
            """SELECT p.*,u.full_name,u.email,u.phone FROM patients p
               JOIN users u ON u.id=p.user_id WHERE p.user_id=?""", (user_id,)
        ).fetchone()
    if not row:
        return None
    item = dict(row)
    for field in ("allergies", "conditions"):
        item[field] = json.loads(item[field] or "[]")
    return item


def appointments(user: dict, period: str = "all") -> list[dict]:
    query = """SELECT a.*,p.full_name AS patient_name,d.name AS doctor_name,
                      h.name AS hospital_name,h.city AS hospital_city
               FROM appointments a JOIN users p ON p.id=a.patient_id
               JOIN doctors d ON d.id=a.doctor_id JOIN hospitals h ON h.id=a.hospital_id"""
    conditions: list[str] = []
    params: list[object] = []
    if user["role"] == "patient":
        conditions.append("a.patient_id=?")
        params.append(user["id"])
    else:
        conditions.append("d.user_id=?")
        params.append(user["id"])
    if period == "upcoming":
        conditions.append("a.visit_date>=?")
        params.append(date.today().isoformat())
    elif period == "past":
        conditions.append("a.visit_date<?")
        params.append(date.today().isoformat())
    query += " WHERE " + " AND ".join(conditions) + " ORDER BY a.visit_date,a.time_slot"
    with connect() as db:
        return [dict(row) for row in db.execute(query, params)]


def available_slots(doctor_id: int, day: str) -> list[str]:
    with connect() as db:
        doctor = db.execute("SELECT availability FROM doctors WHERE id=?", (doctor_id,)).fetchone()
        if not doctor:
            return []
        slots = json.loads(doctor["availability"] or "{}").get(day, [])
        booked = {
            row["time_slot"]
            for row in db.execute(
                "SELECT time_slot FROM appointments WHERE doctor_id=? AND visit_date=? "
                "AND status NOT IN ('declined','cancelled')", (doctor_id, day)
            )
        }
    return [slot for slot in slots if slot not in booked]


def create_appointment(patient_id: int, doctor_id: int, visit_date: str, time_slot: str, symptoms: str, notes: str) -> int:
    with _LOCK, connect() as db:
        doctor = db.execute("SELECT hospital_id,availability FROM doctors WHERE id=?", (doctor_id,)).fetchone()
        if not doctor:
            raise ValueError("Choose a doctor from the directory.")
        slots = json.loads(doctor["availability"] or "{}").get(visit_date, [])
        if time_slot not in slots:
            raise ValueError("That time is not available. Choose another slot.")
        try:
            cursor = db.execute(
                """INSERT INTO appointments
                   (patient_id,doctor_id,hospital_id,visit_date,time_slot,symptoms,notes,status,created_at)
                   VALUES(?,?,?,?,?,?,?,'pending',?)""",
                (patient_id, doctor_id, doctor["hospital_id"], visit_date, time_slot,
                 symptoms, notes, datetime.utcnow().isoformat(timespec="seconds")),
            )
        except sqlite3.IntegrityError:
            raise ValueError("That time was just booked. Please select another slot.") from None
        return int(cursor.lastrowid)


def update_appointment_status(appointment_id: int, status: str, doctor_user_id: int) -> bool:
    with _LOCK, connect() as db:
        result = db.execute(
            """UPDATE appointments SET status=? WHERE id=? AND status='pending'
               AND doctor_id IN (SELECT id FROM doctors WHERE user_id=?)""",
            (status, appointment_id, doctor_user_id),
        )
        return result.rowcount == 1


def cancel_appointment(appointment_id: int, patient_id: int) -> bool:
    with _LOCK, connect() as db:
        result = db.execute(
            "UPDATE appointments SET status='cancelled' WHERE id=? AND patient_id=? AND status IN ('pending','accepted')",
            (appointment_id, patient_id),
        )
        return result.rowcount == 1
