"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { sampleDoctors, sampleHospitals, suggestSpecialty, type Doctor, type Hospital } from "@/lib/demo-data";

type User = { id: number; role: "patient" | "doctor"; fullName: string };
type Booking = { step: number; hospitalId?: number; doctorId?: number; specialty?: string; concern?: string; date?: string; slot?: string };

export default function BookingWizard({ requestedHospitalId, requestedSpecialty }: { requestedHospitalId: number; requestedSpecialty: string }) {
  const [user,setUser]=useState<User|null>(null);
  const [hospitals,setHospitals]=useState<Hospital[]>(sampleHospitals);
  const [doctors,setDoctors]=useState<Doctor[]>(sampleDoctors);
  const [step,setStep]=useState(1);
  const [concern,setConcern]=useState("");
  const [specialty,setSpecialty]=useState(requestedSpecialty || "General Physician");
  const [hospitalId,setHospitalId]=useState(requestedHospitalId || 0);
  const [doctorId,setDoctorId]=useState(0);
  const [visitDate,setVisitDate]=useState("");
  const [slots,setSlots]=useState<string[]>([]);
  const [timeSlot,setTimeSlot]=useState("");
  const [notes,setNotes]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [appointmentId,setAppointmentId]=useState(0);
  const [sampleMode,setSampleMode]=useState(true);
  useEffect(()=>{
    fetch("/api/auth/me",{cache:"no-store"}).then((r)=>r.json()).then((data)=>setUser(data.user??null)).catch(()=>setUser(null));
    fetch("/api/hospitals").then((r)=>r.json()).then((data)=>{if(Array.isArray(data.hospitals)){setHospitals(data.hospitals);setSampleMode(Boolean(data.sampleMode));}}).catch(()=>{});
    fetch("/api/doctors").then((r)=>r.json()).then((data)=>{if(Array.isArray(data.doctors)){setDoctors(data.doctors.map(normalizeDoctor));}}).catch(()=>{});
    if (requestedSpecialty) setSpecialty(requestedSpecialty);
    const saved=sessionStorage.getItem("medintel_booking");
    if(saved){try{const value=JSON.parse(saved) as Booking;setStep(value.step??1);setHospitalId(value.hospitalId??requestedHospitalId);setDoctorId(value.doctorId??0);setSpecialty(value.specialty??"General Physician");setConcern(value.concern??"");setVisitDate(value.date??"");setTimeSlot(value.slot??"");}catch{sessionStorage.removeItem("medintel_booking");}}
  },[requestedHospitalId,requestedSpecialty]);
  const chosenHospital=hospitals.find((item)=>Number(item.id)===hospitalId);
  const matchedHospitals=hospitals.filter((item)=>item.specialties.includes(specialty));
  const matchedDoctors=doctors.filter((item)=>Number(item.hospitalId)===hospitalId && item.specialization===specialty);
  const chosenDoctor=doctors.find((item)=>Number(item.id)===doctorId);
  const today=new Date().toISOString().slice(0,10);
  const maxDate=useMemo(()=>{const d=new Date();d.setDate(d.getDate()+6);return d.toISOString().slice(0,10);},[]);
  function persist(next: Booking){sessionStorage.setItem("medintel_booking",JSON.stringify(next));}
  function forward(next: Booking){persist(next);setStep(next.step);setError("");}
  async function selectDate(day:string){setVisitDate(day);setSlots([]);setTimeSlot("");setError("");if(!doctorId||!day)return;try{const response=await fetch(`/api/doctors/${doctorId}/availability?date=${encodeURIComponent(day)}`);const data=await response.json();if(!response.ok)throw new Error(data.error??"Could not load open times.");setSlots(data.slots??[]);}catch(reason){setError(reason instanceof Error?reason.message:"Could not load availability.");}}
  async function confirm(){if(!user||user.role!=="patient"){window.location.assign("/login");return;}setBusy(true);setError("");try{const response=await fetch("/api/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorId,visitDate,timeSlot,symptoms:concern,notes})});const data=await response.json();if(!response.ok)throw new Error(data.error??"Booking failed.");setAppointmentId(data.appointmentId);sessionStorage.removeItem("medintel_booking");setStep(6);}catch(reason){setError(reason instanceof Error?reason.message:"Booking failed.");}finally{setBusy(false);}}
  if(step===6)return <div className="form-card"><span className="specialty-icon"><CheckCircle2 /></span><div className="eyebrow">REQUEST RECEIVED</div><h1>Appointment #{appointmentId}</h1><p>Your request is pending clinician confirmation.</p><p><strong>{chosenDoctor?.name}</strong> · {chosenHospital?.name}</p><Link className="btn" href="/dashboard">View patient dashboard</Link></div>;
  return <>
    <div className="booking-steps">{[1,2,3,4,5].map((item,index)=><span key={item} style={{display:"contents"}}><span className={`step-dot ${step>=item?"active":""}`}>{item}</span>{index<4&&<span className="step-line"/>}</span>)}</div>
    {!user && <div className="notice notice-success">You can browse the booking steps as a guest. Sign in as a patient to confirm an appointment. <Link href="/login">Sign in</Link></div>}
    <section className="form-card" style={{width:"100%",margin:"0 auto"}}>
      {step===1&&<><div className="eyebrow">STEP 1 OF 5</div><h1>What kind of care do you need?</h1><p className="muted">Describe the concern to get a specialty suggestion. This is navigation only, not a diagnosis.</p><label className="form-label">Concern or symptoms<textarea className="textarea" maxLength={1000} value={concern} onChange={(event)=>setConcern(event.target.value)} placeholder="Use fictional information only." /></label><label className="form-label">Suggested specialty<select className="select" value={specialty} onChange={(event)=>setSpecialty(event.target.value)}>{["Dermatologist","Neurologist","Cardiologist","Orthopedic","Pediatrician","Gynecologist","ENT","Ophthalmologist","Psychiatrist","Pulmonologist","Gastroenterologist","General Physician"].map((item)=><option key={item}>{item}</option>)}</select></label><div className="inline"><button className="btn" onClick={()=>forward({step:2,specialty: concern ? suggestSpecialty(concern):specialty,concern})}>Choose a facility <ArrowRight size={16}/></button><span className="muted">{concern?`Suggested: ${suggestSpecialty(concern)}`:"Choose a specialty to continue."}</span></div></>}
      {step===2&&<><div className="eyebrow">STEP 2 OF 5</div><h1>Choose a facility</h1><div className="grid">{matchedHospitals.map((item)=><button className={`card facility-choice ${hospitalId===item.id?"chosen":""}`} key={item.id} onClick={()=>setHospitalId(Number(item.id))}><h3>{item.name}</h3><p>{item.city} · ★ {item.rating.toFixed(1)} sample rating</p><p>{item.specialties.join(" · ")}</p></button>)}</div><div className="inline"><button className="btn btn-secondary" onClick={()=>setStep(1)}><ArrowLeft size={16}/> Back</button><button className="btn" disabled={!hospitalId} onClick={()=>forward({step:3,specialty,concern,hospitalId})}>Choose a clinician <ArrowRight size={16}/></button></div></>}
      {step===3&&<><div className="eyebrow">STEP 3 OF 5</div><h1>Choose a clinician</h1><div className="grid">{matchedDoctors.map((item)=><button className={`card facility-choice ${doctorId===item.id?"chosen":""}`} key={item.id} onClick={()=>setDoctorId(Number(item.id))}><h3>{item.name}</h3><p>{item.qualification} · {item.experience} years</p><p>{item.hospitalName ?? chosenHospital?.name} · ★ {item.rating.toFixed(1)} sample rating</p><p>₹{item.fee.toLocaleString("en-IN")} sample fee</p></button>)}</div>{!matchedDoctors.length&&<div className="demo-notice">No listed clinician matches this facility and specialty.</div>}<div className="inline"><button className="btn btn-secondary" onClick={()=>setStep(2)}><ArrowLeft size={16}/> Back</button><button className="btn" disabled={!doctorId} onClick={()=>forward({step:4,specialty,concern,hospitalId,doctorId})}>Choose a date <ArrowRight size={16}/></button></div></>}
      {step===4&&<><div className="eyebrow">STEP 4 OF 5</div><h1>Choose a date and open time</h1><label className="form-label">Appointment date<input className="input" type="date" min={today} max={maxDate} value={visitDate} onChange={(event)=>selectDate(event.target.value)} /></label>{slots.length>0?<div className="slot-grid">{slots.map((slot)=><button type="button" key={slot} className={`slot-option ${timeSlot===slot?"selected":""}`} onClick={()=>setTimeSlot(slot)}>{slot}</button>)}</div>:<p className="muted">{visitDate?"No open times for this date. Choose another day.":"Choose a date to see available times."}</p>}<div className="inline"><button className="btn btn-secondary" onClick={()=>setStep(3)}><ArrowLeft size={16}/> Back</button><button className="btn" disabled={!visitDate||!timeSlot} onClick={()=>forward({step:5,specialty,concern,hospitalId,doctorId,date:visitDate,slot:timeSlot})}>Review booking <ArrowRight size={16}/></button></div></>}
      {step===5&&<><div className="eyebrow">STEP 5 OF 5</div><h1>Review and confirm</h1><div className="card"><h3>{chosenDoctor?.name} · {specialty}</h3><p>{chosenHospital?.name} · {chosenHospital?.city}</p><p>{visitDate} at {timeSlot} · ₹{chosenDoctor?.fee.toLocaleString("en-IN")} sample fee</p></div><label className="form-label">Symptoms or reason for visit<textarea className="textarea" maxLength={2000} value={concern} onChange={(event)=>setConcern(event.target.value)} placeholder="Do not enter real medical details." /></label><label className="form-label">Notes for the clinician<textarea className="textarea" maxLength={2000} value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="Optional fictional notes." /></label><div className="demo-notice">This is a demonstration booking. Do not include real patient information.</div><div className="inline"><button className="btn btn-secondary" onClick={()=>setStep(4)}><ArrowLeft size={16}/> Back</button><button className="btn" disabled={busy||!user||sampleMode} onClick={confirm}>{busy?"Booking…":"Confirm appointment"}</button></div>{sampleMode&&<p className="muted">Add DATABASE_URL in Vercel to enable saved appointments. Sample listings alone cannot book.</p>}</>}
      {error&&<div className="notice notice-error" role="alert" style={{marginTop:12}}>{error}</div>}
    </section>
  </>;
}

function normalizeDoctor(value: Record<string, unknown>): Doctor {
  return { ...(value as unknown as Doctor), id: Number(value.id), hospitalId: Number(value.hospital_id ?? value.hospitalId), hospitalName: String(value.hospital_name ?? value.hospitalName ?? ""), hospitalCity: String(value.hospital_city ?? value.hospitalCity ?? "") };
}
