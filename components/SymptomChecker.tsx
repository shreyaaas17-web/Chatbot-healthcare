"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Mic, Send, ShieldAlert } from "lucide-react";
import { sampleDoctors, sampleHospitals, type Doctor, type Specialty } from "@/lib/demo-data";

type Assessment={specialty:Specialty;urgency:"low"|"medium"|"high";emergency:boolean;assistantText:string;disclaimer:string;matches:{condition:string;terms:string[]}[]};
type SpeechResult={results:ArrayLike<ArrayLike<{transcript:string}>>};
type Recognition={lang:string;onresult:((event:SpeechResult)=>void)|null;onerror:(()=>void)|null;start:()=>void};

function distance(a:[number,number],b:[number,number]){const r=6371;const p1=a[0]*Math.PI/180,p2=b[0]*Math.PI/180;const dp=(b[0]-a[0])*Math.PI/180,dl=(b[1]-a[1])*Math.PI/180;const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return r*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

export default function SymptomChecker(){
  const [prompt,setPrompt]=useState("");
  const [messages,setMessages]=useState<{role:"user"|"assistant";text:string}[]>([]);
  const [assessment,setAssessment]=useState<Assessment|null>(null);
  const [doctors,setDoctors]=useState<Doctor[]>(sampleDoctors);
  const [location,setLocation]=useState<[number,number]|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const emergencyHospitals=useMemo(()=>{const list=sampleHospitals.filter((hospital)=>hospital.emergency);return location?list.sort((a,b)=>distance(location,[a.lat,a.lng])-distance(location,[b.lat,b.lng])):list;},[location]);
  const recommended=useMemo(()=>{if(!assessment)return[];return doctors.filter((doctor)=>doctor.specialization===assessment.specialty).sort((a,b)=>((b.rating*2+b.experience*.1)-(a.rating*2+a.experience*.1))||(location?distance(location,[a.hospitalLat??0,a.hospitalLng??0])-distance(location,[b.hospitalLat??0,b.hospitalLng??0]):0)).slice(0,5);},[assessment,doctors,location]);
  async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!prompt.trim())return;setError("");setBusy(true);const text=prompt.trim();setMessages((items)=>[...items,{role:"user",text}]);try{const response=await fetch("/api/ai/symptoms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Unable to review symptoms.");setAssessment(data);setMessages((items)=>[...items,{role:"assistant",text:data.assistantText}]);const doctorResponse=await fetch(`/api/doctors?specialty=${encodeURIComponent(data.specialty)}`);const doctorData=await doctorResponse.json();if(Array.isArray(doctorData.doctors))setDoctors(doctorData.doctors.map(normalizeDoctor));}catch(reason){setError(reason instanceof Error?reason.message:"Unable to review symptoms.");}finally{setBusy(false);}}
  function useVoice(){const voiceWindow=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};const Constructor=voiceWindow.SpeechRecognition??voiceWindow.webkitSpeechRecognition;if(!Constructor){setError("Voice input is not supported by this browser. Type symptoms instead.");return;}const recognition=new Constructor();recognition.lang="en-US";recognition.onresult=(event)=>setPrompt(event.results[0][0].transcript);recognition.onerror=()=>setError("Voice input was not available. Type symptoms instead.");recognition.start();}
  function useLocation(){navigator.geolocation?.getCurrentPosition((position)=>setLocation([position.coords.latitude,position.coords.longitude]),()=>setError("Location permission was declined. Recommendations will use specialty, rating, and experience only."),{timeout:8000});}
  function beginBooking(){if(!assessment)return;sessionStorage.setItem("medintel_booking",JSON.stringify({step:1,specialty:assessment.specialty,concern:prompt}));window.location.assign(`/book?specialty=${encodeURIComponent(assessment.specialty)}`);}
  return <>
    <div className="demo-notice">Use fictional details only. Do not include names, phone numbers, or real patient information. Every response is general information, not medical advice.</div>
    <section className="card"><div className="chat-window" aria-live="polite">{messages.map((message,index)=><div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>{message.text}{message.role==="assistant"&&<div className="muted" style={{marginTop:8}}>General information only · not a diagnosis.</div>}</div>)}</div>
      <form className="form-stack" onSubmit={submit}><label className="form-label" htmlFor="symptoms-input">Describe what you are experiencing</label><textarea id="symptoms-input" className="textarea" value={prompt} maxLength={2000} onChange={(event)=>setPrompt(event.target.value)} placeholder="For example: itchy rash for two days. Use fictional details."/><div className="inline"><button className="btn btn-secondary" type="button" onClick={useVoice}><Mic size={16}/> Speak symptoms</button><button className="btn" disabled={busy||!prompt.trim()}>{busy?"Reviewing…":"Get care direction"}<Send size={15}/></button></div></form>
      {error&&<div className="notice notice-error" style={{marginTop:12}}>{error}</div>}
    </section>
    {assessment&&<section className="section">
      {assessment.emergency&&<div className="warning-panel"><h2><ShieldAlert size={19}/> Possible emergency</h2><p>Do not wait for an online response. Contact emergency services or go to an emergency department now.</p><a className="btn" href="tel:112">Call emergency services (India: 112)</a>{emergencyHospitals[0]&&<p>Nearest listed sample facility{location?` by straight-line distance (${distance(location,[emergencyHospitals[0].lat,emergencyHospitals[0].lng]).toFixed(1)} km)`:""}: {emergencyHospitals[0].name}, {emergencyHospitals[0].city}. Verify emergency care independently.</p>}</div>}
      <div className="section-head" style={{marginTop:22}}><div><div className="eyebrow">GENERAL CARE DIRECTION</div><h2>{assessment.specialty} · {assessment.urgency} urgency guide</h2><p>{assessment.assistantText}</p></div></div>
      {assessment.matches.length>0&&<div className="grid">{assessment.matches.map((item)=><article className="card" key={item.condition}><h3>{item.condition}</h3><p>Matched words: {item.terms.join(", ")}</p></article>)}</div>}
      <div className="section-head" style={{marginTop:22}}><div><h2>Suggested clinicians</h2><p className="muted">Sorted by specialty match, sample rating, and experience. Approximate distance is included if you choose to share location.</p></div><button className="btn btn-secondary" onClick={useLocation}>Use my location</button></div>
      <div className="grid">{recommended.map((doctor)=><article className="card" key={doctor.id}><span className="badge">SAMPLE PROFILE</span><h3>{doctor.name}</h3><p>{doctor.specialization} · {doctor.qualification}</p><p>{doctor.hospitalName} · {doctor.hospitalCity}</p><p>★ {doctor.rating.toFixed(1)} sample rating · {doctor.experience} years · ₹{doctor.fee.toLocaleString("en-IN")} sample fee</p>{location&&<p>{distance(location,[doctor.hospitalLat??0,doctor.hospitalLng??0]).toFixed(1)} km straight-line estimate</p>}</article>)}</div>
      <button className="btn" style={{marginTop:16}} onClick={beginBooking}>Find a booking</button>
      <p className="muted">{assessment.disclaimer} A licensed clinician must assess your symptoms.</p>
    </section>}
  </>;
}

function normalizeDoctor(item:Record<string,unknown>):Doctor{return{...(item as unknown as Doctor),id:Number(item.id),hospitalId:Number(item.hospital_id??item.hospitalId),hospitalName:String(item.hospital_name??item.hospitalName??""),hospitalCity:String(item.hospital_city??item.hospitalCity??""),hospitalLat:Number(item.hospital_lat??item.hospitalLat??0),hospitalLng:Number(item.hospital_lng??item.hospitalLng??0)};}
