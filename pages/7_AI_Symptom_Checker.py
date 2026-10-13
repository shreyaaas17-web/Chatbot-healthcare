from datetime import date

import streamlit as st

from utils.ai import disease_matches, emergency_detected, haversine_km, llm_response, symptom_assessment
from utils.db import doctors, hospitals
from utils.ui import setup_page

setup_page("AI symptom checker")
st.title("AI symptom checker")
st.caption("Share symptoms to get general care navigation. This tool cannot diagnose or treat illness.")
st.markdown("<div class='sample-banner'>Use fictional details only. Do not include names, phone numbers, or other personal health information.</div>", unsafe_allow_html=True)

history = st.session_state.setdefault("symptom_messages", [])
for message in history:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if message["role"] == "assistant":
            st.caption("General information only. Not a diagnosis or substitute for professional medical care.")

try:
    from streamlit_mic_recorder import speech_to_text
    voice_text = speech_to_text(language="en", start_prompt="Speak symptoms", stop_prompt="Finish", just_once=True, use_container_width=True, key="symptom_voice")
except Exception:
    voice_text = None

prompt = st.chat_input("Describe what you are experiencing")
if voice_text and voice_text != st.session_state.get("last_voice_prompt"):
    prompt = voice_text
    st.session_state["last_voice_prompt"] = voice_text

if prompt:
    with st.spinner("Preparing general care guidance..."):
        assessment = symptom_assessment(prompt)
        matches = disease_matches(prompt)
        llm_text = llm_response(
            f"Symptoms described by the user: {prompt}\nSuggested specialty from rules: {assessment['specialty']}\nUrgency flag: {assessment['urgency']}. Give cautious, non-diagnostic next-step information in 3 short sentences. Do not prescribe or recommend medication."
        )
        response = llm_text or (
            f"**Care direction:** consider speaking with a **{assessment['specialty']}**.\n\n"
            f"**Urgency guide:** {assessment['urgency'].title()}.\n\n"
            "**Possible explanations to discuss:** "
            + (", ".join(item["condition"] for item in matches[:3]) if matches else ", ".join(assessment["conditions"]))
            + "."
        )
        response += "\n\n*This is general information, not a diagnosis. Please consult a qualified clinician.*"
        history.extend([{"role": "user", "content": prompt}, {"role": "assistant", "content": response}])
        st.session_state["last_assessment"] = assessment
        st.rerun()

assessment = st.session_state.get("last_assessment")
if assessment:
    if assessment["emergency"]:
        st.error("Possible emergency symptoms detected. Do not wait for an online response. Contact local emergency services or go to an emergency department now.")
        st.link_button("Call emergency services (India: 112)", "tel:112", type="primary")
        emergency_hospitals = [item for item in hospitals() if item["emergency"]]
        if st.session_state.get("user_location"):
            lat, lng = st.session_state["user_location"]
            emergency_hospitals.sort(key=lambda item: haversine_km(lat, lng, item["lat"], item["lng"]))
        if emergency_hospitals:
            nearest = emergency_hospitals[0]
            st.warning(f"Nearest listed sample facility: {nearest['name']} · {nearest['city']}. Location and contact details are illustrative; verify local emergency care independently.")
    st.markdown(f"**Suggested specialty:** {assessment['specialty']} · **Urgency guide:** {assessment['urgency'].title()}")

    st.markdown("### Doctor recommendations")
    ranked = doctors(specialization=assessment["specialty"])
    user_location = st.session_state.get("user_location")
    ranked.sort(
        key=lambda doctor: (
            0 if date.today().isoformat() in doctor["availability"] else 1,
            -(doctor["rating"] * 2 + doctor["experience"] * 0.1),
            haversine_km(user_location[0], user_location[1], doctor["hospital_lat"], doctor["hospital_lng"]) if user_location else 0,
        )
    )
    for doctor in ranked[:5]:
        with st.container(border=True):
            st.write(f"**{doctor['name']}** · {doctor['specialization']}")
            st.caption(f"{doctor['hospital_name']} · {doctor['hospital_city']} · ★ {doctor['rating']:.1f} sample rating · {doctor['experience']} years · ₹{doctor['fee']:,.0f} sample fee")
            st.caption("Recommendation uses specialty match, sample rating, experience, and listed availability. No clinical endorsement is implied.")
    if st.button("Find a booking", type="primary"):
        st.session_state["booking"] = {"step": 1, "concern": history[-2]["content"], "specialty": assessment["specialty"]}
        st.switch_page("pages/5_Book_Appointment.py")
