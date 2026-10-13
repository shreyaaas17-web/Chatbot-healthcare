import SiteNav from "@/components/SiteNav";
import SymptomChecker from "@/components/SymptomChecker";
import ConsentGate from "@/components/ConsentGate";
import Footer from "@/components/Footer";

export default function SymptomsPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">CARE NAVIGATION</div><h1 className="page-title">AI symptom guide</h1><p className="page-subtitle">Share symptoms to receive general next-step information, not a diagnosis.</p><ConsentGate><SymptomChecker/></ConsentGate></main><Footer/></div>;}
