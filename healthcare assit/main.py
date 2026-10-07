import hashlib
import hmac
import logging
import os
import re
import secrets
import sqlite3
import warnings
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
from typing import Iterator, Literal

import jwt
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_urlsafe(32)
if not os.getenv("SECRET_KEY"):
    warnings.warn(
        "SECRET_KEY is not configured; tokens will be invalidated when the app restarts.",
        stacklevel=1,
    )
DOCTOR_INVITE = os.getenv("DOCTOR_INVITE", "")
TOKEN_HOURS = 8
MAX_CONVERSATION_CHARS = 24_000
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "clinic.db"))
_db_lock = RLock()
_openrouter_client: OpenAI | None = None

PATIENT_SYS = """You are a clinic assistant talking to patients. Collect symptoms, duration,
severity, allergies and current medicines. Be kind and concise. Never prescribe or give doses.
If you see emergency signs (chest pain, trouble breathing, stroke signs, severe bleeding),
tell the patient to seek emergency care immediately. Finish by summarizing for the doctor."""

DOCTOR_SYS = """You are a clinical decision-support assistant for a licensed doctor.
Give: 1) ranked differentials, 2) red flags, 3) suggested tests, 4) first-line treatment
options with common medicines and typical adult dose ranges, 5) interactions/contraindications
to check against the patient's record. Be concise. State that the doctor makes the final decision."""

SUMMARY_SYS = """Summarize this patient intake conversation for the doctor in under 150 words:
chief complaint, duration, severity, associated symptoms, allergies, current medicines, red flags.
Use only facts stated in the conversation."""

MEDCHECK_SYS = """You are a clinical pharmacist assistant. Given a patient record and proposed
medicines, review for: allergy conflicts, drug-drug interactions (including current medicines),
condition contraindications, age-related cautions, and dose concerns. Be concise, use short bullets,
and end with a one-line verdict. The doctor makes the final decision."""

EMERGENCY_WORDS = (
    "chest pain",
    "can't breathe",
    "cannot breathe",
    "shortness of breath",
    "severe bleeding",
    "unconscious",
    "stroke",
    "suicide",
    "seizure",
)

