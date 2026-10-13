import plotly.graph_objects as go
import streamlit as st

from utils.ui import setup_page

setup_page("Health risk guide")
st.title("Health risk guide")
st.caption("Explore general health factors and practical prevention tips. This is not a validated clinical score.")

with st.form("risk_form"):
    col_a, col_b = st.columns(2)
    age = col_a.slider("Age", 18, 100, 35)
    height_cm = col_a.number_input("Height (cm)", min_value=100.0, max_value=230.0, value=170.0, step=1.0)
    weight_kg = col_b.number_input("Weight (kg)", min_value=25.0, max_value=250.0, value=70.0, step=1.0)
    smoking = col_b.selectbox("Smoking", ["Never", "Former", "Current"])
    family_history = st.multiselect("Family history", ["Heart disease", "Diabetes", "Stroke", "Cancer", "None known"])
    activity = st.selectbox("Typical weekly activity", ["Under 60 minutes", "60–149 minutes", "150+ minutes"])
    submitted = st.form_submit_button("Review general factors", type="primary")

if submitted:
    bmi = weight_kg / ((height_cm / 100) ** 2)
    score = min(100, max(0, (max(0, age - 30) * 0.7) + (15 if bmi >= 30 else 7 if bmi >= 25 else 0) + (18 if smoking == "Current" else 8 if smoking == "Former" else 0) + 8 * sum(item != "None known" for item in family_history) + (12 if activity == "Under 60 minutes" else 5 if activity == "60–149 minutes" else 0)))
    st.session_state["risk_result"] = {"bmi": bmi, "score": int(score), "smoking": smoking, "family_history": family_history, "activity": activity}

result = st.session_state.get("risk_result")
if result:
    left, right = st.columns([1, 1])
    with left:
        st.metric("BMI estimate", f"{result['bmi']:.1f}")
        st.caption("BMI is a rough screening measure and does not account for every person's body composition or health.")
        st.metric("Illustrative factor score", f"{result['score']} / 100")
        st.caption("This score is a simple demonstration formula, not a validated prediction of disease.")
    with right:
        figure = go.Figure(go.Indicator(
            mode="gauge+number", value=result["score"], title={"text": "Illustrative screening factors"},
            gauge={"axis": {"range": [0, 100]}, "bar": {"color": "#315fe8"}, "steps": [
                {"range": [0, 34], "color": "#d9f0e5"}, {"range": [34, 67], "color": "#fff0c2"},
                {"range": [67, 100], "color": "#f6d7d7"},
            ]},
        ))
        figure.update_layout(height=260, margin={"l": 20, "r": 20, "t": 50, "b": 10, "pad": 0})
        st.plotly_chart(figure, use_container_width=True)
    tips = []
    if result["smoking"] != "Never":
        tips.append("Consider discussing smoking cessation support with a qualified clinician.")
    if result["activity"] != "150+ minutes":
        tips.append("Ask a clinician what level of activity is appropriate for you; start gradually if cleared.")
    if result["family_history"] and "None known" not in result["family_history"]:
        tips.append("Share relevant family history at your next routine health visit.")
    if result["bmi"] >= 25:
        tips.append("Discuss weight, nutrition, and other risk factors with a clinician rather than relying on BMI alone.")
    if not tips:
        tips.append("Keep up routine preventive visits and discuss any new or persistent symptoms with a clinician.")
    st.markdown("### General next steps")
    for tip in tips:
        st.write(f"- {tip}")
    st.caption("General education only. This tool does not diagnose, predict an individual outcome, or replace a medical assessment.")
