"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";

type Role = "patient" | "doctor" | "admin";

export default function AuthPanel({ mode }: { mode: "login" | Role }) {
  const [role, setRole] = useState<Role>(mode === "doctor" ? "doctor" : "patient");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";
  const destination = role === "admin" ? "/admin/dashboard" : role === "doctor" ? "/doctor/dashboard" : "/dashboard";
  function update(name: string, value: string) { setValues((current) => ({ ...current, [name]: value })); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isLogin && values.password !== values.confirmPassword) return setError("Passwords do not match.");
    if (!isLogin && new TextEncoder().encode(values.password ?? "").length > 72) return setError("Password must be 72 UTF-8 bytes or fewer.");
    setBusy(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : `/api/auth/register/${role}`;
      const payload: Record<string, unknown> = { ...values, role };
      if (!isLogin && role === "patient") {
        payload.gender = values.gender ?? "Prefer not to say";
        payload.bloodGroup = values.bloodGroup ?? "Not known";
        payload.allergies = (values.allergiesText ?? "").split(",").map((item) => item.trim()).filter(Boolean);
        payload.conditions = (values.conditionsText ?? "").split(",").map((item) => item.trim()).filter(Boolean);
        payload.emergencyContactName = values.emergencyContactName ?? "";
        payload.emergencyContactPhone = values.emergencyContactPhone ?? "";
      }
      if (!isLogin && role === "doctor") {
        payload.specialization = values.specialization ?? "General Physician";
        payload.experience = Number(values.experience ?? 5);
        payload.fee = Number(values.fee ?? 500);
        payload.hospitalId = Number(values.hospitalId ?? 0);
        payload.languages = (values.languagesText ?? "").split(",").map((item) => item.trim()).filter(Boolean);
        payload.photoData = values.photoData ?? null;
      }
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Please review the information and try again.");
      window.location.assign(destination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong. Try again.");
    } finally { setBusy(false); }
  }
  function field(name: string, label: string, type = "text", required = true, placeholder = "") {
    return <label className="form-label" key={name}>{label}<input className="input" name={name} type={type} required={required} placeholder={placeholder} value={values[name] ?? ""} onChange={(event) => update(name, event.target.value)} /></label>;
  }
  const strength = (values.password ?? "").length === 0 ? 0 : [/(.{8,})/.test(values.password ?? ""),/[a-z]/.test(values.password ?? ""),/[A-Z]/.test(values.password ?? ""),/[0-9]/.test(values.password ?? ""),/[^A-Za-z0-9]/.test(values.password ?? "")].filter(Boolean).length;
  return <section className="form-card">
    <div className="eyebrow">MEDINTEL ACCOUNT</div>
    <h1>{isLogin ? "Welcome back" : mode === "doctor" ? "Clinician registration" : "Create your patient profile"}</h1>
    <p className="muted">{isLogin ? "Sign in to manage care and appointments." : "Use fictional information only in this demonstration."}</p>
    {isLogin && <div className="segmented" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}} role="group" aria-label="Account type">{(["patient","doctor","admin"] as const).map((item) => <button type="button" key={item} className={role === item ? "active" : ""} onClick={() => setRole(item)}>{item === "patient" ? "Patient" : item === "doctor" ? "Doctor" : "Admin"}</button>)}</div>}
    <form className="form-stack" onSubmit={submit}>
      {!isLogin && <>{field("fullName","Full name")}{field("email","Email address","email")}{field("phone","Phone number","tel",true,"+91 98765 43210")}</>}
      {isLogin && <>{field("email","Email address","email")}{field("password","Password","password")}</>}
      {!isLogin && role === "patient" && <>
        <div className="form-row">{field("dob","Date of birth","date")}{<label className="form-label">Gender<select className="select" value={values.gender ?? "Prefer not to say"} onChange={(event) => update("gender",event.target.value)}><option>Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></label>}</div>
        <label className="form-label">Blood group<select className="select" value={values.bloodGroup ?? "Not known"} onChange={(event) => update("bloodGroup",event.target.value)}>{["Not known","A+","A-","B+","B-","AB+","AB-","O+","O-"].map((item)=><option key={item}>{item}</option>)}</select></label>
        <label className="form-label">Known allergies <input className="input" placeholder="Comma separated, or none known" value={values.allergiesText ?? ""} onChange={(event)=>update("allergiesText",event.target.value)} /></label>
        <label className="form-label">Existing conditions <input className="input" placeholder="Comma separated, or none known" value={values.conditionsText ?? ""} onChange={(event)=>update("conditionsText",event.target.value)} /></label>
        <div className="form-row">{field("emergencyContactName","Emergency contact", "text",false)}{field("emergencyContactPhone","Emergency phone","tel",false)}</div>
      </>}
      {!isLogin && role === "doctor" && <DoctorFields field={field} values={values} update={update} />}
      {!isLogin && <>
        {field("password","Password","password")}
        <div className="muted">Password strength: {strength < 3 ? "Weak" : strength < 5 ? "Fair" : "Strong"}<progress value={strength} max={5} style={{ display:"block",width:"100%" }} /></div>
        {field("confirmPassword","Confirm password","password")}
        <label className="inline muted"><input required type="checkbox" /> I understand this is a demo; all provider and health details are fictional.</label>
      </>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Please wait…" : isLogin ? "Sign in" : `Create ${role} account`}</button>
    </form>
    {isLogin ? <>
      <details className="card" style={{ marginTop:"1rem" }}><summary>Forgot your password?</summary><p>Reset email is not configured in this demo. Contact the clinic administrator to reset an account.</p></details>
      <div className="demo-notice"><strong>Demo patient:</strong> patient@medintel.demo · PatientDemo123!<br /><strong>Demo doctor:</strong> doctor@medintel.demo · DoctorDemo123! Do not enter real health information.</div>
      <div className="form-footer"><Link href="/register/patient">Create a patient account</Link><Link href="/register/doctor">Register as a doctor</Link></div>
    </> : <div className="form-footer"><span>Already registered?</span><Link href="/login">Sign in</Link></div>}
  </section>;
}

