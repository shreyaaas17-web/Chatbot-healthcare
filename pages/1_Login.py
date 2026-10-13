import streamlit as st

from utils.auth import authenticate
from utils.ui import setup_page

setup_page("Sign in")
st.title("Sign in to Medintel")
st.caption("Choose your account type to open the right care workspace.")
role_label = st.radio("I am signing in as", ["Patient", "Doctor"], horizontal=True)
role = role_label.lower()

with st.form("login_form"):
    email = st.text_input("Email address", autocomplete="email")
    password = st.text_input("Password", type="password", autocomplete="current-password")
    submitted = st.form_submit_button("Sign in", type="primary", use_container_width=True)

if submitted:
    with st.spinner("Checking your account..."):
        user = authenticate(email, password, role)
    if user:
        st.session_state["user"] = user
        st.toast("Signed in successfully")
        destination = "pages/9_Patient_Dashboard.py" if role == "patient" else "pages/10_Doctor_Dashboard.py"
        st.switch_page(destination)
    else:
        st.error("We couldn't sign you in with those details. Check your email, password, and account type.")

with st.expander("Forgot your password?"):
    st.info("Password reset email delivery is not configured in this demo. Contact your clinic administrator to reset the account.")

st.markdown("#### Demo sign-in")
st.warning("These shared demo accounts are for testing only. Do not enter real health information.")
demo_patient, demo_doctor = st.columns(2)
with demo_patient:
    st.markdown("**Patient**  \n`patient@medintel.demo`  \n`PatientDemo123!`")
with demo_doctor:
    st.markdown("**Doctor**  \n`doctor@medintel.demo`  \n`DoctorDemo123!`")
st.page_link("pages/2_Register_Patient.py", label="Create a patient account")
st.page_link("pages/3_Register_Doctor.py", label="Register as a doctor")
