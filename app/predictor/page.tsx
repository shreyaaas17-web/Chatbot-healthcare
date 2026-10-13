import SiteNav from "@/components/SiteNav";
import DiseaseGuide from "@/components/DiseaseGuide";
import Footer from "@/components/Footer";

export default function PredictorPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">SYMPTOM MATCHING</div><h1 className="page-title">Disease and symptom guide</h1><p className="page-subtitle">Transparent keyword matches to help prepare for a clinician conversation.</p><DiseaseGuide/></main><Footer/></div>;}
