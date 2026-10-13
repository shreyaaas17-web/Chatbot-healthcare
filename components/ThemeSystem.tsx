"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "mint" | "sunset" | "midnight";
type Mode = "light" | "dark";
type Preferences = { theme: Theme; mode: Mode; setTheme:(value:Theme)=>void; toggleMode:()=>void };
const ThemeContext=createContext<Preferences|null>(null);
const isTheme=(value:unknown):value is Theme=>value==="mint"||value==="sunset"||value==="midnight";
const isMode=(value:unknown):value is Mode=>value==="light"||value==="dark";

export function ThemeProvider({children}:{children:React.ReactNode}){
  const [theme,setThemeState]=useState<Theme>("mint");
  const [mode,setModeState]=useState<Mode>("light");
  const [ready,setReady]=useState(false);
  // Read what the boot script in layout.tsx already applied, so state and DOM agree on first render.
  useEffect(()=>{const root=document.documentElement.dataset;if(isTheme(root.theme))setThemeState(root.theme);if(isMode(root.mode))setModeState(root.mode);setReady(true);},[]);
  useEffect(()=>{if(!ready)return;document.documentElement.dataset.theme=theme;try{localStorage.setItem("medintel-theme",theme);}catch{}},[theme,ready]);
  useEffect(()=>{if(!ready)return;document.documentElement.dataset.mode=mode;try{localStorage.setItem("medintel-mode",mode);}catch{}},[mode,ready]);
  const setTheme=(value:Theme)=>setThemeState(value);
  const toggleMode=()=>setModeState((value)=>value==="light"?"dark":"light");
  return <ThemeContext.Provider value={{theme,mode,setTheme,toggleMode}}>{children}</ThemeContext.Provider>;
}

export function ThemeControls(){
  const preferences=useContext(ThemeContext);
  const pickerId=useId();
  if(!preferences)return null;
  return <div className="theme-controls" aria-label="Appearance settings"><label className="sr-only" htmlFor={pickerId}>Color theme</label><select id={pickerId} className="select theme-picker" value={preferences.theme} onChange={(event)=>preferences.setTheme(event.target.value as Theme)}><option value="mint">Mint</option><option value="sunset">Sunset</option><option value="midnight">Midnight</option></select><button className="btn btn-secondary theme-mode" aria-label={`Switch to ${preferences.mode==="light"?"dark":"light"} mode`} title="Toggle light and dark mode" onClick={preferences.toggleMode}>{preferences.mode==="light"?<Moon size={16}/>:<Sun size={16}/>}</button></div>;
}
