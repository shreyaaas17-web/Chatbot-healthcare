import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, HeartPulse, ShieldCheck, Sparkles, Stethoscope, Wrench, MapPin, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProfileStat = { label: string; value: string | number };
export type Highlight = { href: string; label: string; icon: LucideIcon };

export const patientHighlights: Highlight[] = [
  { href: "/book", label: "Book", icon: CalendarDays },
  { href: "/symptoms", label: "Symptoms", icon: Stethoscope },
  { href: "/wellness", label: "Wellness", icon: Sparkles },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/map", label: "Care map", icon: MapPin },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

export const doctorHighlights: Highlight[] = [
  { href: "/hospitals", label: "Facilities", icon: HeartPulse },
  { href: "/map", label: "Care map", icon: MapPin },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

export const adminHighlights: Highlight[] = [
  { href: "/hospitals", label: "Facilities", icon: HeartPulse },
  { href: "/register/doctor", label: "Add clinician", icon: Users },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";

/** Instagram-style profile header: big avatar, name, stats row, bio lines, and shortcut "highlights". */
export default function ProfileHeader({ name, role, lines = [], stats, actions, highlights = [] }: {
  name: string;
  role: string;
  lines?: string[];
  stats: ProfileStat[];
  actions?: ReactNode;
  highlights?: Highlight[];
}) {
  return (
    <section className="profile-header" aria-label="Profile">
      <div className="profile-main">
        <div className="profile-avatar" aria-hidden="true"><span>{initials(name)}</span></div>
        <div className="profile-info">
          <div className="profile-top">
            <h2 className="profile-name">{name}</h2>
            <span className="badge">{role}</span>
            {actions && <div className="inline">{actions}</div>}
          </div>
          <dl className="profile-stats">
            {stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          {lines.length > 0 && <div className="profile-bio">{lines.map((line) => <p key={line}>{line}</p>)}</div>}
        </div>
      </div>
      {highlights.length > 0 && (
        <nav className="highlights" aria-label="Shortcuts">
          {highlights.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="highlight"><span className="highlight-ring"><Icon size={22} /></span><small>{label}</small></Link>
          ))}
        </nav>
      )}
    </section>
  );
}
