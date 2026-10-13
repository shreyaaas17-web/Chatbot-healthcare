import html
import os
from datetime import date

import pandas as pd
import requests
import streamlit as st
from streamlit.errors import StreamlitSecretNotFoundError


def get_setting(name: str, default: str) -> str:
    try:
        return str(st.secrets.get(name, os.getenv(name, default)))
    except StreamlitSecretNotFoundError:
        return os.getenv(name, default)


API = get_setting("MEDINTEL_API_URL", "http://127.0.0.1:8000").rstrip("/")
st.set_page_config(page_title="Medintel", layout="wide")


def apply_app_theme() -> None:
        st.markdown(
                """
                <style>
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
                :root { --ink: #183a34; --muted: #61746e; --teal: #287768; --line: #dce7e1; --surface: #ffffff; }
                .stApp { background-color: #f3f7f4; background-image: repeating-linear-gradient(135deg, rgba(40,119,104,.025) 0, rgba(40,119,104,.025) 1px, transparent 1px, transparent 14px); color: var(--ink); }
                [data-testid="stHeader"] { background: rgba(243,247,244,.88); }
                [data-testid="stSidebar"] { background: #eaf2ed; border-right: 1px solid var(--line); }
                .block-container { max-width: 1440px; padding-top: 1.8rem; padding-bottom: 3rem; }
                h1, h2, h3 { font-family: 'Manrope', sans-serif; color: var(--ink); letter-spacing: 0; }
                p, label, input, textarea, button { font-family: 'DM Sans', sans-serif; }
                [data-testid="stTabs"] button { color: var(--muted); font-weight: 600; }
                [data-testid="stTabs"] button[aria-selected="true"] { color: var(--teal); border-bottom-color: var(--teal); }
                [data-testid="stMetric"] { min-height: 112px; padding: 1rem 1.1rem; background: var(--surface); border: 1px solid var(--line); border-top: 3px solid var(--teal); border-radius: 7px; }
                [data-testid="stMetricLabel"] { color: var(--muted); }
                [data-testid="stMetricValue"] { color: var(--ink); font-family: 'Manrope', sans-serif; }
                [data-testid="stDataFrame"] { border: 1px solid var(--line); border-radius: 7px; overflow: hidden; }
                [data-testid="stForm"] { padding: 1rem; background: rgba(255,255,255,.82); border: 1px solid var(--line); border-radius: 7px; }
                .workspace-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.25rem 1.4rem; margin: .5rem 0 1.25rem; background: #fff; border: 1px solid var(--line); border-left: 5px solid var(--teal); border-radius: 7px; }
                .workspace-kicker { color: var(--teal); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                .workspace-title { margin-top: .25rem; color: var(--ink); font-family: 'Manrope', sans-serif; font-size: 1.65rem; font-weight: 800; line-height: 1.2; }
                .workspace-subtitle { margin-top: .35rem; color: var(--muted); font-size: .95rem; }
                .workspace-role { flex: 0 0 auto; padding: .45rem .7rem; color: #235f53; background: #e5f1eb; border: 1px solid #cce2d6; border-radius: 5px; font-size: .75rem; font-weight: 700; text-transform: uppercase; }
                @media (max-width: 640px) { .workspace-header { align-items: flex-start; flex-direction: column; } .workspace-title { font-size: 1.4rem; } }
                </style>
                """,
                unsafe_allow_html=True,
        )


def workspace_header(user: dict, role_label: str, subtitle: str) -> None:
        name = html.escape(str(user.get("full_name", "there")).split()[0])
        st.markdown(
                f"""
                <section class="workspace-header">
                    <div>
                        <div class="workspace-kicker">Medintel care workspace</div>
                        <div class="workspace-title">Welcome back, {name}</div>
                        <div class="workspace-subtitle">{subtitle}</div>
                    </div>
                    <span class="workspace-role">{role_label}</span>
                </section>
                """,
                unsafe_allow_html=True,
        )


apply_app_theme()


