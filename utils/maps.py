import folium
import streamlit as st
from streamlit_folium import st_folium


def render_hospital_map(locations: list[dict], key: str, height: int = 440) -> None:
    if not locations:
        st.info("No facilities match these filters.")
        return
    center = [
        sum(float(item["lat"]) for item in locations) / len(locations),
        sum(float(item["lng"]) for item in locations) / len(locations),
    ]
    map_view = folium.Map(location=center, zoom_start=5 if len(locations) > 3 else 12, control_scale=True, tiles="OpenStreetMap")
    for item in locations:
        color = "red" if item["emergency"] else "blue"
        popup = folium.Popup(
            f"<strong>{item['name']}</strong><br>{item['city']}<br>"
            f"Rating: {float(item['rating']):.1f}<br>{', '.join(item['specialties'])}<br>"
            f"{item['phone']}<br><em>Illustrative sample location</em>",
            max_width=300,
        )
        folium.CircleMarker(
            location=[float(item["lat"]), float(item["lng"])],
            popup=popup,
            tooltip=f"{item['name']} · {item['city']}",
            radius=9,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.9,
        ).add_to(map_view)
    if len(locations) > 1:
        map_view.fit_bounds([[float(item["lat"]), float(item["lng"])] for item in locations], padding=(24, 24))
    st_folium(map_view, height=height, use_container_width=True, key=key, returned_objects=[])
