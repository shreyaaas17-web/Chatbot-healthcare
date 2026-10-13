from datetime import date

import streamlit as st

from utils.ai import llm_response
from utils.auth import require_login
from utils.db import appointments, connect, doctors, update_appointment_status
from utils.ui import setup_page

setup_page("Doctor dashboard", role="doctor")
user = require_login("doctor")
st.title("Doctor dashboard")
st.caption("Review appointment requests and prepare for visits. Sample profiles and records are fictional.")
today = date.today().isoformat()
visits = appointments(user)
today_visits = [item for item in visits if item["visit_date"] == today and item["status"] != "cancelled"]
pending = [item for item in visits if item["status"] == "pending"]
upcoming = [item for item in visits if item["visit_date"] >= today and item["status"] not in ("cancelled", "declined")]
cols = st.columns(3)
cols[0].metric("Visits today", len(today_visits))
cols[1].metric("Pending requests", len(pending))
cols[2].metric("Upcoming visits", len(upcoming))

with connect() as db:
    doctor_profile = db.execute("SELECT * FROM doctors WHERE user_id=?", (user["id"],)).fetchone()
    if doctor_profile:
        doctor_profile = dict(doctor_profile)
        patient_rows = db.execute(
            """SELECT DISTINCT u.id,u.full_name,u.email,p.dob,p.blood_group,p.allergies,p.conditions
               FROM appointments a JOIN doctors d ON d.id=a.doctor_id
               JOIN users u ON u.id=a.patient_id LEFT JOIN patients p ON p.user_id=u.id
               WHERE d.user_id=? ORDER BY u.full_name""", (user["id"],)
        ).fetchall()
    else:
        patient_rows = []

if doctor_profile:
    with st.expander("My sample clinician profile"):
        st.write(f"**{doctor_profile['specialization']}** · {doctor_profile['qualification']}")
        st.write(f"License: {doctor_profile['license_number'] or 'Not provided'} · not verified")
        st.write(doctor_profile["bio"] or "No bio added.")
        if doctor_profile["photo"]:
            st.image(doctor_profile["photo"], width=130)

st.markdown("### Appointment requests")
if not visits:
    st.info("No visits assigned to this doctor yet. New sample bookings will appear here.")
else:
    for item in visits:
        with st.container(border=True):
            st.write(f"**{item['visit_date']} · {item['time_slot']}** · {item['status'].title()}")
            st.write(f"Patient: {item['patient_name']} · {item['hospital_name']}")
            if item["symptoms"]:
                st.caption(f"Patient notes: {item['symptoms']}")
            if item["notes"]:
                st.caption(f"Additional notes: {item['notes']}")
            if item["status"] == "pending":
                accept_col, decline_col = st.columns(2)
                if accept_col.button("Accept", key=f"accept_{item['id']}", type="primary"):
                    if update_appointment_status(item["id"], "accepted", user["id"]):
                        st.toast("Appointment accepted")
                        st.rerun()
                if decline_col.button("Decline", key=f"decline_{item['id']}"):
                    if update_appointment_status(item["id"], "declined", user["id"]):
                        st.toast("Appointment declined")
                        st.rerun()
            if item["symptoms"]:
                if st.button("Prepare pre-visit summary", key=f"summary_{item['id']}"):
                    summary = llm_response(f"Create a brief, neutral summary of the patient-provided appointment notes for a clinician. Do not diagnose, infer missing details, or recommend treatment. Keep to stated facts. Notes: {item['symptoms']} {item['notes']}")
                    st.info(summary or f"Patient-reported reason: {item['symptoms']}\nAdditional notes: {item['notes'] or 'None provided.'}")
                    st.caption("Draft summary only. Verify every detail with the patient; this is not a diagnosis.")

st.markdown("### Patient list")
if not patient_rows:
    st.info("Patients appear here after booking with this clinician.")
else:
    for patient in patient_rows:
        with st.expander(patient["full_name"]):
            st.write(f"Email: {patient['email']}")
            st.write(f"Date of birth: {patient['dob'] or 'Not provided'}")
            st.write(f"Blood group: {patient['blood_group'] or 'Not known'}")
            st.write(f"Allergies: {patient['allergies'] or 'None listed'}")
            st.write(f"Conditions: {patient['conditions'] or 'None listed'}")
            st.caption("Demo record only. Confirm patient identity and all clinical details independently.")
