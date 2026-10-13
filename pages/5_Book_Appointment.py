from datetime import date, timedelta

import streamlit as st

from utils.ai import recommend_specialty
from utils.auth import require_login
from utils.db import available_slots, create_appointment, doctors, hospitals
from utils.ui import setup_page
from data.sample_data import SPECIALTIES

setup_page("Book an appointment", role="patient")
user = require_login("patient")
st.title("Book an appointment")
st.caption("Choose a care need, facility, clinician, and available time.")
booking = st.session_state.setdefault("booking", {"step": 1})
step = int(booking.get("step", 1))
st.progress(min(step, 5) / 5)
st.caption(f"Step {min(step, 5)} of 5")

if step == 6:
    st.success(f"Appointment request #{booking['appointment_id']} created.")
    st.write(f"{booking['doctor_name']} · {booking['hospital_name']} · {booking['visit_date']} at {booking['time_slot']}")
    st.info("Your appointment is pending clinician confirmation. This is a demo booking.")
    if st.button("Book another appointment"):
        st.session_state["booking"] = {"step": 1}
        st.rerun()
    st.page_link("pages/9_Patient_Dashboard.py", label="View my dashboard")
    st.stop()

if step == 1:
    st.subheader("1 · What kind of care do you need?")
    with st.form("booking_need"):
        concern = st.text_area("Describe the concern or enter a disease/symptom", max_chars=1000)
        suggested = recommend_specialty(concern) if concern else "General Physician"
        specialty = st.selectbox("Specialty", SPECIALTIES, index=SPECIALTIES.index(suggested))
        if st.form_submit_button("Choose a facility", type="primary"):
            booking.update(step=2, concern=concern.strip(), specialty=specialty)
            st.rerun()
elif step == 2:
    st.subheader("2 · Choose a facility")
    matches = [item for item in hospitals() if booking["specialty"] in item["specialties"]]
    with st.form("booking_hospital"):
        hospital_labels = {f"{item['name']} · {item['city']} · ★ {item['rating']:.1f}": item for item in matches}
        choice = st.selectbox("Hospitals with this specialty", list(hospital_labels))
        left, right = st.columns(2)
        back = left.form_submit_button("Back")
        forward = right.form_submit_button("Choose a doctor", type="primary")
    if back:
        booking["step"] = 1
        st.rerun()
    if forward:
        hospital = hospital_labels[choice]
        booking.update(step=3, hospital_id=hospital["id"], hospital_name=hospital["name"])
        st.rerun()
elif step == 3:
    st.subheader("3 · Choose a clinician")
    clinicians = doctors(hospital_id=booking["hospital_id"], specialization=booking["specialty"])
    if not clinicians:
        st.info("No clinicians are listed for this specialty at the selected facility.")
        if st.button("Choose another facility"):
            booking["step"] = 2
            st.rerun()
    else:
        with st.form("booking_doctor"):
            doctor_labels = {
                f"{item['name']} · {item['qualification']} · {item['experience']} years · ₹{item['fee']:,.0f}": item
                for item in clinicians
            }
            selected = st.selectbox("Clinician", list(doctor_labels))
            left, right = st.columns(2)
            back = left.form_submit_button("Back")
            forward = right.form_submit_button("Choose date", type="primary")
        if back:
            booking["step"] = 2
            st.rerun()
        if forward:
            doctor = doctor_labels[selected]
            booking.update(step=4, doctor_id=doctor["id"], doctor_name=doctor["name"])
            st.rerun()
elif step == 4:
    st.subheader("4 · Choose a date and open time")
    with st.form("booking_slot"):
        day = st.date_input("Appointment date", min_value=date.today(), max_value=date.today() + timedelta(days=6))
        slots = available_slots(booking["doctor_id"], day.isoformat())
        slot = st.selectbox("Available time", slots) if slots else None
        if not slots:
            st.info("No slots are open on this date. Try another day.")
        left, right = st.columns(2)
        back = left.form_submit_button("Back")
        forward = right.form_submit_button("Add visit details", type="primary", disabled=not slots)
    if back:
        booking["step"] = 3
        st.rerun()
    if forward and slot:
        booking.update(step=5, visit_date=day.isoformat(), time_slot=slot)
        st.rerun()
elif step == 5:
    st.subheader("5 · Add visit details and confirm")
    st.write(f"**{booking['doctor_name']}** · {booking['specialty']}")
    st.write(f"{booking['hospital_name']} · {booking['visit_date']} · {booking['time_slot']}")
    with st.form("booking_confirm"):
        symptoms = st.text_area("Symptoms or reason for visit", value=booking.get("concern", ""), max_chars=2000)
        notes = st.text_area("Notes for the clinician", max_chars=2000)
        st.caption("This is a demo booking. Do not enter real medical information.")
        left, right = st.columns(2)
        back = left.form_submit_button("Back")
        confirm = right.form_submit_button("Confirm appointment", type="primary")
    if back:
        booking["step"] = 4
        st.rerun()
    if confirm:
        try:
            appointment_id = create_appointment(user["id"], booking["doctor_id"], booking["visit_date"], booking["time_slot"], symptoms.strip(), notes.strip())
            booking.update(step=6, appointment_id=appointment_id)
            st.rerun()
        except ValueError as exc:
            st.error(str(exc))

st.caption("A symptom-to-specialty match is only a navigation aid, not a diagnosis. Seek urgent care for severe or rapidly worsening symptoms.")
