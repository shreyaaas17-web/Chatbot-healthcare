import json
from datetime import date, timedelta

import streamlit as st

from utils.auth import password_strength, register_user, validate_phone
from utils.db import connect, hospitals
from utils.ui import setup_page

setup_page("Doctor registration")
st.title("Register as a clinician")
st.caption("Clinician credentials are not verified by this demo. Use fictional information only.")
hospital_list = hospitals()
hospital_by_label = {f"{item['name']} · {item['city']}": item for item in hospital_list}

with st.form("doctor_registration"):
    full_name = st.text_input("Full name")
    email = st.text_input("Email address")
    phone = st.text_input("Phone number", placeholder="+91 98765 43210")
    specialization = st.selectbox("Specialization", ["Dermatologist", "Neurologist", "Cardiologist", "Orthopedic", "Pediatrician", "Gynecologist", "ENT", "Ophthalmologist", "Psychiatrist", "Pulmonologist", "Gastroenterologist", "General Physician"])
    qualification = st.text_input("Qualification", placeholder="MBBS, MD")
    license_number = st.text_input("Medical license number", help="Not checked or verified by this demonstration app.")
    experience = st.slider("Years of experience", 0, 50, 5)
    hospital_label = st.selectbox("Hospital", list(hospital_by_label))
    fee = st.number_input("Consultation fee (sample currency: INR)", min_value=0, max_value=100000, value=500, step=100)
    languages = st.multiselect("Languages", ["English", "Hindi", "Marathi", "Gujarati", "Kannada", "Tamil", "Telugu", "Malayalam"])
    bio = st.text_area("Short bio", max_chars=1200)
    photo = st.file_uploader("Profile photo", type=["png", "jpg", "jpeg"])
    if photo:
        st.image(photo, caption="Photo preview", width=160)
    password = st.text_input("Password", type="password")
    strength, score = password_strength(password)
    st.caption(f"Password strength: {strength}")
    st.progress(score / 5)
    confirmation = st.text_input("Confirm password", type="password")
    consent = st.checkbox("I understand my clinician profile is not verified and sample listings are not real providers.")
    submitted = st.form_submit_button("Create doctor account", type="primary", use_container_width=True)

if submitted:
    if not full_name.strip() or not qualification.strip() or not license_number.strip():
        st.error("Complete your name, qualification, and license number.")
    elif not validate_phone(phone):
        st.error("Enter a valid phone number.")
    elif password != confirmation:
        st.error("The passwords do not match.")
    elif score < 3:
        st.error("Choose a stronger password with at least three character types and 8 or more characters.")
    elif not consent:
        st.error("Please confirm the clinician verification notice.")
    else:
        try:
            with st.spinner("Creating your clinician account..."):
                user_id = register_user(email, password, "doctor", full_name, phone)
                hospital = hospital_by_label[hospital_label]
                availability = {}
                for offset in range(7):
                    day = date.today() + timedelta(days=offset)
                    hours = range(9, 17) if day.weekday() < 5 else range(10, 13)
                    availability[day.isoformat()] = [f"{hour:02d}:{minute:02d}" for hour in hours for minute in (0, 30)]
                with connect() as db:
                    db.execute(
                        """INSERT INTO doctors(user_id,name,email,phone,specialization,qualification,license_number,
                           experience,hospital_id,fee,languages,bio,photo,rating,availability,is_seed)
                           VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,0)""",
                        (user_id, full_name.strip(), email.strip().lower(), phone.strip(), specialization,
                         qualification.strip(), license_number.strip(), experience, hospital["id"], float(fee),
                         json.dumps(languages), bio.strip(), photo.getvalue() if photo else None,
                         json.dumps(availability)),
                    )
            st.session_state["user"] = {"id": user_id, "role": "doctor", "full_name": full_name.strip(), "email": email.strip().lower(), "phone": phone.strip()}
            st.toast("Doctor account created")
            st.switch_page("pages/10_Doctor_Dashboard.py")
        except ValueError as exc:
            st.error(str(exc))
        except Exception:
            st.error("We couldn't create the account. Check your details or try a different email.")

st.page_link("pages/1_Login.py", label="Already registered? Sign in")
