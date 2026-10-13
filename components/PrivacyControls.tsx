"use client";

import { useEffect, useState } from "react";
import { notify } from "@/components/ToastHost";
import { AI_CONSENT_KEY, grantAiConsent, readAiConsent, withdrawAiConsent } from "@/components/ConsentGate";
import { clearWellnessData } from "@/lib/wellness";

export default function PrivacyControls() {
  const [granted, setGranted] = useState(false);
  const [when, setWhen] = useState("");
  useEffect(() => {
    const sync = () => {
      setGranted(readAiConsent());
      try { setWhen(localStorage.getItem(AI_CONSENT_KEY) ?? ""); } catch { setWhen(""); }
    };
    sync();
    window.addEventListener("medintel-consent-change", sync);
    return () => window.removeEventListener("medintel-consent-change", sync);
  }, []);
  return (
    <section className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
      <article className="card">
        <h3>AI tools consent</h3>
        <p>{granted ? `Granted${when ? ` on ${new Date(when).toLocaleDateString()}` : ""}.` : "Not granted. AI tools stay locked until you agree."}</p>
        <div className="inline">
          {granted
            ? <button className="btn btn-secondary" onClick={() => { withdrawAiConsent(); notify("Consent withdrawn."); }}>Withdraw consent</button>
            : <button className="btn" onClick={() => { grantAiConsent(); notify("Consent saved."); }}>Grant consent</button>}
        </div>
      </article>
      <article className="card">
        <h3>Wellness data on this device</h3>
        <p>Water, sleep, mood, your emergency contact, and visit-sheet notes are kept in this browser only.</p>
        <button className="btn btn-secondary" onClick={() => { clearWellnessData(); notify("Wellness data cleared from this device."); }}>Clear wellness data</button>
      </article>
    </section>
  );
}
