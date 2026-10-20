"use client";

import { useState } from "react";

interface CaseMeta {
  label: string;
  value: string;
  mono?: boolean;
}

interface VerificationCase {
  id: string;
  title: string;
  detailTitle: string;
  subtitle: string;
  subtitleMono: boolean;
  subject: string;
  subjectEmphasis: boolean;
  status: "review" | "intake" | "info" | "approved";
  statusLabel: string;
  assignedLabel: string;
  assignedValue: string;
  assignedStrong: boolean;
  timeLabel: string;
  timeClass: string;
  incident?: string;
  meta: CaseMeta[];
  reviewer: string;
  expiration: string;
  interval: string;
  sla: string;
  slaClass: string;
}

const cases: VerificationCase[] = [
  {
    id: "VRF-2024-9104",
    title: "Dr. Alistair Vance, MD - Chief Cardiologist",
    detailTitle: "Dr. Alistair Vance, MD",
    subtitle: "St. Jude Regional Medical Center",
    subtitleMono: false,
    subject: "State Medical License & DEA Schedule II-V Renewal",
    subjectEmphasis: true,
    status: "review",
    statusLabel: "Under Review",
    assignedLabel: "Assigned:",
    assignedValue: "Sarah Lin (Senior Auditor)",
    assignedStrong: true,
    timeLabel: "Expires in 18 hrs (High Priority)",
    timeClass: "text-amber-800 font-semibold",
    meta: [
      { label: "NPI", value: "1849204812", mono: true },
      { label: "State", value: "Illinois (IL)" },
      { label: "Facility", value: "St. Jude Regional Medical Center" },
    ],
    reviewer: "Sarah Lin (#AUD-42)",
    expiration: "Dec 15, 2026",
    interval: "24 Months (Tier-1)",
    sla: "18h 42m remaining",
    slaClass: "text-amber-700",
  },
  {
    id: "VRF-2024-9098",
    title: "Northshore Ambulatory Surgical Center",
    detailTitle: "Northshore Ambulatory Surgical Center",
    subtitle: "Facility ID: IL-SURG-4402",
    subtitleMono: true,
    subject: "Facility Accreditation (Joint Commission Renewal)",
    subjectEmphasis: false,
    status: "intake",
    statusLabel: "Pending Intake",
    assignedLabel: "Assigned:",
    assignedValue: "Unassigned",
    assignedStrong: true,
    timeLabel: "Received 2 hrs ago",
    timeClass: "text-slate-600",
    meta: [
      { label: "Facility ID", value: "IL-SURG-4402", mono: true },
      { label: "State", value: "Illinois (IL)" },
      { label: "Type", value: "Ambulatory Surgical Center" },
    ],
    reviewer: "Unassigned",
    expiration: "Mar 31, 2027",
    interval: "12 Months (Facility)",
    sla: "Intake triage not started",
    slaClass: "text-slate-600",
  },
  {
    id: "VRF-2024-9082",
    title: "BioScript Specialty Pharmacy",
    detailTitle: "BioScript Specialty Pharmacy",
    subtitle: "License: FL-PHARM-88319",
    subtitleMono: true,
    subject: "Pharmacy Compounding & Clean Room Certification",
    subjectEmphasis: false,
    status: "info",
    statusLabel: "More Info Needed",
    assignedLabel: "Assigned:",
    assignedValue: "Marcus Chen",
    assignedStrong: true,
    timeLabel: "Awaiting Provider Response",
    timeClass: "text-amber-800 font-semibold",
    incident: "⚠️ Missing Board of Pharmacy Clean Room Cert (USP <797>)",
    meta: [
      { label: "License", value: "FL-PHARM-88319", mono: true },
      { label: "State", value: "Florida (FL)" },
      { label: "Entity", value: "BioScript Pharmacy Group" },
    ],
    reviewer: "Marcus Chen (#AUD-17)",
    expiration: "Jun 30, 2026",
    interval: "12 Months (Pharmacy)",
    sla: "Paused - Provider Hold",
    slaClass: "text-amber-700",
  },
  {
    id: "VRF-2024-9065",
    title: "Elena Rostova, RN",
    detailTitle: "Elena Rostova, RN",
    subtitle: "NPI: 1092847119 | Multi-State eNLC",
    subtitleMono: true,
    subject: "Multi-State Nursing Compact (eNLC) Licensure Verified",
    subjectEmphasis: false,
    status: "approved",
    statusLabel: "Approved",
    assignedLabel: "Reviewer:",
    assignedValue: "Super Admin",
    assignedStrong: false,
    timeLabel: "Completed yesterday",
    timeClass: "text-emerald-700 font-medium",
    meta: [
      { label: "NPI", value: "1092847119", mono: true },
      { label: "Compact", value: "Multi-State eNLC" },
      { label: "Facility", value: "NovaCare Pediatrics" },
    ],
    reviewer: "Super Admin (Completed)",
    expiration: "Aug 31, 2027",
    interval: "24 Months (Tier-1)",
    sla: "Completed",
    slaClass: "text-emerald-700",
  },
];

