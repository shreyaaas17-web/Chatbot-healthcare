import SiteNav from "@/components/SiteNav";
import BookingWizard from "@/components/BookingWizard";
import Footer from "@/components/Footer";

export default async function BookPage({ searchParams }: { searchParams: Promise<{ hospital?: string; specialty?: string }> }) {
  const params = await searchParams;
  return <div className="site-shell"><SiteNav /><main className="container page"><div className="eyebrow">APPOINTMENTS</div><h1 className="page-title">Book an appointment</h1><p className="page-subtitle">Choose care, facility, clinician, and an available time.</p><BookingWizard requestedHospitalId={Number(params.hospital ?? 0)} requestedSpecialty={params.specialty ?? ""} /></main><Footer /></div>;
}
