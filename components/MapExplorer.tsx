"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import HospitalMap from "@/components/HospitalMap";
import { sampleHospitals, type Hospital } from "@/lib/demo-data";

function distanceKm(a:[number,number],b:[number,number]){const r=6371;const p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180;const dp=(b[0]-a[0])*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180;const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

export default function MapExplorer(){
  const [location,setLocation]=useState<[number,number]|null>(null);
  const [city,setCity]=useState("");
  const [error,setError]=useState("");
  const cities=[...new Set(sampleHospitals.map((item)=>item.city))].sort();
  function useLocation(){
    setError("");
    if(!navigator.geolocation){setError("This browser does not provide location access. Browse by city instead.");return;}
    navigator.geolocation.getCurrentPosition((position)=>setLocation([position.coords.latitude,position.coords.longitude]),()=>setError("Location access was declined or unavailable. Browse by city instead."),{timeout:10000,maximumAge:60000});
  }
  const facilities=useMemo(()=>{
    const rows: (Hospital & {distance?:number})[]=sampleHospitals.map((item)=>({...item}));
    if(location){for(const item of rows)item.distance=distanceKm(location,[item.lat,item.lng]);return rows.sort((a,b)=>(a.distance??0)-(b.distance??0));}
    if(city)return rows.filter((item)=>item.city===city);
    return rows;
  },[location,city]);
  const mapCenter=location??(city?([sampleHospitals.find((item)=>item.city===city)?.lat??20.6,sampleHospitals.find((item)=>item.city===city)?.lng??78.9] as [number,number]):undefined);
  return <>
    <div className="inline" style={{marginBottom:14}}><button className="btn" onClick={useLocation}><LocateFixed size={17}/> Use my location</button><label className="form-label" style={{maxWidth:280}}>Browse near a city<select className="select" value={city} onChange={(event)=>{setCity(event.target.value);setLocation(null);}}><option value="">All cities</option>{cities.map((item)=><option key={item}>{item}</option>)}</select></label></div>
    {error&&<div className="notice notice-error" role="alert">{error}</div>}
    {location&&<div className="notice notice-success">Approximate browser location is used only in this tab. Nearest sample facilities are listed first.</div>}
    <div className="demo-notice">Map locations are approximate city-centre sample pins, not verified facility addresses.</div>
    <HospitalMap hospitals={facilities} center={mapCenter} zoom={location?11:5}/>
    <div className="hospital-list" style={{marginTop:16}}>{facilities.map((item)=><article className="hospital-card" key={item.id}><div><h3>{item.name}</h3><div className="muted"><MapPin size={14}/> {item.city}{item.distance!==undefined?` · ${item.distance.toFixed(1)} km away`:""} · ★ {item.rating.toFixed(1)} sample rating</div><p className="muted">{item.specialties.join(" · ")} · {item.phone} (sample)</p></div><Link className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`}>Directions</Link></article>)}</div>
  </>;
}
