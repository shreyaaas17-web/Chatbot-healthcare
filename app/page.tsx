import Link from "next/link";
import { ArrowRight, Brain, HeartPulse, ScanFace, Stethoscope, Eye, Bone, Baby, Ear, Wind, Sparkles, ShieldAlert } from "lucide-react";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import WelcomeTour from "@/components/WelcomeTour";
import HeroSearch from "@/components/HeroSearch";
import VibeCheck from "@/components/VibeCheck";
import { HeroArt, ArtStrip, TipsMarquee, HowItWorks } from "@/components/LandingArt";
import { RevealObserver, StatsBand } from "@/components/LandingMotion";
import { sampleDoctors, sampleHospitals, specialties } from "@/lib/demo-data";
import { DEMO_NOTICE } from "@/lib/index";

const icons = [ScanFace, Brain, HeartPulse, Bone, Baby, Stethoscope, Ear, Eye, Sparkles, Wind, Stethoscope, HeartPulse];

export default function HomePage() {
  const featured = [...sampleHospitals].sort((a, b) => b.rating - a.rating).slice(0, 3);
  return <div className="site-shell"><SiteNav /><WelcomeTour /><RevealObserver /><main className="container">
    <section className="hero">
      <div><div className="eyebrow">MEDINTEL · CARE, CONNECTED</div><h1>Better care starts <span>before you arrive.</span></h1><p className="hero-copy">Find a clinician, explore care options, and bring the right context into your next conversation. Simple tools to help you prepare for a visit.</p>
        <HeroSearch />
        <p className="muted">Browse the sample network or <Link className="text-link" href="/register/patient">create a patient account</Link>.</p>
      </div>
      <HeroArt />
    </section>
    <div className="demo-notice">{DEMO_NOTICE}</div>
    <TipsMarquee />

    <section className="section reveal"><div className="split"><VibeCheck /><div><div className="eyebrow">FEEL GOOD, YOUR WAY</div><h2>Small habits, big mood</h2><p className="section-desc">Track water, sleep, and mood in seconds.</p><ArtStrip /><Link className="btn btn-secondary" style={{ marginTop: 14 }} href="/wellness">Open wellness tools <ArrowRight size={16} /></Link> <Link className="btn btn-quiet" style={{ marginTop: 14 }} href="/tools">Try the health tools</Link></div></div></section>

    <section className="section"><StatsBand items={[{ label: "sample facilities", value: sampleHospitals.length }, { label: "sample clinicians", value: sampleDoctors.length }, { label: "specialties", value: specialties.length }, { label: "wellness tools", value: 8 }]} /></section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">HOW IT WORKS</div><h2>Three taps to a plan</h2></div></div><HowItWorks /></section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">FIND THE RIGHT CARE</div><h2>Browse by specialty</h2><p className="section-desc">Start with the kind of support you are looking for.</p></div><Link className="text-link inline" href="/hospitals">Explore care <ArrowRight size={16} /></Link></div>
      <div className="grid grid-4">{specialties.map((name, index) => { const Icon = icons[index]; return <Link key={name} href={`/hospitals?specialty=${encodeURIComponent(name)}`} className="card specialty-card"><span className="specialty-icon"><Icon size={19} /></span><div><h3>{name}</h3><p>Explore sample clinicians</p></div></Link>; })}</div>
    </section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">FACILITIES</div><h2>Hospitals to explore</h2><p className="section-desc">Example facilities across different cities.</p></div><Link href="/hospitals" className="text-link inline">All hospitals <ArrowRight size={16} /></Link></div>
      <div className="grid">{featured.map((hospital) => <article className="card" key={hospital.name}><span className="badge">SAMPLE FACILITY</span><h3>{hospital.name}</h3><p>{hospital.city} · ★ {hospital.rating.toFixed(1)}</p><p>{hospital.specialties.slice(0, 3).join(" · ")}</p><Link href={`/hospitals?city=${encodeURIComponent(hospital.city)}`} className="text-link inline">View facility <ArrowRight size={15} /></Link></article>)}</div>
    </section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">CLINICIANS</div><h2>Sample care team</h2><p className="section-desc">Profiles are fictional previews, not real providers.</p></div></div>
      <div className="grid grid-4">{sampleDoctors.slice(0, 4).map((doctor) => <article className="card" key={doctor.id}><span className="specialty-icon"><Stethoscope size={18} /></span><h3>{doctor.name}</h3><p>{doctor.specialization}</p><p>{doctor.hospitalCity} · ★ {doctor.rating.toFixed(1)} sample rating</p><p>₹{doctor.fee.toLocaleString("en-IN")} sample fee</p></article>)}</div>
    </section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">A SIMPLE PATH</div><h2>Prepare for a better visit</h2></div></div><div className="grid">{[["01","Explore care","Compare sample facilities and specialties."],["02","Choose a time","Request an open slot with a listed clinician."],["03","Arrive prepared","Bring your notes and questions to your clinician."]].map(([number,title,copy]) => <article className="card" key={number}><span className="eyebrow">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">SUPPORT TOOLS</div><h2>Helpful before your visit</h2></div></div><div className="grid">{[["Symptom guide","General care navigation with emergency red-flag guidance.","/symptoms",ShieldAlert],["Health risk guide","Review general factors like BMI, activity, and smoking.","/risk",HeartPulse],["Disease and symptom guide","See transparent keyword matches, not diagnoses.","/predictor",Brain]].map(([title,copy,href,Icon]) => <article className="card" key={String(title)}><span className="specialty-icon"><Icon size={18} /></span><h3>{String(title)}</h3><p>{String(copy)}</p><Link className="text-link inline" href={String(href)}>Open guide <ArrowRight size={15} /></Link></article>)}</div></section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">NETWORK SNAPSHOT</div><h2>A sample network across India</h2></div></div><div className="stat-row"><div className="stat"><strong>{sampleHospitals.length}</strong><span>sample hospitals</span></div><div className="stat"><strong>{sampleDoctors.length}</strong><span>sample clinician profiles</span></div><div className="stat"><strong>{specialties.length}</strong><span>care specialties</span></div></div></section>

    <section className="section"><div className="section-head"><div><div className="eyebrow">COMMON QUESTIONS</div><h2>Know before you book</h2></div></div><div className="grid">{[["Are the providers real?","No. All names, facilities, ratings, phone numbers, and locations are fictional demo content."],["Can this app diagnose symptoms?","No. The symptom tools provide general information only. A qualified clinician must assess symptoms."],["What if this is an emergency?","Do not wait for this app. Contact your local emergency services or go to an emergency department." ]].map(([question,answer]) => <details className="card" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
  </main><Footer /></div>;
}
