"use client";

import { useEffect, useState } from "react";
import { Droplets, Eye, HeartPulse, Wind } from "lucide-react";
import { notify } from "@/components/ToastHost";

type Tab = "breath" | "heart" | "water" | "eyes";
const tabs: { id: Tab; label: string; icon: typeof Wind }[] = [
  { id: "breath", label: "Breathe", icon: Wind },
  { id: "heart", label: "Heart zones", icon: HeartPulse },
  { id: "water", label: "Water goal", icon: Droplets },
  { id: "eyes", label: "Eye break", icon: Eye },
];

/* ---------- Guided breathing ---------- */
const patterns = {
  box: { name: "Box breathing (4-4-4-4)", steps: [{ label: "Inhale", secs: 4, scale: 1 }, { label: "Hold", secs: 4, scale: 1 }, { label: "Exhale", secs: 4, scale: 0.55 }, { label: "Hold", secs: 4, scale: 0.55 }] },
  calm: { name: "Calm breathing (4-7-8)", steps: [{ label: "Inhale", secs: 4, scale: 1 }, { label: "Hold", secs: 7, scale: 1 }, { label: "Exhale", secs: 8, scale: 0.55 }] },
} as const;

function Breathing() {
  const [key, setKey] = useState<keyof typeof patterns>("box");
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [left, setLeft] = useState(0);
  const steps = patterns[key].steps;
  const step = steps[index];

  useEffect(() => {
    if (!running) return;
    setLeft(step.secs);
    const tick = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    const next = window.setTimeout(() => {
      const following = (index + 1) % steps.length;
      if (following === 0) setCycles((value) => value + 1);
      setIndex(following);
    }, step.secs * 1000);
    return () => { window.clearInterval(tick); window.clearTimeout(next); };
  }, [running, index, key]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    if (running) { setRunning(false); setIndex(0); if (cycles > 0) notify(`Nice. ${cycles} full cycle${cycles === 1 ? "" : "s"} done.`); setCycles(0); }
    else setRunning(true);
  }
  const scale = running ? step.scale : 0.55;
  const duration = running && step.label !== "Hold" ? step.secs : 0.4;
  return (
    <div className="tool-body">
      <div className="breath-stage" aria-live="polite">
        <div className="breath-ring" />
        <div className="breath-orb" style={{ transform: `scale(${scale})`, transitionDuration: `${duration}s` }}>
          <strong>{running ? step.label : "Ready"}</strong>
          <span>{running ? `${left}s` : "tap start"}</span>
        </div>
      </div>
      <div className="tool-controls">
        <div className="segmented" role="group" aria-label="Breathing pattern">
          {(Object.keys(patterns) as (keyof typeof patterns)[]).map((id) => <button key={id} className={key === id ? "active" : ""} onClick={() => { setKey(id); setRunning(false); setIndex(0); setCycles(0); }}>{patterns[id].name}</button>)}
        </div>
        <button className="btn" onClick={toggle}>{running ? "Stop" : "Start"}</button>
        <p className="muted">Cycles this session: {cycles}. Breathe gently and stop if you feel dizzy. This is relaxation practice, not treatment.</p>
      </div>
    </div>
  );
}

/* ---------- Heart-rate zones ---------- */
const zones = [
  { name: "Zone 1 · Easy", from: 0.5, to: 0.6, color: "#6be3b2" },
  { name: "Zone 2 · Steady", from: 0.6, to: 0.7, color: "#5bc0eb" },
  { name: "Zone 3 · Tempo", from: 0.7, to: 0.8, color: "#ffd166" },
  { name: "Zone 4 · Hard", from: 0.8, to: 0.9, color: "#ff9a62" },
  { name: "Zone 5 · Max effort", from: 0.9, to: 1, color: "#ff5d73" },
];

function HeartZones() {
  const [age, setAge] = useState("25");
  const years = Number(age);
  const valid = Number.isFinite(years) && years >= 10 && years <= 100;
  const max = valid ? 220 - years : 0;
  return (
    <div className="tool-body stack">
      <label className="form-label" style={{ maxWidth: 220 }}>Your age<input className="input" type="number" min="10" max="100" value={age} onChange={(event) => setAge(event.target.value)} /></label>
      {!valid ? <p className="notice notice-error">Enter an age between 10 and 100.</p> : (
        <>
          <p>Estimated maximum: <strong>{max} bpm</strong></p>
          <div className="zone-list">{zones.map((zone) => <div className="zone-row" key={zone.name}><span>{zone.name}</span><div className="zone-bar" style={{ background: zone.color, width: `${zone.to * 100}%` }} /><strong>{Math.round(max * zone.from)}–{Math.round(max * zone.to)} bpm</strong></div>)}</div>
        </>
      )}
      <p className="muted">Based on the rough 220 − age estimate, which can be off by 10+ bpm. If you have a heart condition or take medicines that affect heart rate, ask a clinician before exercising by these numbers.</p>
    </div>
  );
}

