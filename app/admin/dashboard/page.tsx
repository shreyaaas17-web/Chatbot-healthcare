import SiteNav from "@/components/SiteNav";
import AdminDashboard from "@/components/AdminDashboard";
import Footer from "@/components/Footer";

export default function AdminDashboardPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">ADMINISTRATION</div><h1 className="page-title">Admin dashboard</h1><p className="page-subtitle">Platform overview. Read-only, and free of patient health details.</p><AdminDashboard/></main><Footer/></div>;}
