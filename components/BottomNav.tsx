"use client";

import Link from "next/link";
import { CalendarDays, HeartPulse, Home, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

export default function BottomNav(){const [role,setRole]=useState<string>("");useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then((r)=>r.json()).then((d)=>setRole(d.user?.role??"" )).catch(()=>setRole(""));},[]);const dashboard=role==="doctor"?"/doctor/dashboard":role==="admin"?"/admin/dashboard":"/dashboard";return <nav className="bottom-nav" aria-label="Mobile navigation"><Link href="/" aria-label="Home"><Home size={19}/><span>Home</span></Link><Link href="/hospitals" aria-label="Hospitals"><HeartPulse size={19}/><span>Care</span></Link><Link className="bottom-primary" href="/book" aria-label="Book"><CalendarDays size={19}/><span>Book</span></Link><Link href="/map" aria-label="Map"><MapPin size={19}/><span>Map</span></Link><Link href={role?dashboard:"/login"} aria-label="Account"><UserRound size={19}/><span>Me</span></Link></nav>;}