const kpis = [
  { label: "Total In Review Queue", value: "14 Active", badge: "+3 new today", badgeClass: "text-emerald-600 bg-emerald-50", sub: "Across institutional & clinical pools", iconClass: "bg-teal-50 text-teal-700", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Awaiting Document Intake", value: "5 Pending", badge: "Needs initial triage", badgeClass: "text-amber-800 bg-amber-100/70", sub: "Awaiting cryptographic hash audit", iconClass: "bg-amber-50 text-amber-700", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Under Active Audit", value: "6 In Review", badge: "Reviewers assigned", badgeClass: "text-teal-700 flex items-center gap-1", badgeDot: "bg-teal-500", sub: "Average turnaround: 4.2 hours", iconClass: "bg-emerald-50 text-emerald-700", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Re-Verification Due (30D)", value: "28 Expiring", badge: "Scheduled re-checks", badgeClass: "text-slate-600 bg-slate-100", sub: "24-month credential cycle trigger", iconClass: "bg-slate-100 text-slate-600", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
];

const filterPills = [
  { label: "All Queues", count: "14", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "opacity-75 font-normal" },
  { label: "Pending Intake", count: "5", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-amber-600 font-bold" },
  { label: "Under Review", count: "6", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-amber-600 font-bold" },
  { label: "More Info Needed", count: "3", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-amber-600 font-bold" },
  { label: "Approved (Archive)", count: null as string | null, inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "" },
  { label: "Rejected (Archive)", count: null, inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "" },
];

const reviewTabs = [
  { label: "Evidence & Document Review", count: null as string | null },
  { label: "Provider Primary Source Registry", count: null },
  { label: "Verification History", count: "8" },
  { label: "Audit Logs & Signatures", count: null },
];

interface EvidenceItem {
  title: string;
  sub: string;
  subMono: boolean;
  foot: string;
  status: "verified" | "inspecting" | "pending";
}

const evidence: EvidenceItem[] = [
  { title: "State Medical Board License", sub: "IL #036-128941 (Active)", subMono: true, foot: "✓ Verified via automated state registry API", status: "verified" },
  { title: "Federal DEA Registration", sub: "DEA #BV9401825 (Sched II-V)", subMono: true, foot: "✓ Valid through Dec 2026", status: "verified" },
  { title: "Hospital Privileges Attestation", sub: "St. Jude Medical Staff Office", subMono: false, foot: "Ready for inspection in viewer", status: "inspecting" },
  { title: "Malpractice Insurance Certificate", sub: "$1M / $3M Agg. Coverage", subMono: false, foot: "Pending intake scan validation", status: "pending" },
];

export default function VerificationsContent() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("VRF-2024-9104");
  const [activeFilter, setActiveFilter] = useState<string>("Under Review");
  const [activeTab, setActiveTab] = useState<string>("Evidence & Document Review");
  const [activeEvidence, setActiveEvidence] = useState<number>(2);
  const [listSearch, setListSearch] = useState<string>("VRF-2024-9104");
  const [decisionNotes, setDecisionNotes] = useState<string>(
    "Primary source verified via IL IDFPR online verification clearinghouse. No adverse sanctions on file."
  );

  const selectedCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  return (
    <>
      {/* Page Title & Actions */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              National Verification &amp; Credentialing Clearinghouse
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SEC-TIER-0</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Credential &amp; Compliance Verifications Queue</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Manage provider licenses, organizational accreditations, and cryptographic identity submissions. Review protected evidence, track review SLAs, and record tamper-proof audit determinations.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            SLA Breach Warnings
            <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold">2</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0d5c52] hover:bg-teal-800 rounded-lg shadow-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            + Create Manual Verification Case
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">{kpi.label}</span>
              <span className={`p-1.5 rounded-lg ${kpi.iconClass}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d={kpi.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</span>
              <span className={`text-[11px] font-semibold px-1.5 py-0.2 rounded ${kpi.badgeClass}`}>
                {kpi.badgeDot && <span className={`w-1.5 h-1.5 rounded-full ${kpi.badgeDot} inline-block`}></span>}
                {kpi.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          {/* Filter Segment Pills */}
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {filterPills.map((pill) => (
              <button
                key={pill.label}
                onClick={() => setActiveFilter(pill.label)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeFilter === pill.label
                    ? "font-semibold bg-slate-900 text-white shadow-2xs"
                    : `font-medium ${pill.inactiveClass}`
                }`}
              >
                {pill.label}
                {pill.count && (
                  <span className={`ml-1 text-[11px] ${activeFilter === pill.label ? "text-teal-300 font-semibold" : pill.countClass}`}>
                    {pill.count}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-600 focus:border-teal-600">
              <option>Entity Type: All (Hospitals, Clinics, Providers, Pharmacies)</option>
              <option>Hospitals &amp; Medical Centers</option>
              <option>Specialized Outpatient Clinics</option>
              <option>Individual Providers (MD/DO/RN/PharmD)</option>
              <option>Licensed Pharmacy Networks</option>
            </select>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-600 focus:border-teal-600">
              <option>Priority: All</option>
              <option>Urgent / SLA At Risk</option>
              <option>Normal Priority</option>
            </select>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-600 focus:border-teal-600">
              <option>Reviewer: All Reviewers</option>
              <option>Assigned to Me</option>
              <option>Unassigned</option>
            </select>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Export Audit Log
            </button>
          </div>
        </div>
      </section>

      {/* Master-Detail Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT MASTER LIST */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* List Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
              <input
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 font-mono text-slate-800"
                placeholder="Filter cases..."
                type="text"
              />
            </div>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Sort: <strong>Urgency / SLA</strong></span>
          </div>
          {/* Queue List Items */}
          <div className="divide-y divide-slate-100 max-h-[660px] overflow-y-auto" role="list">
            {cases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              const itemClass = isSelected
                ? "p-4 bg-teal-50/40 border-l-4 border-teal-700 cursor-pointer transition-all hover:bg-teal-50/70"
                : c.status === "info"
                ? "p-4 hover:bg-amber-50/40 bg-amber-50/20 cursor-pointer transition-all border-l-4 border-amber-500"
                : c.status === "approved"
                ? "p-4 hover:bg-slate-50 cursor-pointer opacity-75 transition-all"
                : "p-4 hover:bg-slate-50 cursor-pointer transition-all";
              const chipClass = isSelected
                ? "font-mono font-bold text-xs text-slate-900 bg-white border border-teal-200 px-2 py-0.5 rounded shadow-2xs"
                : c.status === "approved"
                ? "font-mono font-semibold text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
                : c.status === "info"
                ? "font-mono font-semibold text-xs text-slate-800 bg-white border border-amber-200 px-2 py-0.5 rounded"
                : "font-mono font-semibold text-xs text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded";
              const statusChipClass =
                c.status === "review" || c.status === "info"
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  : c.status === "intake"
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                  : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
              const dotClass = c.status === "approved" ? "bg-emerald-500" : c.status === "intake" ? "bg-amber-500" : "bg-amber-600";
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={itemClass}
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={chipClass}>{c.id}</span>
                      {isSelected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800 text-white">
                          Selected View
                        </span>
                      )}
                    </div>
                    <span className={statusChipClass}>
                      {c.status !== "approved" && <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>}
                      {c.statusLabel}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className={`text-xs font-bold ${c.status === "approved" ? "text-slate-700" : "text-slate-900"}`}>{c.title}</p>
                    <p className={`text-[11px] ${c.subtitleMono ? "font-mono" : ""} ${c.status === "approved" ? "text-slate-400" : "text-slate-500"}`}>
                      {c.subtitle}
                    </p>
                  </div>
                  {c.incident && (
                    <div className="mt-2 p-1.5 rounded bg-amber-100/60 border border-amber-200 text-[10px] text-amber-900 font-medium">
                      {c.incident}
                    </div>
                  )}
                  {!c.incident && (
                    <div className="mt-2 text-[11px]">
                      <span className={c.subjectEmphasis ? "text-slate-700 font-medium" : "text-slate-500"}>{c.subject}</span>
                    </div>
                  )}
                  <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isSelected ? "border-teal-100 text-slate-500" : c.status === "info" ? "border-amber-100 text-slate-400" : "border-slate-100 text-slate-400"
                  }`}>
                    <span>
                      {c.assignedLabel}{" "}
                      {c.assignedStrong ? <strong className={isSelected ? "text-slate-700" : "text-slate-500"}>{c.assignedValue}</strong> : c.assignedValue}
                    </span>
                    <span className={c.timeClass}>{c.timeLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* List Footer */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Showing <strong>1-4</strong> of 14 cases</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-600 disabled:opacity-40" disabled>Prev</button>
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-600">Next</button>
            </div>
          </div>
        </div>

        {/* RIGHT DETAIL WORKSPACE */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* Detail Header */}
          <div className="p-6 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-white border border-teal-200 px-2 py-0.5 rounded shadow-2xs">{selectedCase.id}</span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">{selectedCase.detailTitle}</h3>
                  {selectedCase.status === "approved" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Approved
                    </span>
                  ) : selectedCase.status === "intake" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pending Intake
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> {selectedCase.statusLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-2 flex-wrap">
                  {selectedCase.meta.map((m, i) => (
                    <span key={m.label} className="inline-flex items-center gap-2">
                      {i > 0 && <span className="text-slate-300">|</span>}
                      {m.label}: <strong className={m.mono ? "font-mono text-slate-800" : "text-slate-800"}>{m.value}</strong>
                    </span>
                  ))}
                </p>
              </div>
              {/* Reviewer assignment indicator */}
              <div className="text-left sm:text-right shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reviewer Assignment</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-semibold text-slate-800">{selectedCase.reviewer}</span>
                  <button className="text-[11px] font-semibold text-teal-700 hover:underline">Reassign</button>
                </div>
              </div>
            </div>

            {/* Expiry & Cycle Tracking Bar */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50/60 p-2.5 rounded-lg border border-slate-200/80">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">License Expiration</span>
                <span className="font-semibold text-slate-800 font-mono">{selectedCase.expiration}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Re-verification Interval</span>
                <span className="font-semibold text-slate-800">{selectedCase.interval}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">SLA Timer</span>
                <span className={`font-semibold ${selectedCase.slaClass}`}>{selectedCase.sla}</span>
              </div>
            </div>

            {/* Protected Access & Audit Seal Callout */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3 shadow-2xs">
              <div className="p-1 rounded-md bg-teal-100 text-teal-800 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-0.5">Protected Access &amp; Audit Seal:</h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  All document previews are watermarked with your session ID (<span className="font-mono font-semibold text-teal-800 bg-teal-50 px-1 py-0.2 rounded">RM-9941</span>) and logged to immutable HIPAA clearance audit logs. Access is restricted to authorized credentialing officers.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-medium bg-white">
            {reviewTabs.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`py-3 flex items-center gap-1.5 transition-colors ${
                  activeTab === tab.label
                    ? "text-teal-800 border-b-2 border-teal-700 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {tab.count && (
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px] font-bold">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="p-6 space-y-6">
            {/* Checklist & Document Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Required Evidence Checklist (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Required Evidence Checklist</h4>
                <div className="space-y-2 text-xs">
                  {evidence.map((item, index) => {
                    const isActive = index === activeEvidence;
                    const boxClass = isActive
                      ? "p-3 rounded-lg border-2 border-teal-600 bg-teal-50/40 shadow-xs"
                      : item.status === "verified"
                      ? "p-3 rounded-lg border border-emerald-200 bg-emerald-50/50"
                      : "p-3 rounded-lg border border-slate-200 bg-slate-50/60";
                    const titleClass = isActive ? "font-bold text-teal-900 block" : item.status === "verified" ? "font-bold text-slate-900 block" : "font-bold text-slate-700 block";
                    const footClass = isActive
                      ? "text-[10px] text-teal-700 font-semibold mt-1"
                      : item.status === "verified"
                      ? "text-[10px] text-emerald-700 mt-1 font-medium"
                      : "text-[10px] text-slate-400 mt-1";
                    return (
                      <div key={item.title} onClick={() => setActiveEvidence(index)} className={`${boxClass} cursor-pointer transition-colors`}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 ${isActive ? "text-teal-700" : item.status === "verified" ? "text-emerald-700" : "text-slate-400"}`}>
                            {item.status === "verified" && !isActive ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                              </svg>
                            ) : item.status === "pending" && !isActive ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                              </svg>
                            )}
                          </span>
                          <div>
                            <span className={titleClass}>{item.title}</span>
                            <span className={`text-[11px] ${item.subMono ? "font-mono" : ""} text-slate-600`}>{item.sub}</span>
                            <p className={footClass}>{isActive ? "Currently Inspecting in Viewer →" : item.foot}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Document Preview Viewer (7 cols) */}
              <div className="lg:col-span-7 flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                {/* Document Viewer Toolbar */}
                <div className="p-2.5 bg-slate-800 text-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-[11px] text-teal-300">IL_MED_LIC_036128941.pdf</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Page 1/2</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 font-mono text-[11px]">Zoom 100%</button>
                    <button className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px]" title="Rotate">Rotate</button>
                    <button className="px-2 py-1 rounded bg-teal-800 hover:bg-teal-700 text-teal-100 font-semibold text-[11px]">Download Watermarked</button>
                  </div>
                </div>
                {/* Document Body Mockup with Watermark */}
                <div className="p-5 bg-white relative min-h-[300px] flex flex-col justify-between overflow-hidden shadow-inner">
                  {/* Diagonal Audit Watermark Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center -rotate-12 opacity-10 select-none">
                    <span className="text-2xl font-bold font-mono tracking-widest text-slate-900 text-center">
                      CONFIDENTIAL - AUDIT ACCESS ONLY<br />SESSION: RM-9941 • MEDOS SECURITY
                    </span>
                  </div>
                  {/* Document Header */}
                  <div className="border-b pb-3 border-slate-200 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-widest text-slate-400">State of Illinois Regulatory Authority</p>
                    <h5 className="text-xs font-bold text-slate-900 tracking-wide mt-0.5">DEPARTMENT OF FINANCIAL &amp; PROFESSIONAL REGULATION</h5>
                    <p className="text-[10px] text-slate-600 font-medium">DIVISION OF PROFESSIONAL REGULATION • MEDICAL BOARD OF EXAMINERS</p>
                  </div>
                  {/* Document Content Details */}
                  <div className="py-3 space-y-2 text-xs text-slate-800">
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 text-[11px]">Licensee Name:</span>
                      <span className="font-bold font-mono">ALISTAIR VANCE, MD</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 text-[11px]">License Number &amp; Category:</span>
                      <span className="font-mono font-bold text-teal-800">036-128941 • Licensed Physician &amp; Surgeon</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500 text-[11px]">Issuance &amp; Expiration:</span>
                      <span className="font-mono">Oct 14, 2014 — Dec 15, 2026</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500 text-[11px]">Primary Source Status:</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ACTIVE &amp; IN GOOD STANDING
                      </span>
                    </div>
                  </div>
                  {/* Document Official Seal Mock */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>DIGITAL SEAL HASH: a9f884...e31b</span>
                    <span>TIMESTAMP: 2024-10-14 09:12:04 UTC</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviewer Decision & Action Controls */}
            <div className="border-t border-slate-200 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Reviewer Determination &amp; Cryptographic Sign-Off</h4>
              {/* Decision Reason & Notes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Recorded Decision Notes / Mandated Justification:</label>
                <input
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-800"
                  placeholder="Enter verification justification, state board registration verification confirmation, or specific deficiencies..."
                  type="text"
                />
              </div>
              {/* Action Buttons & Audit Stamp */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0d5c52] hover:bg-teal-800 rounded-lg shadow-sm transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Approve Credential
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Request Additional Info
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50/80 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Reject Submission
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-mono text-left sm:text-right">
                  <span>Reviewer: <strong>Super Admin (admin@medpulse.network)</strong></span><br />
                  <span>Audit Stamp: SHA-256 auto-sealed on decision</span>
                </div>
              </div>
            </div>
          </div>
          {/* End Tab Content */}
        </div>
        {/* End Right Detail Workspace */}
      </section>
      {/* End Master-Detail Grid */}
    </>
  );
}


