import SiteNav from "@/components/SiteNav";
import PrivacyControls from "@/components/PrivacyControls";
import Footer from "@/components/Footer";
import { DEMO_NOTICE } from "@/lib/index";

export default function PrivacyPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">YOUR CHOICES</div><h1 className="page-title">Privacy &amp; consent</h1><p className="page-subtitle">{DEMO_NOTICE}</p>
<section className="card" style={{marginBottom:16}}><h3>What is sent where</h3><p>Symptom, medicine, and clinician-summary text is processed by Medintel&apos;s server. If an AI key is configured, that text is also sent to the language-model provider to generate a reply. Without a key, local rules are used instead.</p><p>Accounts and appointments are stored in the Neon PostgreSQL database. Theme, language, tour, consent, and wellness-tracker data live only in your browser.</p><p>This is a demonstration. Do not enter real patient information.</p></section>
<PrivacyControls/></main><Footer/></div>;}
