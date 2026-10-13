"use client";

import { Languages } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "@/lib/i18n";

export default function LanguageControl(){
  const [language,setLanguage]=useState<Language>("en");
  useEffect(()=>{const saved=localStorage.getItem("medintel-language");if(saved==="en"||saved==="hi"||saved==="mr")setLanguage(saved);},[]);
  function change(value:Language){setLanguage(value);localStorage.setItem("medintel-language",value);window.dispatchEvent(new Event("medintel-language-change"));}
  return <label className="language-control" aria-label="Choose language"><Languages size={15}/><select className="select" value={language} onChange={(event)=>change(event.target.value as Language)}><option value="en">EN</option><option value="hi">हिंदी</option><option value="mr">मराठी</option></select></label>;
}
