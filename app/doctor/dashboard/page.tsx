import SiteNav from "@/components/SiteNav";
import DoctorDashboard from "@/components/DoctorDashboard";
import Footer from "@/components/Footer";

export default function DoctorDashboardPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">CLINICIAN WORKSPACE</div><h1 className="page-title">Doctor dashboard</h1><p className="page-subtitle">Review your schedule and respond to requests. Verify all information with the patient.</p><DoctorDashboard/></main><Footer/></div>;}
