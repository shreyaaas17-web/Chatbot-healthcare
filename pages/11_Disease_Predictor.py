import streamlit as st

from utils.ai import disease_matches, emergency_detected, recommend_specialty
from utils.ui import setup_page

setup_page("Disease and symptom guide")
st.title("Disease and symptom guide")
st.caption("This page uses transparent symptom-keyword matching; it is not a trained disease-prediction model.")
st.markdown("<div class='sample-banner'>No trained disease model was present in the existing workspace. Results below are broad possibilities based on matching words, not a diagnosis or probability.</div>", unsafe_allow_html=True)

with st.form("disease_guide_form"):
    symptoms = st.text_area("What symptoms are you noticing?", max_chars=2000, placeholder="For example: sneezing, runny nose, itchy eyes")
    submitted = st.form_submit_button("Review possible matches", type="primary")

if submitted:
    if not symptoms.strip():
        st.warning("Enter one or more symptoms to continue.")
    else:
        st.session_state["disease_guide_result"] = {
            "symptoms": symptoms.strip(),
            "matches": disease_matches(symptoms),
            "specialty": recommend_specialty(symptoms),
            "emergency": emergency_detected(symptoms),
        }

result = st.session_state.get("disease_guide_result")
if result:
    if result["emergency"]:
        st.error("Possible emergency symptom detected. Seek urgent medical care now; do not rely on this guide.")
    if result["matches"]:
        st.markdown("### Possible topics to discuss with a clinician")
        for match in result["matches"][:5]:
            with st.container(border=True):
                st.write(f"**{match['condition']}**")
                st.caption("Matched terms: " + ", ".join(match["matched_terms"]))
    else:
        st.info("No specific keyword patterns matched. A General Physician can help assess symptoms.")
    st.markdown(f"**Suggested specialty:** {result['specialty']}")
    st.caption("These matches are not probabilities, diagnoses, or treatment advice. A qualified clinician must assess symptoms.")
    if st.button("Find a specialist", type="primary"):
        st.session_state["booking"] = {"step": 1, "concern": result["symptoms"], "specialty": result["specialty"]}
        st.switch_page("pages/5_Book_Appointment.py")
