import SiteNav from "@/components/SiteNav";
import HospitalsExplorer from "@/components/HospitalsExplorer";
import Footer from "@/components/Footer";
import { sampleDoctors, sampleHospitals } from "@/lib/demo-data";

export default async function HospitalsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; specialty?: string }> }) {
  const params = await searchParams;
  return <div className="site-shell"><SiteNav /><main className="container page"><div className="eyebrow">CARE DIRECTORY</div><h1 className="page-title">Explore hospitals</h1><p className="page-subtitle">Compare facilities and sample clinicians by city and specialty.</p><div className="demo-notice">All sample facilities, clinicians, ratings, phone numbers, and locations are fictional. Map markers are approximate city-centre locations.</div><HospitalsExplorer hospitals={sampleHospitals} doctors={sampleDoctors} initialQuery={params.q ?? ""} initialCity={params.city ?? ""} initialSpecialty={params.specialty ?? ""} /><div className="muted" style={{ marginTop: 18 }}>For patient accounts and booking, configure Neon PostgreSQL with DATABASE_URL.</div></main><Footer /></div>;
}
