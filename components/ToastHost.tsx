"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

type Toast={id:number;message:string};
export function notify(message:string){window.dispatchEvent(new CustomEvent("medintel-toast",{detail:message}));}
export default function ToastHost(){const [toasts,setToasts]=useState<Toast[]>([]);useEffect(()=>{const handler=(event:Event)=>{const message=(event as CustomEvent<string>).detail;if(!message)return;const id=Date.now()+Math.random();setToasts((items)=>[...items,{id,message}]);window.setTimeout(()=>setToasts((items)=>items.filter((item)=>item.id!==id)),3200);};window.addEventListener("medintel-toast",handler);return()=>window.removeEventListener("medintel-toast",handler);},[]);return <div className="toast-stack" aria-live="polite">{toasts.map((toast)=><div key={toast.id} className="toast"><Check size={17}/>{toast.message}<button onClick={()=>setToasts((items)=>items.filter((item)=>item.id!==toast.id))} aria-label="Dismiss notification"><X size={15}/></button></div>)}</div>;}
