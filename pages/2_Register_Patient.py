import json
from datetime import date

import streamlit as st

from utils.auth import password_strength, register_user, validate_phone
from utils.db import connect
from utils.ui import setup_page

setup_page("Patient registration")
st.title("Create your patient profile")
st.caption("Use demo data only. Avoid adding real health information to this demonstration app.")

with st.form("patient_registration"):
    full_name = st.text_input("Full name")
    email = st.text_input("Email address")
    phone = st.text_input("Phone number", placeholder="+91 98765 43210")
    dob = st.date_input("Date of birth", value=date(2000, 1, 1), min_value=date(1900, 1, 1), max_value=date.today())
    gender = st.selectbox("Gender", ["Prefer not to say", "Female", "Male", "Non-binary", "Other"])
    blood_group = st.selectbox("Blood group", ["Not known", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    allergies = st.multiselect("Known allergies", ["Penicillin", "Sulfa medicines", "NSAIDs", "Latex", "Food allergy", "Other", "None known"])
    conditions = st.multiselect("Existing conditions", ["Asthma", "Diabetes", "High blood pressure", "Heart condition", "Thyroid condition", "Other", "None known"])
    contact_col, contact_phone_col = st.columns(2)
    emergency_name = contact_col.text_input("Emergency contact name")
    emergency_phone = contact_phone_col.text_input("Emergency contact phone")
    password = st.text_input("Password", type="password")
    strength, score = password_strength(password)
    st.caption(f"Password strength: {strength}")
    st.progress(score / 5)
    confirmation = st.text_input("Confirm password", type="password")
    consent = st.checkbox("I understand this is a demonstration app and will use fictional data.")
    submitted = st.form_submit_button("Create patient account", type="primary", use_container_width=True)

if submitted:
    if not full_name.strip():
        st.error("Enter your full name.")
    elif not validate_phone(phone):
        st.error("Enter a valid phone number.")
    elif emergency_phone and not validate_phone(emergency_phone):
        st.error("Enter a valid emergency contact phone number.")
    elif password != confirmation:
        st.error("The passwords do not match.")
    elif score < 3:
        st.error("Choose a stronger password with at least three character types and 8 or more characters.")
    elif not consent:
        st.error("Please confirm the demo-data notice before creating an account.")
    else:
        try:
            with st.spinner("Creating your account..."):
                user_id = register_user(email, password, "patient", full_name, phone)
                with connect() as db:
                    db.execute(
                        """UPDATE patients SET dob=?,gender=?,blood_group=?,allergies=?,conditions=?,emergency_contact=?
                           WHERE user_id=?""",
                        (dob.isoformat(), gender, blood_group, json.dumps([x for x in allergies if x != "None known"]),
                         json.dumps([x for x in conditions if x != "None known"]),
                         json.dumps({"name": emergency_name.strip(), "phone": emergency_phone.strip()}), user_id),
                    )
            st.session_state["user"] = {"id": user_id, "role": "patient", "full_name": full_name.strip(), "email": email.strip().lower(), "phone": phone.strip()}
            st.toast("Patient account created")
            st.switch_page("pages/9_Patient_Dashboard.py")
        except ValueError as exc:
            st.error(str(exc))
        except Exception:
            st.error("We couldn't create the account. Check your details or try a different email.")

st.page_link("pages/1_Login.py", label="Already registered? Sign in")