# Illustrative only; replace with a licensed drug database for production use.
INTERACTIONS = {
    frozenset(["warfarin", "aspirin"]): "Increased bleeding risk",
    frozenset(["warfarin", "ibuprofen"]): "Increased bleeding risk",
    frozenset(["aspirin", "ibuprofen"]): "Reduced antiplatelet effect, GI bleeding risk",
    frozenset(["sildenafil", "nitroglycerin"]): "Severe hypotension (contraindicated)",
    frozenset(["clarithromycin", "simvastatin"]): "Raised statin levels, myopathy risk",
    frozenset(["fluoxetine", "tramadol"]): "Serotonin syndrome and seizure risk",
    frozenset(["lisinopril", "spironolactone"]): "Hyperkalemia risk",
    frozenset(["ciprofloxacin", "theophylline"]): "Theophylline toxicity risk",
    frozenset(["methotrexate", "trimethoprim"]): "Bone marrow suppression risk",
}
ALLERGY_CLASSES = {
    "penicillin": ["penicillin", "amoxicillin", "ampicillin", "cloxacillin", "piperacillin"],
    "sulfa": ["sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "sulfasalazine"],
    "nsaid": ["ibuprofen", "diclofenac", "aspirin", "naproxen", "ketorolac"],
}

app = FastAPI(title="Medintel API")
bearer = HTTPBearer(auto_error=False)


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    connection = sqlite3.connect(DATABASE_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


with get_db() as db:
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL,
            salt TEXT NOT NULL, role TEXT NOT NULL, full_name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS profiles(
            user_id INTEGER PRIMARY KEY, age INTEGER, sex TEXT,
            allergies TEXT DEFAULT '', conditions TEXT DEFAULT '', medicines TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS appts(
            id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, day TEXT NOT NULL,
            slot TEXT NOT NULL, reason TEXT DEFAULT '', UNIQUE(day, slot));
        CREATE TABLE IF NOT EXISTS intakes(
            id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, ts TEXT, summary TEXT);
        CREATE TABLE IF NOT EXISTS notes(
            id INTEGER PRIMARY KEY, patient_id INTEGER NOT NULL, doctor_id INTEGER NOT NULL,
            ts TEXT, diagnosis TEXT, prescription TEXT, advice TEXT, ai_suggestion TEXT);
        CREATE TABLE IF NOT EXISTS audit(
            id INTEGER PRIMARY KEY, ts TEXT, user_id INTEGER, role TEXT, kind TEXT,
            request TEXT, response TEXT);
        """
    )


# ---------- helpers ----------
def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pw(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), 200_000
    ).hex()


def make_token(user: sqlite3.Row) -> str:
    payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def token_response(user_id: int) -> dict:
    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if user is None:
        raise HTTPException(500, "Unable to load registered user")
    return {
        "token": make_token(user),
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
        },
    }


def current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if cred is None:
        raise HTTPException(401, "Authentication required")
    try:
        data = jwt.decode(cred.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = int(data["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(401, "Invalid or expired token") from None
    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if user is None:
        raise HTTPException(401, "User not found")
    return dict(user)


def doctor_only(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "doctor":
        raise HTTPException(403, "Doctor access only")
    return user


def patient_only(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "patient":
        raise HTTPException(403, "Patient access only")
    return user


def log(user: dict, kind: str, request: str, response: str) -> None:
    with _db_lock, get_db() as db:
        db.execute(
            "INSERT INTO audit(ts,user_id,role,kind,request,response) VALUES(?,?,?,?,?,?)",
            (now(), user["id"], user["role"], kind, request, response),
        )


def get_openrouter_client() -> OpenAI:
    global _openrouter_client
    if _openrouter_client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise HTTPException(
                503, "AI service is not configured. Set OPENROUTER_API_KEY in .env."
            )
        try:
            _openrouter_client = OpenAI(
                api_key=api_key,
                base_url=OPENROUTER_BASE_URL,
                default_headers={"X-Title": "Medintel"},
            )
        except OpenAIError as exc:
            logger.error("OpenRouter client configuration failed: %s", exc)
            raise HTTPException(503, "OpenRouter client configuration failed.") from None
    return _openrouter_client


def run_llm(
    system: str,
    user: dict,
    kind: str,
    history: list[dict[str, str]],
    max_tokens: int = 1000,
) -> str:
    try:
        response = get_openrouter_client().chat.completions.create(
            model=OPENROUTER_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "system", "content": system}, *history],
        )
        reply = response.choices[0].message.content
        if not isinstance(reply, str) or not reply:
            raise ValueError("OpenRouter returned an empty response")
    except HTTPException:
        raise
    except (OpenAIError, IndexError, AttributeError, ValueError) as exc:
        logger.error("OpenRouter request failed: %s", exc)
        raise HTTPException(502, "OpenRouter request failed. Please try again.") from None
    input_chars = sum(len(message["content"]) for message in history)
    log(user, kind, f"input_chars={input_chars}", f"output_chars={len(reply)}")
    return reply


def patient_context(patient_id: int) -> str:
    with get_db() as db:
        user = db.execute(
            "SELECT full_name FROM users WHERE id=? AND role='patient'", (patient_id,)
        ).fetchone()
        profile = db.execute(
            "SELECT * FROM profiles WHERE user_id=?", (patient_id,)
        ).fetchone()
        intake = db.execute(
            "SELECT summary, ts FROM intakes WHERE patient_id=? ORDER BY id DESC LIMIT 1",
            (patient_id,),
        ).fetchone()
    if user is None:
        raise HTTPException(404, "Patient not found")
    lines = [f"Patient: {user['full_name']}"]
    if profile:
        lines.extend(
            [
                f"Age: {profile['age'] or 'unknown'}, Sex: {profile['sex'] or 'unknown'}",
                f"Allergies: {profile['allergies'] or 'none recorded'}",
                f"Conditions: {profile['conditions'] or 'none recorded'}",
                f"Current medicines: {profile['medicines'] or 'none recorded'}",
            ]
        )
    if intake:
        lines.append(f"Latest intake ({intake['ts'][:10]}): {intake['summary']}")
    return "\n".join(lines)


def rule_check(proposed: list[str], current_meds: str, allergies: str) -> list[str]:
    meds = [medicine.lower().strip() for medicine in proposed if medicine.strip()]
    current = [
        medicine.lower().strip()
        for medicine in re.split(r"[,;\n]", current_meds or "")
        if medicine.strip()
    ]
    allergies_lower = (allergies or "").lower()
    alerts = set()
    for medicine in meds:
        if medicine in allergies_lower:
            alerts.add(f"ALLERGY: patient is allergic to {medicine}")
        for allergen, members in ALLERGY_CLASSES.items():
            if allergen in allergies_lower and any(member in medicine for member in members):
                alerts.add(f"ALLERGY: {medicine} conflicts with recorded {allergen} allergy")
    pool = meds + current
    for index, medicine in enumerate(pool):
        for other in pool[index + 1 :]:
            for pair, message in INTERACTIONS.items():
                first, second = tuple(pair)
                if (first in medicine and second in other) or (
                    second in medicine and first in other
                ):
                    alerts.add(f"INTERACTION: {medicine} + {other}: {message}")
    return sorted(alerts)


# ---------- schemas ----------
class InputModel(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class RegisterIn(InputModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: Literal["patient", "doctor"] = "patient"
    invite_code: str = Field(default="", max_length=256)


class LoginIn(InputModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class ProfileIn(InputModel):
    age: int | None = Field(default=None, ge=0, le=120)
    sex: str = Field(default="", max_length=32)
    allergies: str = Field(default="", max_length=2000)
    conditions: str = Field(default="", max_length=4000)
    medicines: str = Field(default="", max_length=4000)


class AppointmentIn(InputModel):
    day: str = Field(description="YYYY-MM-DD", min_length=10, max_length=10)
    slot: str = Field(description="HH:MM", min_length=5, max_length=5)
    reason: str = Field(default="", max_length=500)


class Message(InputModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(InputModel):
    messages: list[Message] = Field(min_length=1, max_length=40)
    patient_id: int | None = Field(default=None, gt=0)


class MedCheckIn(InputModel):
    patient_id: int = Field(gt=0)
    medicines: list[str] = Field(min_length=1, max_length=30)


class NoteIn(InputModel):
    patient_id: int = Field(gt=0)
    diagnosis: str = Field(min_length=1, max_length=4000)
    prescription: str = Field(default="", max_length=4000)
    advice: str = Field(default="", max_length=4000)
    ai_suggestion: str = Field(default="", max_length=12000)


def validate_conversation_size(messages: list[Message]) -> None:
    if sum(len(message.content) for message in messages) > MAX_CONVERSATION_CHARS:
        raise HTTPException(413, "Conversation is too long; start a new conversation")


def to_history(messages: list[Message]) -> list[dict[str, str]]:
    validate_conversation_size(messages)
    if messages[-1].role != "user":
        raise HTTPException(422, "Last message must be from the user")
    return [{"role": message.role, "content": message.content} for message in messages]


# ---------- auth ----------
@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", status_code=201)
def register(body: RegisterIn) -> dict:
    if not body.username.strip() or not body.full_name.strip():
        raise HTTPException(422, "Username and full name are required")
    if body.role == "doctor":
        if not DOCTOR_INVITE:
            raise HTTPException(503, "Doctor registration is not configured")
        if not hmac.compare_digest(body.invite_code, DOCTOR_INVITE):
            raise HTTPException(403, "Invalid doctor invite code")
    salt = secrets.token_hex(16)
    try:
        with _db_lock, get_db() as db:
            cursor = db.execute(
                "INSERT INTO users(username,pw_hash,salt,role,full_name) VALUES(?,?,?,?,?)",
                (
                    body.username.lower(),
                    hash_pw(body.password, salt),
                    salt,
                    body.role,
                    body.full_name,
                ),
            )
            user_id = cursor.lastrowid
            if body.role == "patient":
                db.execute("INSERT INTO profiles(user_id) VALUES(?)", (user_id,))
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username already taken") from None
    return token_response(user_id)


@app.post("/auth/login")
def login(body: LoginIn) -> dict:
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username=?", (body.username.lower(),)
        ).fetchone()
    if user is None or not hmac.compare_digest(
        user["pw_hash"], hash_pw(body.password, user["salt"])
    ):
        raise HTTPException(401, "Wrong username or password")
    return token_response(user["id"])


@app.get("/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "full_name": user["full_name"],
    }


# ---------- profiles and patients ----------
@app.get("/profile/me")
def get_profile(user: dict = Depends(patient_only)) -> dict:
    with get_db() as db:
        profile = db.execute(
            "SELECT * FROM profiles WHERE user_id=?", (user["id"],)
        ).fetchone()
    if profile is None:
        raise HTTPException(404, "Profile not found")
    return dict(profile)


@app.put("/profile/me")
def put_profile(profile: ProfileIn, user: dict = Depends(patient_only)) -> dict:
    with _db_lock, get_db() as db:
        db.execute(
            "UPDATE profiles SET age=?, sex=?, allergies=?, conditions=?, medicines=? "
            "WHERE user_id=?",
            (
                profile.age,
                profile.sex,
                profile.allergies,
                profile.conditions,
                profile.medicines,
                user["id"],
            ),
        )
    return {"ok": True}


@app.get("/patients")
def list_patients(user: dict = Depends(doctor_only)) -> list[dict]:
    with get_db() as db:
        return [
            dict(row)
            for row in db.execute(
                "SELECT id, full_name, username FROM users "
                "WHERE role='patient' ORDER BY full_name"
            )
        ]


@app.get("/patients/{patient_id}")
def get_patient(patient_id: int, user: dict = Depends(doctor_only)) -> dict:
    patient_context(patient_id)
    with get_db() as db:
        profile = db.execute(
            "SELECT * FROM profiles WHERE user_id=?", (patient_id,)
        ).fetchone()
        intakes = db.execute(
            "SELECT * FROM intakes WHERE patient_id=? ORDER BY id DESC", (patient_id,)
        )
        notes = db.execute(
            "SELECT * FROM notes WHERE patient_id=? ORDER BY id DESC", (patient_id,)
        )
        return {
            "profile": dict(profile) if profile else None,
            "intakes": [dict(row) for row in intakes],
            "notes": [dict(row) for row in notes],
        }


# ---------- appointments ----------
@app.post("/appointments", status_code=201)
def book(appointment: AppointmentIn, user: dict = Depends(patient_only)) -> dict:
    try:
        appointment_day = datetime.strptime(appointment.day, "%Y-%m-%d").date()
        datetime.strptime(appointment.slot, "%H:%M")
    except ValueError:
        raise HTTPException(422, "Use YYYY-MM-DD and HH:MM") from None
    if appointment_day < date.today():
        raise HTTPException(422, "Date is in the past")
    try:
        with _db_lock, get_db() as db:
            cursor = db.execute(
                "INSERT INTO appts(patient_id,day,slot,reason) VALUES(?,?,?,?)",
                (user["id"], appointment.day, appointment.slot, appointment.reason),
            )
            appointment_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Slot already booked") from None
    return {"id": appointment_id, **appointment.model_dump()}


@app.get("/appointments")
def list_appts(user: dict = Depends(current_user)) -> list[dict]:
    query = """SELECT a.id, a.day, a.slot, a.reason, a.patient_id, u.full_name AS patient
               FROM appts a JOIN users u ON u.id = a.patient_id"""
    with get_db() as db:
        if user["role"] == "doctor":
            rows = db.execute(query + " ORDER BY a.day, a.slot")
        else:
            rows = db.execute(
                query + " WHERE a.patient_id=? ORDER BY a.day, a.slot", (user["id"],)
            )
        return [dict(row) for row in rows]


@app.delete("/appointments/{appointment_id}")
def cancel(appointment_id: int, user: dict = Depends(current_user)) -> dict:
    with _db_lock, get_db() as db:
        if user["role"] == "doctor":
            cursor = db.execute("DELETE FROM appts WHERE id=?", (appointment_id,))
        else:
            cursor = db.execute(
                "DELETE FROM appts WHERE id=? AND patient_id=?",
                (appointment_id, user["id"]),
            )
        deleted = cursor.rowcount
    if deleted == 0:
        raise HTTPException(404, "Not found")
    return {"deleted": appointment_id}


# ---------- chat ----------
@app.post("/chat/patient")
def chat_patient(
    request: ChatRequest, user: dict = Depends(patient_only)
) -> dict[str, str | bool]:
    history = to_history(request.messages)
    emergency = any(word in history[-1]["content"].lower() for word in EMERGENCY_WORDS)
    system = PATIENT_SYS + "\n\nKnown patient record:\n" + patient_context(user["id"])
    return {
        "reply": run_llm(system, user, "patient_chat", history),
        "emergency": emergency,
    }


@app.post("/intakes", status_code=201)
def submit_intake(
    request: ChatRequest, user: dict = Depends(patient_only)
) -> dict[str, str]:
    validate_conversation_size(request.messages)
    transcript = "\n".join(
        f"{message.role.upper()}: {message.content}" for message in request.messages
    )
    summary = run_llm(
        SUMMARY_SYS,
        user,
        "intake_summary",
        [{"role": "user", "content": transcript}],
        max_tokens=500,
    )
    with _db_lock, get_db() as db:
        db.execute(
            "INSERT INTO intakes(patient_id,ts,summary) VALUES(?,?,?)",
            (user["id"], now(), summary),
        )
    return {"summary": summary}


@app.post("/chat/doctor")
def chat_doctor(
    request: ChatRequest, user: dict = Depends(doctor_only)
) -> dict[str, str]:
    history = to_history(request.messages)
    system = DOCTOR_SYS
    if request.patient_id is not None:
        system += "\n\nPatient record:\n" + patient_context(request.patient_id)
    return {"reply": run_llm(system, user, "doctor_chat", history)}


# ---------- medication safety ----------
@app.post("/doctor/medication-check")
def medication_check(
    body: MedCheckIn, user: dict = Depends(doctor_only)
) -> dict[str, list[str] | str]:
    context = patient_context(body.patient_id)
    with get_db() as db:
        profile = db.execute(
            "SELECT * FROM profiles WHERE user_id=?", (body.patient_id,)
        ).fetchone()
    if profile is None:
        raise HTTPException(404, "Patient profile not found")
    alerts = rule_check(body.medicines, profile["medicines"], profile["allergies"])
    prompt = f"{context}\n\nProposed medicines: {', '.join(body.medicines)}"
    review = run_llm(
        MEDCHECK_SYS, user, "medication_check", [{"role": "user", "content": prompt}]
    )
    return {"rule_alerts": alerts, "ai_review": review}


# ---------- doctor notes ----------
@app.post("/notes", status_code=201)
def add_note(note: NoteIn, user: dict = Depends(doctor_only)) -> dict[str, bool]:
    patient_context(note.patient_id)
    with _db_lock, get_db() as db:
        db.execute(
            """INSERT INTO notes(patient_id,doctor_id,ts,diagnosis,prescription,advice,ai_suggestion)
               VALUES(?,?,?,?,?,?,?)""",
            (
                note.patient_id,
                user["id"],
                now(),
                note.diagnosis,
                note.prescription,
                note.advice,
                note.ai_suggestion,
            ),
        )
    log(user, "note_saved", f"patient_id={note.patient_id}", "saved")
    return {"ok": True}


@app.get("/notes/me")
def my_notes(user: dict = Depends(patient_only)) -> list[dict]:
    with get_db() as db:
        return [
            dict(row)
            for row in db.execute(
                "SELECT ts, diagnosis, prescription, advice FROM notes "
                "WHERE patient_id=? ORDER BY id DESC",
                (user["id"],),
            )
        ]


# ---------- audit ----------
@app.get("/audit")
def audit(
    limit: int = Query(default=100, ge=1, le=500),
    user: dict = Depends(doctor_only),
) -> list[dict]:
    with get_db() as db:
        return [
            dict(row)
            for row in db.execute("SELECT * FROM audit ORDER BY id DESC LIMIT ?", (limit,))
        ]
