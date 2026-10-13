"use client";

import { useEffect, useState } from "react";
import { Droplets, FileDown, Moon, Phone, Pill, Smile } from "lucide-react";
import ConsentGate from "@/components/ConsentGate";
import { notify } from "@/components/ToastHost";
import { load, save, today } from "@/lib/wellness";

const WATER_GOAL = 8;
const moods = [{ value: 1, emoji: "😞", label: "Very low" }, { value: 2, emoji: "😕", label: "Low" }, { value: 3, emoji: "😐", label: "Okay" }, { value: 4, emoji: "🙂", label: "Good" }, { value: 5, emoji: "😄", label: "Great" }];

type Water = { date: string; count: number };
type SleepEntry = { date: string; hours: number };
type MoodEntry = { date: string; mood: number };
type Contact = { name: string; phone: string };

function Hydration() {
  const [water, setWater] = useState<Water>({ date: today(), count: 0 });
  useEffect(() => {
    const stored = load<Water>("medintel-water", { date: today(), count: 0 });
    setWater(stored.date === today() ? stored : { date: today(), count: 0 });
  }, []);
  function change(delta: number) {
    const next = { date: today(), count: Math.max(0, Math.min(20, water.count + delta)) };
    setWater(next);
    save("medintel-water", next);
    if (delta > 0 && next.count === WATER_GOAL) notify("Daily water goal reached 💧");
  }
  return (
    <article className="card">
      <span className="specialty-icon"><Droplets size={18} /></span>
      <h3>Hydration</h3>
      <p>{water.count} of {WATER_GOAL} glasses today</p>
      <div className="gauge" aria-hidden="true"><div className="gauge-value" style={{ width: `${Math.min(100, (water.count / WATER_GOAL) * 100)}%` }} /></div>
      <div className="inline" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => change(1)}>+ Add glass</button>
        <button className="btn btn-secondary" onClick={() => change(-1)} disabled={water.count === 0}>Undo</button>
      </div>
      <p className="muted">Needs vary by person, climate, and health. Ask a clinician if you have a condition that affects fluid intake.</p>
    </article>
  );
}

function Sleep() {
  const [log, setLog] = useState<SleepEntry[]>([]);
  const [hours, setHours] = useState("7");
  useEffect(() => setLog(load<SleepEntry[]>("medintel-sleep", [])), []);
  function add() {
    const value = Number(hours);
    if (!Number.isFinite(value) || value < 0 || value > 24) { notify("Enter hours between 0 and 24."); return; }
    const next = [...log.filter((entry) => entry.date !== today()), { date: today(), hours: value }].slice(-7);
    setLog(next);
    save("medintel-sleep", next);
    notify("Sleep logged.");
  }
  const average = log.length ? log.reduce((sum, entry) => sum + entry.hours, 0) / log.length : null;
  return (
    <article className="card">
      <span className="specialty-icon"><Moon size={18} /></span>
      <h3>Sleep log</h3>
      <label className="form-label">Hours slept last night<input className="input" type="number" min="0" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
      <button className="btn" style={{ marginTop: 10 }} onClick={add}>Save</button>
      <p>{average === null ? "No entries yet." : `${log.length}-day average: ${average.toFixed(1)} hours`}</p>
      <p className="muted">If poor sleep persists or affects daily life, consider speaking with a clinician.</p>
    </article>
  );
}

function Mood() {
  const [log, setLog] = useState<MoodEntry[]>([]);
  useEffect(() => setLog(load<MoodEntry[]>("medintel-mood", [])), []);
  const current = log.find((entry) => entry.date === today())?.mood;
  function pick(value: number) {
    const next = [...log.filter((entry) => entry.date !== today()), { date: today(), mood: value }].slice(-14);
    setLog(next);
    save("medintel-mood", next);
    notify("Check-in saved.");
  }
  return (
    <article className="card">
      <span className="specialty-icon"><Smile size={18} /></span>
      <h3>Mood check-in</h3>
      <div className="mood-row" role="group" aria-label="How are you feeling today?">
        {moods.map((item) => <button key={item.value} className={`mood-btn ${current === item.value ? "selected" : ""}`} aria-pressed={current === item.value} aria-label={item.label} title={item.label} onClick={() => pick(item.value)}>{item.emoji}</button>)}
      </div>
      <p className="muted">Stored only in this browser.</p>
      {current !== undefined && current <= 2 && <div className="notice notice-success">Feeling low is worth taking seriously. Consider talking to someone you trust or a mental-health professional. In India, Tele-MANAS (14416) offers free, 24/7 support. If you feel you may harm yourself, call 112 now.</div>}
    </article>
  );
}

