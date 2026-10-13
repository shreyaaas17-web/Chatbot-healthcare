import streamlit as st

from utils.db import doctors, hospitals
from utils.maps import render_hospital_map
from utils.ui import setup_page
from data.sample_data import SPECIALTIES

setup_page("Hospitals")
st.title("Explore hospitals")
st.caption("Compare facilities, specialties, and example clinicians. This directory contains fictional demo data.")

pending_search = st.session_state.pop("hospital_search", None)
if pending_search is not None:
    st.session_state["hospital_search_query"] = pending_search
pending_specialty = st.session_state.pop("hospital_specialty", None)
if pending_specialty:
    st.session_state["hospital_specialty_filter"] = pending_specialty
all_hospitals = hospitals()
all_doctors = doctors()
cities = sorted({item["city"] for item in all_hospitals})
filter_cols = st.columns([2, 1, 1, 1, 1])
query = filter_cols[0].text_input("Search name or city", key="hospital_search_query")
selected_cities = filter_cols[1].multiselect("City", cities)
selected_specialty = filter_cols[2].selectbox("Specialty", ["All specialties", *SPECIALTIES], key="hospital_specialty_filter")
minimum_rating = filter_cols[3].selectbox("Minimum rating", ["Any", "4.0+", "4.5+"], index=0)
emergency_only = filter_cols[4].checkbox("Emergency")

filtered = []
for hospital in all_hospitals:
    if selected_cities and hospital["city"] not in selected_cities:
        continue
    if selected_specialty != "All specialties" and selected_specialty not in hospital["specialties"]:
        continue
    if minimum_rating == "4.0+" and hospital["rating"] < 4.0:
        continue
    if minimum_rating == "4.5+" and hospital["rating"] < 4.5:
        continue
    if emergency_only and not hospital["emergency"]:
        continue
    if query:
        query_text = query.casefold()
        hospital_matches = query_text in f"{hospital['name']} {hospital['city']} {hospital['address']}".casefold()
        doctor_matches = any(
            doctor["hospital_id"] == hospital["id"]
            and query_text in f"{doctor['name']} {doctor['specialization']}".casefold()
            for doctor in all_doctors
        )
        if not hospital_matches and not doctor_matches:
            continue
    filtered.append(hospital)

sort_order = st.selectbox("Sort facilities", ["Top rated", "Name A-Z", "City A-Z"])
if sort_order == "Top rated":
    filtered.sort(key=lambda item: item["rating"], reverse=True)
elif sort_order == "Name A-Z":
    filtered.sort(key=lambda item: item["name"])
else:
    filtered.sort(key=lambda item: item["city"])

st.markdown("<div class='sample-banner'>All facilities, ratings, phone numbers, and locations are fictional sample data. Map pins are approximate city markers.</div>", unsafe_allow_html=True)
st.markdown("### Facility map")
render_hospital_map(filtered, key="hospital_directory_map", height=420)
st.markdown(f"### {len(filtered)} facilities")
if not filtered:
    st.info("No facilities match these filters. Try broadening your search.")

for start in range(0, len(filtered), 3):
    columns = st.columns(3, gap="medium")
    for column, hospital in zip(columns, filtered[start:start + 3]):
        with column:
            with st.container(border=True):
                st.subheader(hospital["name"])
                st.write(f"{hospital['city']} · ★ {hospital['rating']:.1f}")
                st.caption(hospital["address"])
                st.write(", ".join(hospital["specialties"]))
                st.caption("Emergency service listed" if hospital["emergency"] else "Emergency service not listed")
                st.button("View facility details", key=f"hospital_detail_{hospital['id']}", on_click=lambda hospital_id=hospital["id"]: st.session_state.update(selected_hospital_id=hospital_id))

selected_id = st.session_state.get("selected_hospital_id")
selected = next((item for item in all_hospitals if item["id"] == selected_id), None)
if selected:
    st.divider()
    st.markdown(f"## {selected['name']}")
    detail_col, map_col = st.columns([1, 1])
    with detail_col:
        st.write(f"**Address:** {selected['address']}, {selected['city']} (sample)")
        st.write(f"**Phone:** {selected['phone']} (placeholder)")
        st.write(f"**Rating:** {selected['rating']:.1f} (sample rating)")
        st.write(f"**Specialties:** {', '.join(selected['specialties'])}")
        st.link_button("Open approximate map directions", f"https://www.google.com/maps/dir/?api=1&destination={selected['lat']},{selected['lng']}")
        if st.button("Book at this hospital", type="primary"):
            st.session_state["booking"] = {"step": 1, "hospital_id": selected["id"]}
            st.switch_page("pages/5_Book_Appointment.py")
    with map_col:
        render_hospital_map([selected], key=f"hospital_detail_map_{selected['id']}", height=300)
    st.markdown("### Clinicians at this sample facility")
    clinicians = doctors(hospital_id=selected["id"])
    cards = st.columns(2)
    for index, doctor in enumerate(clinicians):
        with cards[index % 2]:
            with st.container(border=True):
                st.write(f"**{doctor['name']}** · {doctor['specialization']}")
                st.caption(f"{doctor['qualification']} · {doctor['experience']} years · ₹{doctor['fee']:,.0f} sample fee")
                st.caption("Languages: " + ", ".join(doctor["languages"]))
                if doctor["photo"]:
                    st.image(doctor["photo"], width=110)
