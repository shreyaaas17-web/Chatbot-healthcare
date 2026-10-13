from datetime import date

import streamlit as st

from utils.ai import recommend_specialty
from utils.db import doctors, hospitals, init_db
from utils.style import apply_style, section_heading, sample_notice
from utils.ui import render_sidebar

st.set_page_config(page_title="Medintel · Find care", page_icon="✚", layout="wide")
init_db()
apply_style()
render_sidebar()

hero_copy, hero_image = st.columns([1.35, 0.85], gap="large", vertical_alignment="center")
with hero_copy:
    st.markdown(
        """
        <section class="hero">
          <div class="eyebrow">MEDINTEL · CARE, CONNECTED</div>
          <div class="hero-title">Better care starts <span>before you arrive.</span></div>
          <div class="hero-copy">Find a clinician, explore a hospital, or describe what is bothering you. Medintel helps you prepare for a conversation with a qualified professional.</div>
        </section>
        """,
        unsafe_allow_html=True,
    )
    with st.form("home_search"):
        query = st.text_input("Search a symptom, doctor, specialty, or hospital", placeholder="Try migraine, cardiology, or a city")
        submitted = st.form_submit_button("Search care", use_container_width=True, type="primary")
with hero_image:
    st.image(
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85",
        use_container_width=True,
    )
if submitted:
    specialty = recommend_specialty(query) if query.strip() else "General Physician"
    if specialty != "General Physician" or query.strip().casefold() in ("general physician", "primary care"):
        st.session_state["hospital_specialty"] = specialty
        st.session_state["hospital_search"] = ""
    else:
        st.session_state["hospital_specialty"] = "All specialties"
        st.session_state["hospital_search"] = query.strip()
    st.switch_page("pages/4_Hospitals.py")

sample_notice()
all_hospitals = hospitals()
all_doctors = doctors()

section_heading("FIND THE RIGHT CARE", "Browse by specialty", "Start with the kind of support you are looking for.")
specialties = [
    ("Dermatologist", "Skin"), ("Neurologist", "Brain & nerves"),
    ("Cardiologist", "Heart"), ("Orthopedic", "Bones & joints"),
    ("Pediatrician", "Children"), ("Gynecologist", "Women's health"),
    ("ENT", "Ear, nose & throat"), ("Ophthalmologist", "Eyes"),
    ("Psychiatrist", "Mental health"), ("Pulmonologist", "Breathing"),
    ("Gastroenterologist", "Digestive health"), ("General Physician", "Primary care"),
]
for offset in range(0, len(specialties), 4):
    cols = st.columns(4, gap="medium")
    for col, (specialty, subtext) in zip(cols, specialties[offset:offset + 4]):
        with col:
            st.markdown(f'<div class="item-card"><div class="item-name">{specialty}</div><div class="item-meta">{subtext}</div></div>', unsafe_allow_html=True)
            if st.button("Explore", key=f"specialty_{specialty}", use_container_width=True):
                st.session_state["hospital_specialty"] = specialty
                st.session_state["hospital_search"] = ""
                st.switch_page("pages/4_Hospitals.py")

section_heading("FACILITIES", "Hospitals to explore", "Example facilities across several cities. Listings and details are demo data.")
cols = st.columns(3, gap="medium")
for col, hospital in zip(cols, sorted(all_hospitals, key=lambda item: item["rating"], reverse=True)[:3]):
    with col:
        st.markdown(f'<div class="item-card"><div class="item-name">{hospital["name"]}</div><div class="item-meta">{hospital["city"]} · ★ {hospital["rating"]:.1f}<br>{", ".join(hospital["specialties"][:3])}</div></div>', unsafe_allow_html=True)
st.page_link("pages/4_Hospitals.py", label="Explore all hospitals", icon="🏥")

section_heading("CLINICIANS", "Featured doctors", "Sample profiles help demonstrate search and booking; they do not represent real providers.")
cols = st.columns(4, gap="medium")
for col, doctor in zip(cols, all_doctors[:4]):
    with col:
        st.markdown(f'<div class="item-card"><div class="item-name">{doctor["name"]}</div><div class="item-meta">{doctor["specialization"]}<br>{doctor["hospital_city"]} · ★ {doctor["rating"]:.1f}<br>₹{doctor["fee"]:,.0f} sample fee</div></div>', unsafe_allow_html=True)

section_heading("HOW IT WORKS", "A simple path to a prepared visit")
steps = st.columns(3)
for col, number, title, copy in zip(steps, ("01", "02", "03"), ("Explore care", "Choose a time", "Arrive prepared"), ("Compare sample facilities and specialties.", "Select a doctor and a listed open slot.", "Bring your notes and questions to your clinician.")):
    with col:
        st.markdown(f'<div class="item-card"><div class="eyebrow">{number}</div><div class="item-name">{title}</div><div class="item-meta">{copy}</div></div>', unsafe_allow_html=True)

section_heading("SUPPORT TOOLS", "Prepare for a more useful conversation")
feature_cols = st.columns(3)
for col, title, body, target, label in zip(
    feature_cols,
    ("Symptom guide", "Visit preparation", "Health risk guide"),
    ("Get a cautious care direction and see when to seek urgent help.", "Organize your symptoms and questions before an appointment.", "Explore general factors such as BMI and smoking; not a diagnosis."),
    ("pages/7_AI_Symptom_Checker.py", "pages/9_Patient_Dashboard.py", "pages/8_Health_Risk.py"),
    ("Open symptom guide", "Patient dashboard", "Explore risk factors"),
):
    with col:
        st.markdown(f'<div class="item-card"><div class="item-name">{title}</div><div class="item-meta">{body}</div></div>', unsafe_allow_html=True)
        st.page_link(target, label=label)

section_heading("NETWORK SNAPSHOT", "A sample network across India")
metric_cols = st.columns(3)
metric_cols[0].metric("Sample hospitals", len(all_hospitals))
metric_cols[1].metric("Sample clinicians", len(all_doctors))
metric_cols[2].metric("Specialties", len({doctor["specialization"] for doctor in all_doctors}))

section_heading("PATIENT VOICES", "Illustrative feedback")
st.caption("These sample quotes are fictional and are included only to demonstrate the page layout.")
quotes = st.columns(3)
for col, quote, source in zip(quotes, ("The visit felt easier to prepare for.", "It was helpful to have my questions in one place.", "The directory made it simple to compare specialties."), ("Demo patient · Pune", "Demo patient · Kolhapur", "Demo patient · Mumbai")):
    with col:
        st.markdown(f'<div class="item-card"><div class="item-meta">“{quote}”<br><br><strong>{source}</strong></div></div>', unsafe_allow_html=True)

section_heading("COMMON QUESTIONS", "A few things to know")
for question, answer in (
    ("Are the hospitals and doctors real?", "No. All providers, ratings, phone numbers, and locations in this demo are fictional sample data."),
    ("Can the symptom guide diagnose me?", "No. It provides basic information and care navigation only. A qualified clinician must assess symptoms."),
    ("How do I make a booking?", "Create or sign in to a patient account, then use Book appointment to choose a hospital, doctor, date, and available time."),
    ("What if I may be having an emergency?", "Do not wait for this app. Contact your local emergency service or go to an emergency department."),
):
    with st.expander(question):
        st.write(answer)

st.divider()
st.caption(f"Medintel · Demonstration only · Sample data refreshed {date.today().strftime('%d %b %Y')} · Not for diagnosis or emergency care")