/* ---------- Water goal ---------- */
function WaterGoal() {
  const [weight, setWeight] = useState("60");
  const [activity, setActivity] = useState<"low" | "medium" | "high">("medium");
  const [hot, setHot] = useState(false);
  const kg = Number(weight);
  const valid = Number.isFinite(kg) && kg >= 20 && kg <= 250;
  const factor = 1 + (activity === "medium" ? 0.1 : activity === "high" ? 0.2 : 0) + (hot ? 0.1 : 0);
  const litres = valid ? (kg * 30 * factor) / 1000 : 0;
  const glasses = Math.round((litres * 1000) / 250);
  return (
    <div className="tool-body">
      <div className="water-vessel" aria-hidden="true"><div className="water-fill" style={{ height: `${valid ? Math.min(100, (litres / 4) * 100) : 0}%` }} /><span>{valid ? `${litres.toFixed(1)} L` : "-"}</span></div>
      <div className="tool-controls">
        <label className="form-label">Weight (kg)<input className="input" type="number" min="20" max="250" value={weight} onChange={(event) => setWeight(event.target.value)} /></label>
        <div className="segmented" role="group" aria-label="Activity level">{(["low", "medium", "high"] as const).map((level) => <button key={level} className={activity === level ? "active" : ""} onClick={() => setActivity(level)}>{level} activity</button>)}</div>
        <label className="inline"><input type="checkbox" checked={hot} onChange={(event) => setHot(event.target.checked)} /> Hot or humid day</label>
        {valid ? <p>About <strong>{glasses} glasses</strong> (250 ml each) of fluids across the day.</p> : <p className="notice notice-error">Enter a weight between 20 and 250 kg.</p>}
        <p className="muted">A general estimate only. If you have kidney, heart or other conditions with fluid limits, follow your clinician&apos;s advice.</p>
      </div>
    </div>
  );
}

/* ---------- 20-20-20 eye break ---------- */
const WORK_SECONDS = 20 * 60;
const BREAK_SECONDS = 20;
function EyeBreak() {
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [left, setLeft] = useState(WORK_SECONDS);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!running || left > 0) return;
    if (onBreak) { setOnBreak(false); setLeft(WORK_SECONDS); notify("Break over. Back to it 👀"); }
    else { setOnBreak(true); setLeft(BREAK_SECONDS); notify("Look at something 20 ft (6 m) away for 20 seconds 👀"); }
  }, [left, running, onBreak]);
  const total = onBreak ? BREAK_SECONDS : WORK_SECONDS;
  const progress = 1 - left / total;
  const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, left) % 60).padStart(2, "0");
  return (
    <div className="tool-body">
      <svg className="ring-timer" viewBox="0 0 120 120" role="img" aria-label={`${mm}:${ss} remaining`}>
        <circle cx="60" cy="60" r="52" className="ring-bg" />
        <circle cx="60" cy="60" r="52" className="ring-fg" style={{ strokeDasharray: 327, strokeDashoffset: 327 * (1 - progress) }} />
        <text x="60" y="58" textAnchor="middle" className="ring-time">{mm}:{ss}</text>
        <text x="60" y="76" textAnchor="middle" className="ring-sub">{onBreak ? "look far away" : "screen time"}</text>
      </svg>
      <div className="tool-controls">
        <p>Every 20 minutes of screen time, look at something about 20 feet away for 20 seconds.</p>
        <div className="inline"><button className="btn" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Start"}</button><button className="btn btn-secondary" onClick={() => { setRunning(false); setOnBreak(false); setLeft(WORK_SECONDS); }}>Reset</button></div>
        <p className="muted">A common comfort habit. Persistent eye pain or vision changes need an eye-care professional. Keep this tab open for the timer to run.</p>
      </div>
    </div>
  );
}

export default function ToolsHub() {
  const [tab, setTab] = useState<Tab>("breath");
  return (
    <section className="card tools-card">
      <div className="tool-tabs" role="tablist" aria-label="Health tools">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={`tool-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}><Icon size={17} /> {label}</button>)}
      </div>
      <div role="tabpanel" key={tab} className="tool-panel">
        {tab === "breath" && <Breathing />}
        {tab === "heart" && <HeartZones />}
        {tab === "water" && <WaterGoal />}
        {tab === "eyes" && <EyeBreak />}
      </div>
    </section>
  );
}
