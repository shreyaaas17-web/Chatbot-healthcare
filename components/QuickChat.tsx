"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { suggestSpecialty } from "@/lib/demo-data";

const emergencyTerms=["chest pain","difficulty breathing","can't breathe","cannot breathe","severe bleeding","unconscious","stroke","seizure"];

export default function QuickChat(){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState("");
  const [answer,setAnswer]=useState("");
  const emergency=emergencyTerms.some((term)=>text.toLowerCase().includes(term));
  function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!text.trim())return;setAnswer(emergency?"Possible emergency symptoms detected. Do not wait for this app; contact local emergency services now.":`A ${suggestSpecialty(text)} may be a useful place to start. This guide cannot diagnose symptoms.`);}
  return <>
    {open&&<section className="chat-panel" aria-label="Quick care guide"><div className="inline" style={{justifyContent:"space-between"}}><strong>Quick care guide</strong><button className="btn btn-quiet" onClick={()=>setOpen(false)} aria-label="Close quick guide"><X size={16}/></button></div><p className="muted">General navigation only. Use fictional details.</p><form onSubmit={submit} className="form-stack"><input className="input" value={text} onChange={(event)=>setText(event.target.value)} placeholder="Describe a symptom"/><button className="btn">Get care direction</button></form>{answer&&<div className={emergency?"warning-panel":"notice notice-success"} style={{marginTop:12}}>{answer}{emergency&&<p><a href="tel:112">Call emergency services (India: 112)</a></p>}<p><Link href="/symptoms">Open full symptom guide</Link></p></div>}</section>}
    <button className="btn chat-launcher" onClick={()=>setOpen(!open)} aria-label={open?"Close quick care guide":"Open quick care guide"}>{open?<X size={18}/>:<MessageCircle size={18}/>}<span>Care guide</span></button>
  </>;
}
