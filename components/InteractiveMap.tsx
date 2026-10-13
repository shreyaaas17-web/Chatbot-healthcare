"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { Hospital } from "@/lib/demo-data";

export default function InteractiveMap({ hospitals, center, zoom = 5 }: { hospitals: Hospital[]; center?: [number, number]; zoom?: number }) {
  const mapCenter = center ?? [20.6, 78.9];
  return (
    <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={false} className="leaflet-map" bounds={hospitals.length > 1 ? hospitals.map((item) => [item.lat, item.lng]) as [number, number][] : undefined}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {hospitals.map((hospital) => <CircleMarker key={hospital.id ?? hospital.name} center={[hospital.lat, hospital.lng]} radius={9} pathOptions={{ color: hospital.emergency ? "#c43740" : "#315fe8", fillColor: hospital.emergency ? "#c43740" : "#315fe8", fillOpacity: .88 }}>
        <Popup><strong>{hospital.name}</strong><br />{hospital.city}<br />★ {hospital.rating.toFixed(1)} sample rating<br />{hospital.specialties.join(", ")}<br /><span>Illustrative location</span></Popup>
      </CircleMarker>)}
    </MapContainer>
  );
}
