"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Gauge, HeartPulse, Home, LogOut, MapPin, Menu, Sparkles, Stethoscope, UserRound, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import LanguageControl from "@/components/LanguageControl";
import { ThemeControls } from "@/components/ThemeSystem";
import { useLanguage } from "@/lib/useLanguage";

type User = { id: number; role: "patient" | "doctor" | "admin"; fullName: string };

const roleLabel = { patient: "Patient", doctor: "Clinician", admin: "Administrator" } as const;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

export default function SiteNav() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const pathname = usePathname() ?? "";
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.assign("/");
  }
  const dashboard = user?.role === "admin" ? "/admin/dashboard" : user?.role === "doctor" ? "/doctor/dashboard" : "/dashboard";
  const links = [
    { href: "/", key: "home", icon: Home },
    { href: "/hospitals", key: "hospitals", icon: HeartPulse },
    { href: "/map", key: "map", icon: MapPin },
    { href: "/symptoms", key: "symptoms", icon: Stethoscope },
    { href: "/risk", key: "risk", icon: Gauge },
    { href: "/predictor", key: "predictor", icon: BookOpen },
    { href: "/wellness", key: "wellness", icon: Sparkles },
    { href: "/tools", key: "tools", icon: Wrench },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      {/* Desktop: Instagram-style left sidebar */}
      <aside className="sidebar" aria-label="Sidebar navigation">
        <Link href="/" className="brand side-brand"><span className="brand-mark"><Activity size={19} /></span><span className="side-label">Medintel</span></Link>
        <nav className="side-nav" aria-label="Main navigation">
          {links.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href} className={`side-link ${isActive(href) ? "active" : ""}`} aria-current={isActive(href) ? "page" : undefined} title={t(key)}>
              <Icon size={22} /><span className="side-label">{t(key)}</span>
            </Link>
          ))}
          {user ? (
            <Link href={dashboard} className={`side-link side-profile ${isActive(dashboard) ? "active" : ""}`} aria-current={isActive(dashboard) ? "page" : undefined} title="My dashboard">
              <span className="avatar" aria-hidden="true">{initials(user.fullName)}</span>
              <span className="side-label"><strong>My dashboard</strong><small>{user.fullName} · {roleLabel[user.role]}</small></span>
            </Link>
          ) : (
            <Link href="/login" className={`side-link ${isActive("/login") ? "active" : ""}`} title={t("login")}>
              <UserRound size={22} /><span className="side-label">{t("login")}</span>
            </Link>
          )}
        </nav>
        <div className="side-foot">
          {!user && <Link className="btn side-cta" href="/register/patient">{t("start")}</Link>}
          <div className="side-tools side-label"><LanguageControl /><ThemeControls /></div>
          {user && <button className="side-link side-signout" onClick={signOut} title={t("signout")}><LogOut size={22} /><span className="side-label">{t("signout")}</span></button>}
        </div>
      </aside>

      {/* Mobile and tablet: original top bar */}
      <header className="topbar">
        <Link href="/" className="brand"><span className="brand-mark"><Activity size={19} /></span>Medintel</Link>
        <button className="btn btn-secondary mobile-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><Menu size={18} /></button>
        <nav className={`nav-links ${open ? "nav-open" : ""}`} aria-label="Main navigation">
          {links.map(({ href, key }) => <Link key={href} href={href}>{t(key)}</Link>)}
        </nav>
        <div className="nav-actions">
          <LanguageControl />
          <ThemeControls />
          {user ? <><Link className="btn btn-secondary" href={dashboard}><UserRound size={16} />{user.fullName.split(" ")[0]}</Link><button className="btn btn-quiet" onClick={signOut} aria-label={t("signout")} title={t("signout")}><LogOut size={16} /></button></> : <><Link className="btn btn-secondary" href="/login">{t("login")}</Link><Link className="btn" href="/register/patient">{t("start")}</Link></>}
        </div>
      </header>
    </>
  );
}