def api(method: str, path: str, **kwargs) -> requests.Response:
    headers = kwargs.pop("headers", {})
    if st.session_state.get("token"):
        headers["Authorization"] = f"Bearer {st.session_state.token}"
    try:
        response = requests.request(
            method, API + path, headers=headers, timeout=90, **kwargs
        )
    except requests.RequestException:
        st.error("Backend not running. Start it with: python -m uvicorn main:app --reload")
        st.stop()
    if response.status_code == 401 and st.session_state.get("token"):
        st.session_state.clear()
        st.warning("Your session expired. Please sign in again.")
        st.rerun()
    return response


def response_data(response: requests.Response) -> dict | list | None:
    try:
        return response.json()
    except requests.JSONDecodeError:
        return None


def show_error(response: requests.Response) -> None:
    data = response_data(response)
    detail = data.get("detail", "Request failed") if isinstance(data, dict) else "Request failed"
    if isinstance(detail, list):
        detail = "; ".join(item.get("msg", "") for item in detail)
    st.error(str(detail))


def chat_box(key: str, endpoint: str, placeholder: str, extra: dict | None = None) -> list:
    history = st.session_state.setdefault(key, [])
    for message in history:
        st.chat_message(message["role"]).write(message["content"])
    if prompt := st.chat_input(placeholder, key=key + "_in"):
        history.append({"role": "user", "content": prompt})
        st.chat_message("user").write(prompt)
        with st.spinner("Thinking..."):
            response = api(
                "POST", endpoint, json={"messages": history, **(extra or {})}
            )
        if response.ok:
            data = response_data(response)
            if not isinstance(data, dict) or "reply" not in data:
                history.pop()
                st.error("The backend returned an invalid response.")
                return history
            if data.get("emergency"):
                st.error("This may be an emergency. Seek urgent medical care now.")
            history.append({"role": "assistant", "content": data["reply"]})
            st.chat_message("assistant").write(data["reply"])
        else:
            show_error(response)
            history.pop()
    return history


def start_session(data: dict) -> None:
    st.session_state.token = data["token"]
    st.session_state.user = data["user"]


