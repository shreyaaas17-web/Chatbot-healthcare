import hashlib
import re
import secrets

import bcrypt
import streamlit as st

from utils.db import connect

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_PATTERN = re.compile(r"^\+?[0-9][0-9 ()-]{7,18}$")


def validate_email(email: str) -> bool:
    return bool(EMAIL_PATTERN.fullmatch(email.strip()))


def validate_phone(phone: str) -> bool:
    return bool(PHONE_PATTERN.fullmatch(phone.strip()))


def password_strength(password: str) -> tuple[str, int]:
    score = sum((len(password) >= 8, any(char.isupper() for char in password), any(char.islower() for char in password), any(char.isdigit() for char in password), any(not char.isalnum() for char in password)))
    return ("Weak", score) if score < 3 else ("Fair", score) if score < 4 else ("Strong", score)


def register_user(email: str, password: str, role: str, full_name: str, phone: str) -> int:
    normalized_email = email.strip().lower()
    if not validate_email(normalized_email):
        raise ValueError("Enter a valid email address.")
    if not validate_phone(phone):
        raise ValueError("Enter a valid phone number including area or country code.")
    if len(password) < 8:
        raise ValueError("Use a password with at least 8 characters.")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Choose a password no longer than 72 UTF-8 bytes.")
    salt = secrets.token_hex(16)
    pbkdf_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()
    bcrypt_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        with connect() as db:
            cursor = db.execute(
                """INSERT INTO users(username,pw_hash,salt,role,full_name,email,phone,password_hash)
                   VALUES(?,?,?,?,?,?,?,?)""",
                (normalized_email, pbkdf_hash, salt, role, full_name.strip(), normalized_email, phone.strip(), bcrypt_hash),
            )
            user_id = int(cursor.lastrowid)
            if role == "patient":
                db.execute("INSERT INTO profiles(user_id) VALUES(?)", (user_id,))
                db.execute("INSERT INTO patients(user_id) VALUES(?)", (user_id,))
            return user_id
    except Exception as exc:
        if "UNIQUE" in str(exc).upper():
            raise ValueError("An account with that email already exists. Try signing in.") from None
        raise


def authenticate(email: str, password: str, role: str) -> dict | None:
    with connect() as db:
        user = db.execute("SELECT * FROM users WHERE email=? AND role=?", (email.strip().lower(), role)).fetchone()
        if not user:
            user = db.execute("SELECT * FROM users WHERE username=? AND role=?", (email.strip().lower(), role)).fetchone()
        if not user:
            return None
        user = dict(user)
    stored = user.get("password_hash")
    if stored:
        valid = bcrypt.checkpw(password.encode(), stored.encode())
    else:
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(user["salt"]), 200_000).hex()
        valid = secrets.compare_digest(candidate, user["pw_hash"])
    return {"id": user["id"], "role": user["role"], "full_name": user["full_name"], "email": user.get("email") or user["username"], "phone": user.get("phone") or ""} if valid else None


def require_login(role: str | None = None) -> dict:
    user = st.session_state.get("user")
    if not user or (role and user.get("role") != role):
        st.warning("Please sign in with the correct account to continue.")
        st.switch_page("pages/1_Login.py")
        st.stop()
    return user


def sign_out() -> None:
    for key in ("user", "booking", "symptom_messages"):
        st.session_state.pop(key, None)
