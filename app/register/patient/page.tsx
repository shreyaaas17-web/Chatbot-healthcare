import SiteNav from "@/components/SiteNav";
import AuthPanel from "@/components/AuthPanel";
import Footer from "@/components/Footer";

export default function RegisterPatientPage() {
  return <div className="site-shell"><SiteNav /><main className="container page"><AuthPanel mode="patient" /></main><Footer /></div>;
}
