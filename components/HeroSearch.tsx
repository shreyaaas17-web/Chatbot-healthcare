"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

const prompts = ["a dermatologist near me…", "why am I always tired…", "cardiologist in Pune…", "help with headaches…", "someone for my skin…"];
const suggestions = ["Dermatologist", "Cardiologist", "Mental health", "Headache", "Pediatrician"];

export default function HeroSearch() {
  const [value, setValue] = useState("");
  const [placeholder, setPlaceholder] = useState("Search symptoms, specialties, doctors…");
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let phrase = 0, letter = 0, deleting = false;
    const timer = window.setInterval(() => {
      const text = prompts[phrase];
      letter += deleting ? -1 : 1;
      setPlaceholder(`Try: ${text.slice(0, Math.max(0, letter))}`);
      if (!deleting && letter >= text.length + 12) deleting = true;
      if (deleting && letter <= 0) { deleting = false; phrase = (phrase + 1) % prompts.length; }
    }, 70);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <>
      <form action="/hospitals" className="search-panel">
        <div className="search-field">
          <input name="q" className="input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} aria-label="Search care" />
          {value && <button type="button" className="search-clear" onClick={() => setValue("")} aria-label="Clear search"><X size={15} /></button>}
        </div>
        <button className="btn">Search care <ArrowRight size={16} /></button>
      </form>
      <div className="suggest-row" aria-label="Quick searches">{suggestions.map((item) => <button key={item} type="button" className="suggest-chip" onClick={() => setValue(item)}>{item}</button>)}</div>
    </>
  );
}
