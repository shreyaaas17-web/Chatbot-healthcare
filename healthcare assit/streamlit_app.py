import os

import requests
import streamlit as st

API = os.getenv("MEDINTEL_API_URL", "http://127.0.0.1:8000").rstrip("/")
st.set_page_config(page_title="Medintel", layout="wide")


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


def login_page() -> None:
    st.title("Medintel")
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
        with st.form("book"):
            date_column, time_column, reason_column = st.columns(3)
            day = date_column.date_input("Date")
            slot = time_column.time_input("Time")
            reason = reason_column.text_input("Reason")
            if st.form_submit_button("Book"):
                response = api(
                    "POST",
                    "/appointments",
                    json={
                        "day": str(day),
                        "slot": slot.strftime("%H:%M"),
                        "reason": reason,
                    },
                )
                if response.ok:
                    st.success("Booked.")
                else:
                    show_error(response)
        response = api("GET", "/appointments")
        if response.ok:
            st.dataframe(response.json(), use_container_width=True)
        else:
            show_error(response)
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
    tabs = st.tabs(["Schedule", "Patients", "Doctor Assist", "Medication Check", "Audit"])

    with tabs[0]:
        response = api("GET", "/appointments")
        if response.ok:
            st.dataframe(response.json(), use_container_width=True)
        else:
            show_error(response)
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

st.title("Medintel")
st.caption(
    "Decision support only. A licensed doctor must review all diagnoses and prescriptions."
)
if user["role"] == "patient":
    patient_view()
else:
    doctor_view()
