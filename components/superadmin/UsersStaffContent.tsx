"use client";

import { useState } from "react";

interface User {
  id: string;
  initials: string;
  name: string;
  subtitle: string;
  badgeLabel: string;
  badgeClass: string;
  status: "active" | "suspended" | "pending";
  statusClass: string;
  facilityCount: number;
  npi: string;
  regions: string;
  email: string;
}

const users: User[] = [
  { id: "vance", initials: "MV", name: "Dr. Marcus Vance, MD", subtitle: "Chief Cardiologist • St. Jude Medical", badgeLabel: "Verified Provider (Tier 3)", badgeClass: "bg-emerald-100 text-emerald-900", status: "active", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", facilityCount: 2, npi: "1849204812", regions: "IL • TX", email: "dr.marcus@medos.network" },
  { id: "rostova", initials: "ER", name: "Elena Rostova, RN", subtitle: "Staff Nurse • NovaCare Specialized Peds", badgeLabel: "Verified Practitioner", badgeClass: "bg-teal-50 text-teal-800", status: "active", statusClass: "bg-teal-50 text-teal-800 border border-teal-200", facilityCount: 1, npi: "1092847120", regions: "TX", email: "elena@novacare-peds.com" },
  { id: "miller", initials: "DM", name: "David K. Miller", subtitle: "Patient / Cardholder", badgeLabel: "Level 1 Verified", badgeClass: "bg-slate-100 text-slate-800", status: "pending", statusClass: "bg-amber-50 text-amber-800 border border-amber-200", facilityCount: 0, npi: "US-PAT-3381042", regions: "IL", email: "david.miller@example.com" },
  { id: "jenkins", initials: "SJ", name: "Sarah Jenkins, PharmD", subtitle: "Clinical Pharmacist • BioScript Pharmacy", badgeLabel: "Licensed Pharmacist", badgeClass: "bg-teal-50 text-teal-800", status: "active", statusClass: "bg-teal-50 text-teal-800 border border-teal-200", facilityCount: 1, npi: "TX-PHAR-9932", regions: "FL", email: "sarah@bioscript.com" },
  { id: "sterling", initials: "RS", name: "Dr. Robert Sterling, DO", subtitle: "Anesthesiologist • Apex Diagnostic Labs", badgeLabel: "Suspended (Audit Hold)", badgeClass: "bg-rose-100 text-rose-800", status: "suspended", statusClass: "bg-rose-50 text-rose-800 border border-rose-200", facilityCount: 1, npi: "1993021495", regions: "GA", email: "robert.sterling@apexdiagnostics.com" },
];

export default function UsersStaffContent() {
  const [selectedId, setSelectedId] = useState<string>("vance");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredUsers = users.filter((user) => {
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      user.subtitle.toLowerCase().includes(q) ||
      user.npi.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.regions.toLowerCase().includes(q) ||
      user.badgeLabel.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users & Staff Directory</h1>
            <p className="text-xs text-slate-500 mt-1">Search and verify healthcare staff and personnel.</p>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900" placeholder="Search by name, NPI, or email..." type="text" />
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total Users</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Active</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{users.filter((u) => u.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Pending</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{users.filter((u) => u.status === "pending").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Suspended</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{users.filter((u) => u.status === "suspended").length}</p>
        </div>
      </section>

      {/* User Cards */}
      <section className="flex flex-col gap-3">
        {filteredUsers.map((user) => (
          <div key={user.id}
            onClick={() => setSelectedId(user.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              user.id === selectedId ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                user.id === selectedId ? "bg-[#0d5c52] text-white" : "bg-slate-100 text-slate-700"
              }`}>
                {user.initials}
              </div>
              <div className="min-w-0">
                <h3 className={`font-bold text-slate-900 truncate ${user.id === selectedId ? "text-[#0d5c52]" : ""}`}>{user.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user.subtitle}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">NPI: {user.npi}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${user.badgeClass}`}>{user.badgeLabel}</span>
              <span className="text-[11px] text-slate-500">{user.facilityCount} facility{user.facilityCount === 1 ? "y" : "ies"} • {user.regions}</span>
              <span className="text-[11px] font-mono text-slate-500">{user.email}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${user.statusClass}`}>{user.status}</span>
            </div>
          </div>
        ))}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing 1–5 of 482,910 users • Search filters apply
      </p>
    </div>
  );
}
