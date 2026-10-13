"use client";

import Link from "next/link";
import { useState } from "react";
import { diseaseMatches, suggestSpecialty } from "@/lib/health";

export default function DiseaseGuide(){
  const [text,setText]=useState("");
  const [searched,setSearched]=useState(false);
  const matches=diseaseMatches(text);
  const specialty=suggestSpecialty(text);
  const emergency=["chest pain","difficulty breathing","can't breathe","severe bleeding","unconscious","stroke","seizure"].some((term)=>text.toLowerCase().includes(term));
  return <><div className="demo-notice">No trained prediction model was present in the existing project. This page uses transparent keyword rules; it does not produce diagnoses or probabilities.</div><section className="card form-stack"><label className="form-label">What symptoms are you noticing?<textarea className="textarea" maxLength={2000} value={text} onChange={(event)=>setText(event.target.value)} placeholder="For example: sneezing, runny nose, itchy eyes"/></label><button className="btn" onClick={()=>setSearched(true)}>Review possible matches</button></section>{searched&&text.trim()&&<section className="section">{emergency&&<div className="warning-panel"><h2>Possible emergency symptom</h2><p>Seek urgent medical care now. Do not rely on this guide.</p><a className="btn" href="tel:112">Call emergency services (India: 112)</a></div>}<h2>Possible topics to discuss with a clinician</h2>{matches.length?<div className="grid">{matches.slice(0,5).map((item)=><article className="card" key={item.condition}><h3>{item.condition}</h3><p>Matched words: {item.terms.join(", ")}</p></article>)}</div>:<p className="muted">No specific keyword patterns matched. A General Physician can help assess symptoms.</p>}<p><strong>Suggested specialty:</strong> {specialty}</p><p className="muted">Matches are not probabilities, diagnosis, or treatment advice. A qualified clinician must assess symptoms.</p><Link className="btn" href={`/book?specialty=${encodeURIComponent(specialty)}`}>Find a specialist</Link></section>}</>;
}
