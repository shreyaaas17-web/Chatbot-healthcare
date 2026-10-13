"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProfileHeader, { adminHighlights } from "@/components/ProfileHeader";

type Count = { count: number };
type Overview = {
  roles: ({ role: string } & Count)[];
  statuses: ({ status: string } & Count)[];
  totals: { hospitals?: number; doctors?: number; appointments?: number; upcoming?: number };
  recentAppointments: { id: number; visit_date: string; time_slot: string; status: string; doctor_name: string; hospital_name: string }[];
  recentUsers: { id: number; full_name: string; email: string; role: string; created_at: string }[];
  topSpecialties: ({ specialization: string } & Count)[];
};

function Bars({ rows, label }: { rows: { name: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return <div className="bar-list" role="list" aria-label={label}>{rows.map((row) => <div className="bar-row" role="listitem" key={row.name}><span>{row.name}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(row.count / max) * 100}%` }} /></div><strong>{row.count}</strong></div>)}</div>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Administrator");
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((response) => response.json()).then((body) => { if (body.user?.fullName) setName(body.user.fullName); }).catch(() => {});
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Unable to load the admin overview.");
        setData(body);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load the admin overview."))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="card">Loading admin overview…</div>;
  if (error || !data) return <section className="form-card"><h1>Admin dashboard</h1><p className="notice notice-error">{error || "No data."}</p><Link className="btn" href="/login">Sign in as administrator</Link></section>;
  const roleCount = (role: string) => data.roles.find((item) => item.role === role)?.count ?? 0;
  return (
    <>
      <ProfileHeader name={name} role="Administrator" lines={[`${data.totals.upcoming ?? 0} upcoming appointments across the platform`]} stats={[{ label: "patients", value: roleCount("patient") }, { label: "clinicians", value: roleCount("doctor") }, { label: "appointments", value: data.totals.appointments ?? 0 }]} highlights={adminHighlights} />
      <section className="section split">
        <div className="card"><div className="eyebrow">APPOINTMENT STATUS</div><Bars label="Appointments by status" rows={data.statuses.map((item) => ({ name: item.status, count: item.count }))} /></div>
        <div className="card"><div className="eyebrow">BUSIEST SPECIALTIES</div><Bars label="Appointments by specialty" rows={data.topSpecialties.map((item) => ({ name: item.specialization, count: item.count }))} /></div>
      </section>
      <section className="section">
        <div className="section-head"><div><div className="eyebrow">LATEST ACTIVITY</div><h2>Recent appointments</h2><p className="muted">Health details are intentionally not shown here.</p></div></div>
        <div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Date</th><th>Time</th><th>Clinician</th><th>Facility</th><th>Status</th></tr></thead><tbody>{data.recentAppointments.map((item) => <tr key={item.id}><td>{String(item.visit_date).slice(0, 10)}</td><td>{item.time_slot}</td><td>{item.doctor_name}</td><td>{item.hospital_name}</td><td><span className="badge">{item.status}</span></td></tr>)}{!data.recentAppointments.length && <tr><td colSpan={5}>No appointments yet.</td></tr>}</tbody></table></div>
      </section>
      <section className="section">
        <div className="section-head"><div><div className="eyebrow">ACCOUNTS</div><h2>Newest users</h2></div></div>
        <div style={{ overflowX: "auto" }}><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>{data.recentUsers.map((item) => <tr key={item.id}><td>{item.full_name}</td><td>{item.email}</td><td><span className="badge">{item.role}</span></td><td>{String(item.created_at).slice(0, 10)}</td></tr>)}</tbody></table></div>
      </section>
      <p className="muted">{data.totals.hospitals ?? 0} facilities · {data.totals.doctors ?? 0} clinician profiles · demo data only.</p>
    </>
  );
}
