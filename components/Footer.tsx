import Link from "next/link";

export default function Footer() {
  return <footer className="footer"><div className="container inline" style={{ justifyContent: "space-between" }}><span>Medintel · Demonstration only · Not for diagnosis or emergency care</span><span className="inline"><Link href="/hospitals">Hospitals</Link><Link href="/wellness">Wellness</Link><Link href="/tools">Tools</Link><Link href="/privacy">Privacy &amp; consent</Link><Link href="/?tour=1">Welcome tour</Link><Link href="/login">Sign in</Link><Link href="/register/doctor">Clinician registration</Link></span></div></footer>;
}