function MedicineAssistant() {
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError(""); setAnswer("");
    try {
      const response = await fetch("/api/ai/medicine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to get information.");
      setAnswer(data.answer); setDisclaimer(data.disclaimer);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to get information.");
    } finally { setBusy(false); }
  }
  return (
    <section className="card">
      <span className="specialty-icon"><Pill size={18} /></span>
      <h3>Medicine information assistant</h3>
      <p>General, plain-language information only. It never provides doses or tells you to start or stop a medicine.</p>
      <ConsentGate>
        <form className="form-stack" onSubmit={submit}>
          <label className="form-label">Medicine name<input className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="For example: paracetamol" /></label>
          <label className="form-label">Question (optional)<textarea className="textarea" value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="For example: What are common side effects?" /></label>
          <button className="btn" disabled={busy || !name.trim()}>{busy ? "Looking up…" : "Get general information"}</button>
        </form>
        {error && <div className="notice notice-error" style={{ marginTop: 12 }}>{error}</div>}
        {answer && <div className="chat-bubble" style={{ marginTop: 12 }}>{answer}<div className="muted" style={{ marginTop: 8 }}>{disclaimer}</div></div>}
      </ConsentGate>
    </section>
  );
}

function CareExtras() {
  const [contact, setContact] = useState<Contact>({ name: "", phone: "" });
  const [prep, setPrep] = useState({ reason: "", questions: "", medicines: "" });
  useEffect(() => {
    setContact(load<Contact>("medintel-contact", { name: "", phone: "" }));
    setPrep(load("medintel-prep", { reason: "", questions: "", medicines: "" }));
  }, []);
  function saveContact() {
    const phone = contact.phone.replace(/[^\d+]/g, "");
    if (contact.phone && phone.length < 7) { notify("Enter a valid phone number."); return; }
    const next = { name: contact.name.trim(), phone };
    setContact(next); save("medintel-contact", next); notify("Emergency contact saved on this device.");
  }
  function updatePrep(field: keyof typeof prep, value: string) {
    const next = { ...prep, [field]: value };
    setPrep(next); save("medintel-prep", next);
  }
  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Medintel visit preparation sheet", 14, 18);
    doc.setFontSize(9); doc.text(`Prepared ${today()} - demo document, not a medical record.`, 14, 25);
    let y = 36;
    doc.setFontSize(11);
    for (const [label, value] of [["Reason for visit", prep.reason], ["Questions to ask", prep.questions], ["Current medicines (as I understand them)", prep.medicines]]) {
      doc.setFont("helvetica", "bold"); doc.text(label, 14, y); y += 6;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(value || "-", 180) as string[];
      doc.text(lines, 14, y); y += lines.length * 5 + 8;
      if (y > 270) { doc.addPage(); y = 20; }
    }
    doc.save("visit-prep.pdf");
    notify("Visit sheet downloaded.");
  }
  return (
    <section className="section split">
      <div className="card">
        <span className="specialty-icon"><Phone size={18} /></span>
        <h3>Emergency numbers (India)</h3>
        <p><strong>112</strong> national emergency · <strong>108</strong> ambulance (availability varies by state) · <strong>14416</strong> Tele-MANAS mental-health support</p>
        <div className="inline" style={{ marginBottom: 12 }}><a className="btn" href="tel:112">Call 112</a><a className="btn btn-secondary" href="tel:14416">Call 14416</a></div>
        <div className="form-row">
          <label className="form-label">Personal contact name<input className="input" value={contact.name} maxLength={60} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
          <label className="form-label">Phone<input className="input" inputMode="tel" value={contact.phone} maxLength={20} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
        </div>
        <div className="inline" style={{ marginTop: 10 }}><button className="btn btn-secondary" onClick={saveContact}>Save contact</button>{contact.phone && contact.name && <a className="btn btn-quiet" href={`tel:${contact.phone}`}>Call {contact.name}</a>}</div>
        <p className="muted">Saved only in this browser. Verify numbers for your area.</p>
      </div>
      <div className="card">
        <span className="specialty-icon"><FileDown size={18} /></span>
        <h3>Visit preparation sheet</h3>
        <div className="form-stack">
          <label className="form-label">Reason for visit<textarea className="textarea" value={prep.reason} maxLength={600} onChange={(event) => updatePrep("reason", event.target.value)} /></label>
          <label className="form-label">Questions to ask<textarea className="textarea" value={prep.questions} maxLength={600} onChange={(event) => updatePrep("questions", event.target.value)} /></label>
          <label className="form-label">Current medicines<textarea className="textarea" value={prep.medicines} maxLength={600} onChange={(event) => updatePrep("medicines", event.target.value)} /></label>
          <button className="btn" onClick={downloadPdf}>Download PDF</button>
        </div>
        <p className="muted">Use fictional details in this demo. The PDF is created in your browser.</p>
      </div>
    </section>
  );
}

export default function WellnessHub() {
  return (
    <>
      <div className="demo-notice">Habit trackers stay in this browser only. Wellness tools are general information, not medical advice.</div>
      <section className="grid"><Hydration /><Sleep /><Mood /></section>
      <section className="section"><MedicineAssistant /></section>
      <CareExtras />
    </>
  );
}
