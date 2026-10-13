"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { notify } from "@/components/ToastHost";

export const AI_CONSENT_KEY = "medintel-consent-ai";

export function readAiConsent(): boolean {
  try { return localStorage.getItem(AI_CONSENT_KEY) !== null; } catch { return false; }
}
export function grantAiConsent() {
  try { localStorage.setItem(AI_CONSENT_KEY, new Date().toISOString()); } catch {}
  window.dispatchEvent(new Event("medintel-consent-change"));
}
export function withdrawAiConsent() {
  try { localStorage.removeItem(AI_CONSENT_KEY); } catch {}
  window.dispatchEvent(new Event("medintel-consent-change"));
}

/** Blocks its children until the visitor agrees to send typed text to the AI service. */
export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const sync = () => setGranted(readAiConsent());
    sync();
    window.addEventListener("medintel-consent-change", sync);
    return () => window.removeEventListener("medintel-consent-change", sync);
  }, []);
  if (granted === null) return <div className="card">Loading…</div>;
  if (granted) return <>{children}</>;
  return (
    <section className="card consent-card" aria-labelledby="consent-title">
      <span className="specialty-icon"><ShieldCheck size={19} /></span>
      <h2 id="consent-title">Before you use the AI tools</h2>
      <p>Text you type here is sent to Medintel&apos;s server and, when an AI key is configured, to a third-party language-model provider to produce a reply. Responses are general information, not medical advice.</p>
      <p>Use fictional details only. Do not enter names, phone numbers, or real patient records. You can withdraw consent any time on the <Link className="text-link" href="/privacy">privacy page</Link>.</p>
      <label className="inline consent-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> I understand and agree to send my typed text to the AI service.</label>
      <button className="btn" disabled={!checked} onClick={() => { grantAiConsent(); notify("Consent saved. You can withdraw it on the privacy page."); }}>Continue</button>
    </section>
  );
}