def landing_page() -> None:
    st.markdown(
        """
        <style>
        .stApp { background: #fff; color: #101828; }
        [data-testid="stHeader"] { background: rgba(255,255,255,.92); }
        .block-container { max-width: 1380px; padding-top: 1.2rem; }
        h1, h2, h3 { font-family: 'Manrope', sans-serif; color: #111827; letter-spacing: 0; }
        .hero-copy { padding: 1.5rem 0; }
        .eyebrow, .section-kicker { color: #315fe8; font-size: .76rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .hero-title { max-width: 650px; margin: .6rem 0 1rem; color: #101828; font-family: 'Manrope', sans-serif; font-size: 3.45rem; line-height: 1.06; font-weight: 800; letter-spacing: 0; }
        .hero-title span { color: #315fe8; }
        .hero-subtitle { max-width: 560px; color: #596579; font-size: 1.08rem; line-height: 1.7; }
        .hero-note { color: #667085; font-size: .84rem; margin-top: 1.2rem; }
        .landing-section { padding-top: 2.8rem; }
        .landing-section-title { margin: .25rem 0 .35rem; font-family: 'Manrope', sans-serif; font-size: 1.75rem; font-weight: 800; color: #101828; }
        .landing-section-copy { margin-bottom: 1rem; color: #667085; font-size: .95rem; }
        .doctor-card, .hospital-card { min-height: 132px; padding: 1rem 1.1rem; background: #fff; border: 1px solid #e3e8ef; border-radius: 7px; }
        .doctor-name, .hospital-name { color: #101828; font-family: 'Manrope', sans-serif; font-size: 1.02rem; font-weight: 700; }
        .doctor-detail, .hospital-detail { color: #596579; font-size: .88rem; line-height: 1.55; }
        .demo-label { display: inline-block; margin-top: .65rem; padding: .22rem .5rem; color: #315fe8; background: #edf2ff; border-radius: 4px; font-size: .69rem; font-weight: 700; }
        .hospital-card { min-height: 106px; margin-bottom: .65rem; padding: .85rem 1rem; border-left: 3px solid #315fe8; }
        @media (max-width: 640px) { .hero-title { font-size: 2.25rem; } .landing-section-title { font-size: 1.5rem; } }
        [data-testid="stTabs"] button { color: #526761; }
        [data-testid="stTabs"] button[aria-selected="true"] { color: #315fe8; }
        </style>
        """,
        unsafe_allow_html=True,
    )

    hero_text, hero_image = st.columns([1.12, 0.88], vertical_alignment="center")
    with hero_text:
        st.markdown(
            """
            <div class="hero-copy">
                            <div class="eyebrow">MEDINTEL · CARE, CONNECTED</div>
                            <div class="hero-title">Better care starts <span>before you arrive.</span></div>
                            <div class="hero-subtitle">Find a care team, keep appointments organized, and bring the right context into every conversation.</div>
                            <div class="hero-note">A clinic coordination demo. Sample doctors and facilities below are fictional; clinical decisions stay with licensed professionals.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with hero_image:
        st.image(
            "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85",
            use_container_width=True,
        )

    st.markdown('<div class="landing-section">', unsafe_allow_html=True)
    st.markdown('<div class="section-kicker">CARE NEAR YOU · SAMPLE DIRECTORY</div>', unsafe_allow_html=True)
    st.markdown('<div class="landing-section-title">Explore the care network</div>', unsafe_allow_html=True)
    st.markdown('<div class="landing-section-copy">Illustrative facilities around Kolhapur. These are demo listings, not real providers.</div>', unsafe_allow_html=True)
    hospitals = pd.DataFrame(
        [
            {"name": "Central Care Hospital", "specialty": "General medicine", "area": "Central Kolhapur · Sample location", "lat": 16.7050, "lon": 74.2433},
            {"name": "Lakeview Heart Centre", "specialty": "Cardiology", "area": "Shahupuri · Sample location", "lat": 16.7108, "lon": 74.2356},
            {"name": "Greenway Family Clinic", "specialty": "Primary care", "area": "Rajarampuri · Sample location", "lat": 16.6907, "lon": 74.2481},
            {"name": "Children's Care Pavilion", "specialty": "Pediatrics", "area": "Tarabai Park · Sample location", "lat": 16.6992, "lon": 74.2597},
        ]
    )
    selected_specialty = st.selectbox(
        "Filter by care type",
        ["All facilities", *sorted(hospitals["specialty"].unique())],
        key="sample_hospital_filter",
    )
    visible_hospitals = (
        hospitals
        if selected_specialty == "All facilities"
        else hospitals[hospitals["specialty"] == selected_specialty]
    )
    map_column, directory_column = st.columns([1.15, 0.85], gap="large")
    with map_column:
        st.map(
            visible_hospitals,
            latitude="lat",
            longitude="lon",
            color="#315fe8",
            size=260,
            zoom=12,
            use_container_width=True,
        )
        st.caption("Map pins are approximate demo markers, not verified facility addresses.")
    with directory_column:
        for _, hospital in visible_hospitals.iterrows():
            st.markdown(
                f"""
                <div class="hospital-card">
                  <div class="hospital-name">{hospital['name']}</div>
                  <div class="hospital-detail"><strong>{hospital['specialty']}</strong><br>{hospital['area']}</div>
                  <span class="demo-label">SAMPLE FACILITY</span>
                </div>
                """,
                unsafe_allow_html=True,
            )
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="landing-section">', unsafe_allow_html=True)
    st.markdown('<div class="section-kicker">MEET THE CARE TEAM</div>', unsafe_allow_html=True)
    st.markdown('<div class="landing-section-title">Sample clinicians</div>', unsafe_allow_html=True)
    st.markdown('<div class="landing-section-copy">Fictional profiles for preview only. They are not available for booking.</div>', unsafe_allow_html=True)
    doctors = [
        {
            "name": "Dr. Maya Chen",
            "specialty": "Family Medicine",
            "detail": "Primary care · 12 years experience",
            "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=640&h=520&q=80",
        },
        {
            "name": "Dr. Daniel Okafor",
            "specialty": "Cardiology",
            "detail": "Heart health · 15 years experience",
            "image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=640&h=520&q=80",
        },
        {
            "name": "Dr. Sofia Martinez",
            "specialty": "Pediatrics",
            "detail": "Children's health · 9 years experience",
            "image": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=640&h=520&q=80",
        },
        {
            "name": "Dr. Aanya Kulkarni",
            "specialty": "Neurology",
            "detail": "Neurological care · 11 years experience",
            "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=640&h=520&q=80",
        },
        {
            "name": "Dr. Rehan Mehta",
            "specialty": "Orthopedics",
            "detail": "Bone and joint care · 13 years experience",
            "image": "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?auto=format&fit=crop&w=640&h=520&q=80",
        },
        {
            "name": "Dr. Leela Nair",
            "specialty": "Dermatology",
            "detail": "Skin health · 8 years experience",
            "image": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=640&h=520&q=80",
        },
    ]
    for group_start in range(0, len(doctors), 3):
        columns = st.columns(3, gap="medium")
        for column, doctor in zip(columns, doctors[group_start : group_start + 3]):
            with column:
                st.image(doctor["image"], use_container_width=True)
                st.markdown(
                    f"""
                    <div class="doctor-card">
                      <div class="doctor-name">{doctor['name']}</div>
                      <div class="doctor-detail"><strong>{doctor['specialty']}</strong><br>{doctor['detail']}</div>
                      <span class="demo-label">SAMPLE PROFILE</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
    st.markdown("</div>", unsafe_allow_html=True)

def login_page() -> None:
    st.title("Welcome to Medintel")
    st.caption("Sign in or create an account to continue.")
    login_tab, register_tab = st.tabs(["Login", "Register"])
    with login_tab:
        with st.form("login"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            if st.form_submit_button("Login"):
                response = api(
                    "POST",
                    "/auth/login",
                    json={"username": username, "password": password},
                )
                if response.ok:
                    start_session(response.json())
                    st.rerun()
                else:
                    show_error(response)
    landing_page()
    with register_tab:
        with st.form("register"):
            name = st.text_input("Full name")
            username = st.text_input("Username")
            password = st.text_input("Password (min 8 chars)", type="password")
            role = st.selectbox("I am a", ["patient", "doctor"])
            invite_code = st.text_input("Doctor invite code (doctors only)", type="password")
            if st.form_submit_button("Create account"):
                response = api(
                    "POST",
                    "/auth/register",
                    json={
                        "username": username,
                        "password": password,
                        "full_name": name,
                        "role": role,
                        "invite_code": invite_code,
                    },
                )
                if response.ok:
                    start_session(response.json())
                    st.rerun()
                else:
                    show_error(response)


def patient_view() -> None:
    appointments_response = api("GET", "/appointments")
    appointments = appointments_response.json() if appointments_response.ok else []
    upcoming = [item for item in appointments if item["day"] >= date.today().isoformat()]
    next_visit = min(upcoming, key=lambda item: (item["day"], item["slot"])) if upcoming else None
    metric_columns = st.columns(3)
    metric_columns[0].metric("Upcoming appointments", len(upcoming))
    metric_columns[1].metric(
        "Next visit", next_visit["day"] if next_visit else "Not scheduled"
    )
    metric_columns[2].metric(
        "Care team", next_visit.get("doctor") or "Choose a doctor" if next_visit else "Ready to book"
    )
    if not appointments_response.ok:
        show_error(appointments_response)

    tabs = st.tabs(["My Profile", "Appointments", "Chat", "My Records"])
    with tabs[0]:
        response = api("GET", "/profile/me")
        if not response.ok:
            show_error(response)
        else:
            profile = response.json()
            with st.form("profile"):
                age = st.number_input("Age", 0, 120, int(profile["age"] or 0))
                sexes = ["", "Female", "Male", "Other"]
                current_sex = profile["sex"] or ""
                sex = st.selectbox(
                    "Sex", sexes, index=sexes.index(current_sex) if current_sex in sexes else 0
                )
                allergies = st.text_area("Allergies", profile["allergies"] or "")
                conditions = st.text_area(
                    "Existing conditions", profile["conditions"] or ""
                )
                medicines = st.text_area(
                    "Current medicines (comma separated)", profile["medicines"] or ""
                )
                if st.form_submit_button("Save"):
                    result = api(
                        "PUT",
                        "/profile/me",
                        json={
                            "age": int(age) or None,
                            "sex": sex,
                            "allergies": allergies,
                            "conditions": conditions,
                            "medicines": medicines,
                        },
                    )
                    if result.ok:
                        st.success("Saved.")
                    else:
                        show_error(result)

    with tabs[1]:
        doctors_response = api("GET", "/doctors")
        if doctors_response.ok:
            doctors = doctors_response.json()
            if not doctors:
                st.info("No doctors have registered yet. Please check back later.")
            else:
                doctor_options = {
                    f"{doctor['full_name']} (#{doctor['id']})": doctor["id"]
                    for doctor in doctors
                }
                doctor_column, date_column = st.columns(2)
                doctor_label = doctor_column.selectbox(
                    "Doctor", list(doctor_options)
                )
                day = date_column.date_input("Date", min_value=date.today())
                availability_response = api(
                    "GET",
                    f"/doctors/{doctor_options[doctor_label]}/availability",
                    params={"day": str(day)},
                )
                if not availability_response.ok:
                    show_error(availability_response)
                elif not availability_response.json()["slots"]:
                    st.info("No appointments are available on this date. Choose another day.")
                else:
                    slots = availability_response.json()["slots"]
                    with st.form("book"):
                        slot = st.selectbox("Available time", slots)
                        reason = st.text_input("What would you like help with?")
                        if st.form_submit_button("Book appointment"):
                            response = api(
                                "POST",
                                "/appointments",
                                json={
                                    "doctor_id": doctor_options[doctor_label],
                                    "day": str(day),
                                    "slot": slot,
                                    "reason": reason,
                                },
                            )
                            if response.ok:
                                st.success("Appointment booked.")
                                st.rerun()
                            else:
                                show_error(response)
        else:
            show_error(doctors_response)
        if appointments_response.ok:
            if appointments:
                st.dataframe(appointments, use_container_width=True, hide_index=True)
            else:
                st.info("No appointments yet. Choose a doctor and date above to book your first visit.")
        else:
            show_error(appointments_response)
        appointment_id = st.number_input("Cancel appointment ID", min_value=0, step=1)
        if st.button("Cancel appointment") and appointment_id:
            response = api("DELETE", f"/appointments/{int(appointment_id)}")
            if response.ok:
                st.rerun()
            else:
                show_error(response)

    with tabs[2]:
        history = chat_box("p_chat", "/chat/patient", "Describe your symptoms...")
        if history and st.button("Send summary to my doctor"):
            response = api("POST", "/intakes", json={"messages": history})
            if response.ok:
                st.success("Summary sent to your doctor.")
                st.write(response.json()["summary"])
            else:
                show_error(response)

    with tabs[3]:
        response = api("GET", "/notes/me")
        if response.ok:
            notes = response.json()
            if not notes:
                st.info("No records yet.")
            for note in notes:
                with st.expander(f"{note['ts'][:10]}: {note['diagnosis']}"):
                    st.write(f"**Prescription:** {note['prescription'] or '-'}")
                    st.write(f"**Advice:** {note['advice'] or '-'}")
        else:
            show_error(response)


def doctor_view() -> None:
    patient_response = api("GET", "/patients")
    patients = {}
    if patient_response.ok:
        patients = {
            f"{patient['full_name']} (#{patient['id']})": patient["id"]
            for patient in patient_response.json()
        }
    else:
        show_error(patient_response)
    appointments_response = api("GET", "/appointments")
    appointments = appointments_response.json() if appointments_response.ok else []
    today = date.today().isoformat()
    today_count = sum(item["day"] == today for item in appointments)
    upcoming_count = sum(item["day"] >= today for item in appointments)
    metric_columns = st.columns(3)
    metric_columns[0].metric("Visits today", today_count)
    metric_columns[1].metric("Upcoming visits", upcoming_count)
    metric_columns[2].metric(
        "Registered patients", len(patient_response.json()) if patient_response.ok else 0
    )
    if not appointments_response.ok:
        show_error(appointments_response)
    tabs = st.tabs(["Schedule", "Patients", "Doctor Assist", "Medication Check", "Audit"])

    with tabs[0]:
        if appointments_response.ok:
            if appointments:
                st.dataframe(appointments, use_container_width=True, hide_index=True)
            else:
                st.info("Your schedule is clear. New bookings will appear here.")
        else:
            show_error(appointments_response)
        appointment_id = st.number_input(
            "Cancel appointment ID", min_value=0, step=1, key="doctor_cancel"
        )
        if st.button("Cancel appointment", key="doctor_cancel_button") and appointment_id:
            response = api("DELETE", f"/appointments/{int(appointment_id)}")
            if response.ok:
                st.rerun()
            else:
                show_error(response)

    with tabs[1]:
        if not patients:
            st.info("No patients registered yet.")
        else:
            label = st.selectbox("Patient", list(patients), key="pt_sel")
            response = api("GET", f"/patients/{patients[label]}")
            if response.ok:
                data = response.json()
                st.write("**Profile**", data["profile"])
                st.write("**Intake summaries**")
                for intake in data["intakes"]:
                    st.info(f"{intake['ts'][:10]}: {intake['summary']}")
                st.write("**Past notes**")
                for note in data["notes"]:
                    st.write(
                        f"{note['ts'][:10]}: {note['diagnosis']} | "
                        f"Rx: {note['prescription'] or '-'}"
                    )
            else:
                show_error(response)

    with tabs[2]:
        if not patients:
            st.info("No patients registered yet.")
        else:
            label = st.selectbox("Patient", list(patients), key="da_sel")
            patient_id = patients[label]
            history = chat_box(
                f"d_chat_{patient_id}",
                "/chat/doctor",
                "e.g. fever 3 days, dry cough...",
                {"patient_id": patient_id},
            )
            last_ai = next(
                (
                    message["content"]
                    for message in reversed(history)
                    if message["role"] == "assistant"
                ),
                "",
            )
            if last_ai:
                with st.form(f"note_{patient_id}"):
                    st.write("**Save your final decision**")
                    diagnosis = st.text_input("Diagnosis")
                    prescription = st.text_area("Prescription")
                    advice = st.text_area("Advice")
                    if st.form_submit_button("Save note"):
                        response = api(
                            "POST",
                            "/notes",
                            json={
                                "patient_id": patient_id,
                                "diagnosis": diagnosis,
                                "prescription": prescription,
                                "advice": advice,
                                "ai_suggestion": last_ai,
                            },
                        )
                        if response.ok:
                            st.success("Saved.")
                        else:
                            show_error(response)

    with tabs[3]:
        if not patients:
            st.info("No patients registered yet.")
        else:
            label = st.selectbox("Patient", list(patients), key="mc_sel")
            medicines = st.text_area("Proposed medicines (one per line)")
            if st.button("Run safety check"):
                medicine_list = [
                    medicine.strip()
                    for medicine in medicines.splitlines()
                    if medicine.strip()
                ]
                if not medicine_list:
                    st.warning("Enter at least one medicine.")
                else:
                    response = api(
                        "POST",
                        "/doctor/medication-check",
                        json={
                            "patient_id": patients[label],
                            "medicines": medicine_list,
                        },
                    )
                    if response.ok:
                        result = response.json()
                        if result["rule_alerts"]:
                            for alert in result["rule_alerts"]:
                                st.error(alert)
                        else:
                            st.success("No matches in the built-in rule table.")
                        st.markdown(result["ai_review"])
                    else:
                        show_error(response)

    with tabs[4]:
        response = api("GET", "/audit")
        if response.ok:
            st.dataframe(response.json(), use_container_width=True)
        else:
            show_error(response)


if "token" not in st.session_state:
    login_page()
    st.stop()

user = st.session_state.get("user")
if not isinstance(user, dict) or "role" not in user:
    st.session_state.clear()
    st.rerun()

st.sidebar.write(f"**{user['full_name']}** ({user['role']})")
if st.sidebar.button("Logout"):
    st.session_state.clear()
    st.rerun()

if user["role"] == "patient":
    workspace_header(
        user,
        "Patient",
        "Your appointments, health profile, and care conversations in one place.",
    )
    patient_view()
else:
    workspace_header(
        user,
        "Clinician",
        "Review your schedule and support patient care. A licensed doctor makes all clinical decisions.",
    )
    doctor_view()
