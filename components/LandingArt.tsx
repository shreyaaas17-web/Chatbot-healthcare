import { Activity, Droplets, Moon } from "lucide-react";

/** Hero artwork: pure SVG/CSS, no external images, themed by the active color palette. */
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
      <svg className="hero-pulse" viewBox="0 0 400 120" fill="none">
        <path d="M0 70 H110 L130 70 L150 20 L180 105 L205 45 L222 70 H400" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
      </svg>
      <div className="float-card fc-1"><Activity size={16} /><div><strong>72 bpm</strong><span>resting vibe</span></div></div>
      <div className="float-card fc-2"><Moon size={16} /><div><strong>7.5 h</strong><span>sleep streak</span></div></div>
      <div className="float-card fc-3"><Droplets size={16} /><div><strong>6 / 8</strong><span>glasses today</span></div></div>
      <div className="hero-heart">♥</div>
    </div>
  );
}

const tips = ["💧 Sip water through the day", "😴 Protect your sleep", "🚶 Walk for ten minutes", "🧘 Take three slow breaths", "👀 Rest your eyes every 20 minutes", "🥗 Add one colorful food", "📵 Phone down before bed", "🤝 Check in with a friend"];

export function TipsMarquee() {
  return (
    <div className="marquee" aria-label="Wellness reminders">
      <div className="marquee-track">{[...tips, ...tips].map((tip, index) => <span key={index} aria-hidden={index >= tips.length}>{tip}</span>)}</div>
    </div>
  );
}

const steps = [
  { n: "01", title: "Tell us how you feel", copy: "Use the vibe check or symptom guide for general next-step ideas.", art: <path d="M20 60 Q50 10 80 60 T140 60" strokeWidth="5" /> },
  { n: "02", title: "Find the right care", copy: "Browse sample clinicians and facilities by specialty and city.", art: <><circle cx="80" cy="45" r="22" strokeWidth="5" /><path d="M96 62 L125 92" strokeWidth="6" /></> },
  { n: "03", title: "Book and prepare", copy: "Request a slot, then print a visit sheet with your questions.", art: <><rect x="40" y="20" width="80" height="70" rx="10" strokeWidth="5" /><path d="M40 42 H120 M62 12 V28 M98 12 V28" strokeWidth="5" /></> },
];

export function HowItWorks() {
  return (
    <div className="steps-row">
      {steps.map((step) => (
        <article className="step-card reveal" key={step.n}>
          <span className="step-num">{step.n}</span>
          <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{step.art}</svg>
          <h3>{step.title}</h3>
          <p>{step.copy}</p>
        </article>
      ))}
    </div>
  );
}

const tiles = [
  { title: "Heart", copy: "Know your numbers", art: <path d="M10 70 H50 L62 40 L80 100 L95 55 L105 70 H190" strokeWidth="5" /> },
  { title: "Mind", copy: "Check in with yourself", art: <><circle cx="60" cy="50" r="10" /><circle cx="110" cy="35" r="8" /><circle cx="150" cy="70" r="12" /><circle cx="95" cy="95" r="9" /><path d="M60 50 L110 35 L150 70 L95 95 Z M110 35 L95 95" strokeWidth="2.5" /></> },
  { title: "Move", copy: "Small wins add up", art: <path d="M10 95 C40 95 40 30 70 30 S100 95 130 95 S160 30 190 30" strokeWidth="5" /> },
  { title: "Rest", copy: "Sleep is a superpower", art: <><path d="M120 25 A45 45 0 1 0 160 90 A38 38 0 0 1 120 25 Z" strokeWidth="4" /><circle cx="50" cy="35" r="3" /><circle cx="75" cy="70" r="2.5" /><circle cx="35" cy="85" r="2" /></> },
];

export function ArtStrip() {
  return (
    <div className="art-strip">
      {tiles.map((tile, index) => (
        <article className={`art-tile art-${index + 1}`} key={tile.title}>
          <svg viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{tile.art}</svg>
          <h3>{tile.title}</h3>
          <p>{tile.copy}</p>
        </article>
      ))}
    </div>
  );
}
