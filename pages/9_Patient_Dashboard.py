from datetime import date

import streamlit as st

from utils.auth import require_login
from utils.db import appointments, cancel_appointment, patient_profile
from utils.ui import setup_page

setup_page("Patient dashboard", role="patient")
user = require_login("patient")
st.title("Patient dashboard")
st.caption("Your upcoming visits and profile at a glance. Use fictional information in this demo.")
profile = patient_profile(user["id"])
upcoming = appointments(user, "upcoming")
past = appointments(user, "past")
upcoming = [item for item in upcoming if item["status"] not in ("cancelled", "declined")]
columns = st.columns(3)
columns[0].metric("Upcoming visits", len(upcoming))
columns[1].metric("Next visit", upcoming[0]["visit_date"] if upcoming else "None scheduled")
columns[2].metric("Profile", "Complete" if profile and profile.get("dob") else "Needs details")

if profile:
    with st.expander("Patient profile"):
        st.write(f"**Name:** {profile['full_name']}")
        st.write(f"**Email:** {profile['email']}")
        st.write(f"**Phone:** {profile['phone']}")
        st.write(f"**Date of birth:** {profile['dob'] or 'Not provided'}")
        st.write(f"**Blood group:** {profile['blood_group'] or 'Not known'}")
        st.write(f"**Allergies:** {', '.join(profile['allergies']) or 'None listed'}")
        st.write(f"**Conditions:** {', '.join(profile['conditions']) or 'None listed'}")

st.markdown("### Upcoming appointments")
if not upcoming:
    st.info("No upcoming appointments. Explore the sample network to request a visit.")
else:
    for item in upcoming:
        with st.container(border=True):
            st.write(f"**{item['visit_date']} · {item['time_slot']}** · {item['status'].title()}")
            st.write(f"{item['doctor_name']} · {item['hospital_name']} · {item['hospital_city']}")
            if item["symptoms"]:
                st.caption(item["symptoms"])
            if st.button("Cancel appointment", key=f"cancel_{item['id']}"):
                if cancel_appointment(item["id"], user["id"]):
                    st.toast("Appointment cancelled")
                    st.rerun()
                st.error("This appointment can no longer be cancelled.")
st.page_link("pages/5_Book_Appointment.py", label="Book an appointment", icon="📅")

with st.expander("Past and cancelled appointments"):
    past += [item for item in appointments(user) if item["status"] == "cancelled"]
    if not past:
        st.info("No past visits yet.")
    for item in past:
        st.write(f"{item['visit_date']} · {item['time_slot']} · {item['doctor_name']} · {item['status'].title()}")
