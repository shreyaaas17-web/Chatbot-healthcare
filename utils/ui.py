import streamlit as st

from utils.ai import symptom_assessment
from utils.auth import sign_out
from utils.db import init_db
from utils.style import apply_style


def setup_page(title: str, role: str | None = None) -> None:
    st.set_page_config(page_title=f"{title} · Medintel", page_icon="✚", layout="wide")
    init_db()
    apply_style()
    render_sidebar()
    if role and st.session_state.get("user", {}).get("role") != role:
        st.warning("Please sign in with the correct account to continue.")
        st.switch_page("pages/1_Login.py")
        st.stop()


def render_sidebar() -> None:
    user = st.session_state.get("user")
    with st.sidebar:
        st.markdown("## Medintel")
        st.caption("Care, connected")
        if user:
            st.caption(f"Signed in as {user['full_name']} · {user['role']}")
            if st.button("Sign out", use_container_width=True):
                sign_out()
                st.rerun()
        else:
            st.caption("Browse as a guest or sign in from the page list.")
        st.divider()
        with st.expander("Quick symptom guide"):
            with st.form("sidebar_symptom_form"):
                text = st.text_input("What are you experiencing?", key="sidebar_symptom")
                submitted = st.form_submit_button("Get care direction", use_container_width=True)
            if submitted and text.strip():
                result = symptom_assessment(text)
                st.write(f"Suggested specialty: **{result['specialty']}**")
                if result["emergency"]:
                    st.error("Possible emergency symptoms. Seek urgent help now.")
                st.caption("Guidance only, not a diagnosis. A clinician should assess your symptoms.")
            st.page_link("pages/7_AI_Symptom_Checker.py", label="Open full symptom checker")
