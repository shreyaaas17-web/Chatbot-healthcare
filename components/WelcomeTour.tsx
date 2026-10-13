"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

const slides=[
  {title:"Find care that fits",copy:"Explore sample facilities, specialties, and clinicians in one clear directory."},
  {title:"Prepare for a visit",copy:"Use the symptom guide to organize questions and understand when to seek urgent care."},
  {title:"Keep your next steps together",copy:"Create a demo account to request appointments and review your care workspace."},
];

export default function WelcomeTour(){
  const [visible,setVisible]=useState(false);const [step,setStep]=useState(0);
  useEffect(()=>{const replay=new URLSearchParams(window.location.search).get("tour")==="1";let done=false;try{done=!!localStorage.getItem("medintel-tour-complete");}catch{}if(replay||!done)setVisible(true);},[]);
  useEffect(()=>{if(!visible)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")close();};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[visible]);
  function close(){try{localStorage.setItem("medintel-tour-complete","yes");}catch{}setVisible(false);if(new URLSearchParams(window.location.search).get("tour"))window.history.replaceState(null,"",window.location.pathname);}
  if(!visible)return null;
  const slide=slides[step];
  return <div className="tour-backdrop" role="presentation"><section className="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title"><button className="btn btn-quiet tour-close" onClick={close} aria-label="Close welcome tour"><X size={18}/></button><div className="tour-icon"><Sparkles size={21}/></div><div className="eyebrow">WELCOME · {step+1} OF 3</div><h2 id="tour-title">{slide.title}</h2><p>{slide.copy}</p><div className="tour-dots">{slides.map((item,index)=><span key={item.title} className={index===step?"active":""}/>)}</div><div className="inline" style={{justifyContent:"space-between"}}><button className="btn btn-secondary" onClick={()=>setStep((value)=>Math.max(0,value-1))} disabled={step===0}><ArrowLeft size={16}/>Back</button>{step===slides.length-1?<button className="btn" onClick={close}>Let's go ✨</button>:<button className="btn" onClick={()=>setStep((value)=>value+1)}>Next <ArrowRight size={16}/></button>}</div><button className="tour-skip" onClick={close}>Skip tour</button></section></div>;
}
