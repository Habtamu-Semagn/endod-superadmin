"use client";

import { useState } from "react";

interface Case {
  id: string;
  title: string;
  subtitle: string;
  status: "review" | "intake" | "info" | "approved";
  statusLabel: string;
  statusClass: string;
  assigned: string;
  assignee: string;
  sla: string;
  organisation: string;
  license: string;
  phone: string;
  cityAddress: string;
}

const cases: Case[] = [
  { id: "VRF-2024-9104", title: "Dr. Alistair Vance, MD - Chief Cardiologist", subtitle: "St. Jude Regional Medical Center", status: "review", statusLabel: "Under Review", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", assigned: "Assigned to:", assignee: "Sarah Lin (Senior Auditor)", sla: "18h 42m remaining", organisation: "St. Jude Regional Medical Center", license: "IL-HOSP-9482", phone: "+1 (312) 555-0192", cityAddress: "Chicago, IL 60611" },
  { id: "VRF-2024-9098", title: "Northshore Ambulatory Surgical Center", subtitle: "Facility ID: IL-SURG-4402", status: "intake", statusLabel: "Pending Intake", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", assigned: "Unassigned", assignee: "—", sla: "Intake triage not started", organisation: "Northshore Ambulatory Surgical Center", license: "IL-SURG-4402", phone: "+1 (312) 555-0421", cityAddress: "Chicago, IL 60611" },
  { id: "VRF-2024-9082", title: "BioScript Specialty Pharmacy", subtitle: "License: FL-PHARM-88319", status: "info", statusLabel: "More Info Needed", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", assigned: "Assigned to:", assignee: "Marcus Chen", sla: "Paused - Provider Hold", organisation: "BioScript Pharmacy Group", license: "FL-PHARM-88319", phone: "+1 (312) 555-0333", cityAddress: "Miami, FL 33101" },
  { id: "VRF-2024-9065", title: "Elena Rostova, RN", subtitle: "NPI: 1092847119 | Multi-State eNLC", status: "approved", statusLabel: "Approved", statusClass: "bg-emerald-100 text-emerald-800 border border-emerald-200", assigned: "Reviewed by:", assignee: "Super Admin", sla: "Completed", organisation: "NovaCare Pediatrics", license: "TX-CLIN-1049", phone: "+1 (312) 555-0245", cityAddress: "Austin, TX 78701" },
];

export default function VerificationsContent() {
  const [selectedId, setSelectedId] = useState<string>("VRF-2024-9104");
  const [search, setSearch] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("All Queues");

  const selectedCase = cases.find((c) => c.id === selectedId) || cases[0];

  const filteredCases = cases.filter((c) => {
    const matchesFilter =
      activeFilter === "All Queues" || c.statusLabel === activeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.organisation.toLowerCase().includes(q) ||
      c.license.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.cityAddress.toLowerCase().includes(q) ||
      c.assignee.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
  const filterPills = [
    { label: "All Queues", active: activeFilter === "All Queues" },
    { label: "Under Review", active: activeFilter === "Under Review" },
    { label: "Pending Intake", active: activeFilter === "Pending Intake" },
    { label: "More Info Needed", active: activeFilter === "More Info Needed" },
    { label: "Approved", active: activeFilter === "Approved" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verifications</h1>
            <p className="text-xs text-slate-500 mt-1">{selectedCase.organisation}</p>
          </div>
          <button className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
            Register Organisation
          </button>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900" placeholder="Search by organisation, licence number, or assignee..." type="text" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterPills.map((pill) => (
            <button key={pill.label} onClick={() => setActiveFilter(pill.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeFilter === pill.label
                  ? "bg-[#0d5c52] text-white border-[#0d5c52]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}>
              {pill.label}
            </button>
          ))}
        </div>
      </section>

      {/* Verification Slots */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredCases.map((caseItem) => (
          <div key={caseItem.id}
            onClick={() => setSelectedId(caseItem.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              caseItem.id === selectedId ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}>
            <div className="flex items-start justify-between">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{caseItem.id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${caseItem.statusClass}`}>{caseItem.statusLabel}</span>
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-sm">{caseItem.title}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{caseItem.subtitle}</p>
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 font-mono">
              <p>{caseItem.organisation}</p>
              <p>License: {caseItem.license}</p>
              <p>Phone: {caseItem.phone}</p>
              <p>{caseItem.cityAddress}</p>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800">{caseItem.assigned} <strong>{caseItem.assignee}</strong></span>
              <span className="text-slate-400">•</span>
              <span className="font-mono">{caseItem.sla}</span>
            </div>
          </div>
        ))}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing 1–4 of 14 verification cases • Search filters apply
      </p>
    </div>
  );
}
