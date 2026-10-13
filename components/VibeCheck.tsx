"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { notify } from "@/components/ToastHost";

const chips = [
  { id: "sleep", label: "😴 can't sleep", specialty: "General Physician" },
  { id: "mind", label: "🤯 overthinking", specialty: "Psychiatrist" },
  { id: "sniffly", label: "🤧 sniffly", specialty: "ENT" },
  { id: "sore", label: "💪 sore all over", specialty: "Orthopedic" },
  { id: "stomach", label: "🤢 stomach drama", specialty: "Gastroenterologist" },
  { id: "skin", label: "🔥 skin acting up", specialty: "Dermatologist" },
  { id: "head", label: "🧠 headache", specialty: "Neurologist" },
  { id: "breath", label: "😮‍💨 hard to breathe", specialty: "Pulmonologist", urgent: true },
  { id: "chest", label: "🫀 chest tightness", specialty: "Cardiologist", urgent: true },
] as const;

const energyLevels = [
  { max: 15, emoji: "🪫", label: "running on 2%" },
  { max: 35, emoji: "🥱", label: "low-battery mode" },
  { max: 60, emoji: "😌", label: "pretty chill" },
  { max: 85, emoji: "😎", label: "vibing" },
  { max: 101, emoji: "⚡", label: "main character energy" },
];

export default function VibeCheck() {
  const [energy, setEnergy] = useState(55);
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<{ specialty: string; urgent: boolean } | null>(null);
  const level = energyLevels.find((item) => energy < item.max) ?? energyLevels[2];
  const urgentPicked = useMemo(() => chips.some((chip) => "urgent" in chip && chip.urgent && picked.includes(chip.id)), [picked]);

  function toggle(id: string) {
    setResult(null);
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function submit() {
    const counts = new Map<string, number>();
    for (const chip of chips) if (picked.includes(chip.id)) counts.set(chip.specialty, (counts.get(chip.specialty) ?? 0) + ("urgent" in chip && chip.urgent ? 3 : 1));
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "General Physician";
    setResult({ specialty: best, urgent: urgentPicked });
    if (urgentPicked) return;
    notify(`Vibe received ${level.emoji} Here's a good place to start.`);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confetti({ particleCount: 90, spread: 70, origin: { y: 0.75 } });
  }

  return (
    <section className="card vibe-card" aria-labelledby="vibe-title">
      <div className="eyebrow"><Sparkles size={13} style={{ verticalAlign: "-2px" }} /> VIBE CHECK</div>
      <h2 id="vibe-title">How&apos;s the body doing today?</h2>
      <p className="muted">Drag, tap, done. General guidance only, not a diagnosis.</p>
      <div className="vibe-energy">
        <span className="vibe-emoji" key={level.emoji} aria-hidden="true">{level.emoji}</span>
        <div>
          <label className="form-label" htmlFor="energy">Energy: <strong>{level.label}</strong></label>
          <input id="energy" className="vibe-range" type="range" min="0" max="100" value={energy} onChange={(event) => { setEnergy(Number(event.target.value)); setResult(null); }} />
        </div>
      </div>
      <div className="vibe-chips" role="group" aria-label="What's going on?">
        {chips.map((chip) => <button key={chip.id} type="button" className={`vibe-chip ${picked.includes(chip.id) ? "on" : ""}`} aria-pressed={picked.includes(chip.id)} onClick={() => toggle(chip.id)}>{chip.label}</button>)}
      </div>
      {urgentPicked && <div className="warning-panel" style={{ marginBottom: 12 }}><strong><ShieldAlert size={16} style={{ verticalAlign: "-3px" }} /> Don&apos;t wait on this one.</strong> Trouble breathing or chest tightness can be urgent. <a className="text-link" href="tel:112">Call emergency services (India: 112)</a> or go to an emergency department.</div>}
      <button className="btn" onClick={submit}>Drop my vibe <ArrowRight size={16} /></button>
      {result && !result.urgent && (
        <div className="notice notice-success vibe-result" style={{ marginTop: 14 }}>
          A <strong>{result.specialty}</strong> could be a good place to start{picked.length === 0 && energy >= 25 ? " (nothing flagged, so here's a general check-in)" : ""}.
          <div className="inline" style={{ marginTop: 8 }}>
            <Link className="btn btn-secondary" href={`/hospitals?specialty=${encodeURIComponent(result.specialty)}`}>See sample {result.specialty}s</Link>
            <Link className="btn btn-quiet" href="/symptoms">Tell me more</Link>
          </div>
        </div>
      )}
    </section>
  );
}