function DoctorFields({ field, values, update }: { field: (name:string,label:string,type?:string,required?:boolean,placeholder?:string)=>ReactElement; values:Record<string,string>; update:(name:string,value:string)=>void }) {
  const [hospitals,setHospitals]=useState<{id:number;name:string;city:string}[]>([]);
  const [photoData,setPhotoData]=useState("");
  useEffect(() => {
    fetch("/api/hospitals").then((response)=>response.json()).then((data)=>setHospitals(data.hospitals ?? [])).catch(()=>setHospitals([]));
  }, []);
  function onPhoto(file?: File) {
    if (!file) return;
    if (file.size > 650_000) { update("photoError","Choose an image below 650 KB."); return; }
    const reader = new FileReader(); reader.onload = () => { const value = String(reader.result ?? ""); setPhotoData(value); update("photoData", value); }; reader.readAsDataURL(file);
  }
  return <>
    <label className="form-label">Specialization<select className="select" value={values.specialization ?? "General Physician"} onChange={(event)=>update("specialization",event.target.value)}>{["Dermatologist","Neurologist","Cardiologist","Orthopedic","Pediatrician","Gynecologist","ENT","Ophthalmologist","Psychiatrist","Pulmonologist","Gastroenterologist","General Physician"].map((item)=><option key={item}>{item}</option>)}</select></label>
    {field("qualification","Qualification","text",true,"MBBS, MD")}{field("licenseNumber","Medical license number","text",true,"Not verified by this demo")}
    <div className="form-row"><label className="form-label">Years of experience<input className="input" type="number" min={0} max={50} value={values.experience ?? "5"} onChange={(event)=>update("experience",event.target.value)} /></label>{field("fee","Consultation fee (INR)","number",true,"500")}</div>
    <label className="form-label">Hospital<select className="select" value={values.hospitalId ?? ""} onChange={(event)=>update("hospitalId",event.target.value)}><option value="">Choose a sample facility</option>{hospitals.map((hospital)=><option value={hospital.id} key={hospital.id}>{hospital.name} · {hospital.city}</option>)}</select></label>
    <label className="form-label">Languages<input className="input" placeholder="English, Hindi" value={values.languagesText ?? ""} onChange={(event)=>update("languagesText",event.target.value)} /></label>
    <label className="form-label">Short bio<textarea className="textarea" maxLength={1200} value={values.bio ?? ""} onChange={(event)=>update("bio",event.target.value)} /></label>
    <label className="form-label">Profile photo<input className="input" type="file" accept="image/png,image/jpeg" onChange={(event)=>onPhoto(event.target.files?.[0])} /></label>
    {photoData && <img src={photoData} alt="Clinician photo preview" width={100} height={100} style={{ objectFit:"cover",borderRadius:8 }} />}
    {values.photoError && <span className="notice notice-error">{values.photoError}</span>}
  </>;
}
