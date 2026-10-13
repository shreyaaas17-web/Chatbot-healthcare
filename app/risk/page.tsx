import SiteNav from "@/components/SiteNav";
import RiskCalculator from "@/components/RiskCalculator";
import Footer from "@/components/Footer";

export default function RiskPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">GENERAL WELLNESS</div><h1 className="page-title">Health risk guide</h1><p className="page-subtitle">Explore general health factors. This score is illustrative, not validated for clinical use.</p><RiskCalculator/></main><Footer/></div>;}
