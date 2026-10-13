"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Phone, ShieldAlert, Star } from "lucide-react";
import HospitalMap from "@/components/HospitalMap";
import type { Doctor, Hospital } from "@/lib/demo-data";

export default function HospitalsExplorer({ hospitals, doctors, initialQuery, initialCity, initialSpecialty }: { hospitals: Hospital[]; doctors: Doctor[]; initialQuery: string; initialCity: string; initialSpecialty: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [allHospitals,setAllHospitals]=useState(hospitals);
  const [allDoctors,setAllDoctors]=useState(doctors);
  const [rating, setRating] = useState("0");
  const [emergency, setEmergency] = useState(false);
  const [sort, setSort] = useState("rating");
  const [selected, setSelected] = useState<Hospital | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/hospitals").then((response) => response.json()), fetch("/api/doctors").then((response) => response.json())])
      .then(([hospitalData, doctorData]) => {
        if (!active) return;
        if (Array.isArray(hospitalData.hospitals)) setAllHospitals(hospitalData.hospitals.map((item: Hospital) => ({ ...item, id: Number(item.id) })));
        if (Array.isArray(doctorData.doctors)) setAllDoctors(doctorData.doctors.map((item: Record<string, unknown>) => ({
          ...item,
          id: Number(item.id),
          hospitalId: Number(item.hospital_id ?? item.hospitalId),
          hospitalName: String(item.hospital_name ?? item.hospitalName ?? ""),
          hospitalCity: String(item.hospital_city ?? item.hospitalCity ?? ""),
        } as Doctor)));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  const cities = useMemo(() => [...new Set(allHospitals.map((item) => item.city))].sort(), [allHospitals]);
  const visible = useMemo(() => allHospitals.filter((hospital) => {
    const matchedDoctor = allDoctors.some((doctor) => doctor.hospitalId === hospital.id && `${doctor.name} ${doctor.specialization}`.toLowerCase().includes(query.trim().toLowerCase()));
    const textMatch = !query || `${hospital.name} ${hospital.city} ${hospital.address}`.toLowerCase().includes(query.trim().toLowerCase()) || matchedDoctor;
    return textMatch && (!city || hospital.city === city) && (!specialty || hospital.specialties.includes(specialty)) && hospital.rating >= Number(rating) && (!emergency || hospital.emergency);
  }).sort((a,b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "city" ? a.city.localeCompare(b.city) : b.rating-a.rating), [allHospitals, allDoctors, query, city, specialty, rating, emergency, sort]);
  const specialists = [...new Set(allHospitals.flatMap((item) => item.specialties))].sort();
  function beginBooking(doctor: Doctor) {
    sessionStorage.setItem("medintel_booking", JSON.stringify({ step: 1, concern: "", specialty: doctor.specialization, hospitalId: doctor.hospitalId, doctorId: doctor.id }));
    window.location.assign("/book");
  }
  return <>
    <div className="filter-bar">
      <input className="input" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search facility, clinician, specialty, or city" aria-label="Search care" />
      <select className="select" value={city} onChange={(event)=>setCity(event.target.value)} aria-label="Filter by city"><option value="">All cities</option>{cities.map((item)=><option key={item}>{item}</option>)}</select>
      <select className="select" value={specialty} onChange={(event)=>setSpecialty(event.target.value)} aria-label="Filter by specialty"><option value="">All specialties</option>{specialists.map((item)=><option key={item}>{item}</option>)}</select>
      <select className="select" value={rating} onChange={(event)=>setRating(event.target.value)} aria-label="Minimum rating"><option value="0">Any rating</option><option value="4">4.0+</option><option value="4.5">4.5+</option></select>
    </div>
    <div className="inline" style={{ marginBottom: 14 }}><label className="inline muted"><input type="checkbox" checked={emergency} onChange={(event)=>setEmergency(event.target.checked)} /> Emergency listed</label><label className="inline muted">Sort <select className="select" style={{ width: "auto", minHeight: 36 }} value={sort} onChange={(event)=>setSort(event.target.value)}><option value="rating">Top rated</option><option value="name">Name A-Z</option><option value="city">City A-Z</option></select></label><span className="muted">{visible.length} sample facilities</span></div>
    <HospitalMap hospitals={visible} />
    <section className="section"><div className="hospital-list">{visible.map((hospital)=><article className="hospital-card" key={hospital.id}>
      <div><span className="badge">SAMPLE FACILITY</span>{hospital.emergency && <span className="badge badge-red" style={{ marginLeft: 7 }}><ShieldAlert size={12} /> Emergency listed</span>}<h3>{hospital.name}</h3><div className="inline muted"><span><MapPin size={14} /> {hospital.address}, {hospital.city}</span><span><Star size={14} /> {hospital.rating.toFixed(1)} sample rating</span><span><Phone size={14} /> {hospital.phone}</span></div><p className="muted">{hospital.specialties.join(" · ")}</p></div>
      <div className="inline"><button className="btn btn-secondary" onClick={()=>setSelected(selected?.id===hospital.id?null:hospital)}>Details</button><Link className="btn" href={`/book?hospital=${hospital.id}`}>Book <ArrowRight size={15} /></Link></div>
      {selected?.id===hospital.id && <div className="hospital-detail-panel"><h3>Clinicians</h3><div className="grid">{allDoctors.filter((doctor)=>doctor.hospitalId===hospital.id).map((doctor)=><div className="card" key={doctor.id}><h3>{doctor.name}</h3><p>{doctor.specialization} · {doctor.qualification}</p><p>{doctor.experience} years · ★ {doctor.rating.toFixed(1)} sample rating · ₹{doctor.fee.toLocaleString("en-IN")} sample fee</p><button className="btn btn-quiet" onClick={()=>beginBooking(doctor)}>Book this clinician</button></div>)}</div></div>}
    </article>)}</div>{visible.length===0 && <div className="card">No facilities match those filters. Try a broader search.</div>}</section>
  </>;
}
