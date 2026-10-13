import streamlit as st

from utils.ai import haversine_km
from utils.db import hospitals
from utils.maps import render_hospital_map
from utils.ui import setup_page

setup_page("Care map")
st.title("Care map")
st.caption("Browse illustrative sample facilities. All markers are approximate city-centre locations.")
locations = hospitals()

if st.button("Use my location", type="primary"):
    st.session_state["request_geolocation"] = True
if st.session_state.get("request_geolocation"):
    try:
        from streamlit_js_eval import get_geolocation
        result = get_geolocation(component_key="medintel_geolocation")
        if isinstance(result, dict) and isinstance(result.get("coords"), dict):
            coords = result["coords"]
            st.session_state["user_location"] = (float(coords["latitude"]), float(coords["longitude"]))
            st.session_state["request_geolocation"] = False
            st.toast("Your location is available for this session")
        elif isinstance(result, dict) and result.get("error"):
            st.warning("Location was unavailable or permission was declined. You can still browse by city.")
            st.session_state["request_geolocation"] = False
    except Exception:
        st.warning("Location lookup is unavailable in this browser. You can still browse by city.")
        st.session_state["request_geolocation"] = False

user_location = st.session_state.get("user_location")
if user_location:
    for item in locations:
        item["distance_km"] = haversine_km(user_location[0], user_location[1], item["lat"], item["lng"])
    locations.sort(key=lambda item: item["distance_km"])
    st.info("Nearest sample facilities are listed first. Their pins and contact details are illustrative, not verified.")
    st.write("Approximate location: %.4f, %.4f" % user_location)
else:
    city = st.selectbox("Browse near a city", sorted({item["city"] for item in locations}))
    locations.sort(key=lambda item: item["city"] != city)

render_hospital_map(locations, key="all_hospitals_map", height=560)

st.markdown("### Facilities")
for item in locations:
    distance = f" · {item['distance_km']:.1f} km away" if "distance_km" in item else ""
    left, right = st.columns([4, 1])
    left.markdown(f"**{item['name']}** · {item['city']}{distance}")
    right.link_button("Directions", f"https://www.google.com/maps/dir/?api=1&destination={item['lat']},{item['lng']}")
    st.caption(f"★ {item['rating']:.1f} · {', '.join(item['specialties'])} · {item['phone']} (sample)")
