import SiteNav from "@/components/SiteNav";
import PatientDashboard from "@/components/PatientDashboard";
import Footer from "@/components/Footer";

export default function DashboardPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">PATIENT WORKSPACE</div><h1 className="page-title">Patient dashboard</h1><p className="page-subtitle">Your upcoming visits, past appointments, and profile.</p><PatientDashboard/></main><Footer/></div>;}
