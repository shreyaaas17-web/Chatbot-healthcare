import SiteNav from "@/components/SiteNav";
import AuthPanel from "@/components/AuthPanel";
import Footer from "@/components/Footer";

export default function RegisterDoctorPage() {
  return <div className="site-shell"><SiteNav /><main className="container page"><AuthPanel mode="doctor" /></main><Footer /></div>;
}
