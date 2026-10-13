"use client";

import { useEffect, useState } from "react";
import { translate, type Language } from "@/lib/i18n";

export function useLanguage(){
  const [language,setLanguage]=useState<Language>("en");
  useEffect(()=>{const load=()=>{const value=localStorage.getItem("medintel-language");if(value==="en"||value==="hi"||value==="mr")setLanguage(value);};load();window.addEventListener("medintel-language-change",load);return()=>window.removeEventListener("medintel-language-change",load);},[]);
  return {language,t:(key:string)=>translate(language,key)};
}
