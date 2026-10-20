"use client";

import { useState } from "react";

interface Organisation {
  id: string;
  initials: string;
  name: string;
  shortName: string;
  type: string;
  location: string;
  license: string;
  facilityLabel: string;
  facilityCount: number;
  statusBadge: string;
  statusBadgeClass: string;
}

const organisations: Organisation[] = [
  {
    id: "stj",
    initials: "STJ",
    name: "St. Jude Regional Medical Center",
    shortName: "St. Jude Regional Center",
    type: "General Hospital",
    location: "Chicago, IL",
    license: "IL-HOSP-9482",
    facilityLabel: "Facilities",
    facilityCount: 12,
    statusBadge: "Audit Level 2",
    statusBadgeClass: "bg-amber-50 text-amber-800 border border-amber-200",
  },
  {
    id: "nvc",
    initials: "NV",
    name: "NovaCare Specialized Pediatrics",
    shortName: "NovaCare Specialized Pediatrics",
    type: "Pediatrics Clinic",
    location: "Austin, TX",
    license: "TX-CLIN-1049",
    facilityLabel: "Facilities",
    facilityCount: 4,
    statusBadge: "Doc Review",
    statusBadgeClass: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  {
    id: "apx",
    initials: "AX",
    name: "Apex Diagnostic Labs Network",
    shortName: "Apex Diagnostic Labs",
    type: "Pathology & Lab",
    location: "San Jose, CA",
    license: "CA-LAB-8812",
    facilityLabel: "Lab Points",
    facilityCount: 28,
    statusBadge: "Active",
    statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  {
    id: "bsc",
    initials: "BS",
    name: "BioScript Pharmacy Group",
    shortName: "BioScript Pharmacy Group",
    type: "Retail Pharmacy",
    location: "Miami, FL",
    license: "FL-PHAR-4401",
    facilityLabel: "Branches",
    facilityCount: 62,
    statusBadge: "Active",
    statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
];

const filterPills = [
  { label: "All", count: "1,248", active: true, className: "" },
  { label: "Active", count: "1,180", active: false, className: "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80" },
  { label: "Pending Verification", count: "38", active: false, className: "bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100" },
  { label: "Suspended", count: "14", active: false, className: "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80" },
  { label: "Review Needed", count: "16", active: false, className: "bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100" },
];

const tabs = [
  { label: "Overview & Metrics", count: null as string | null, active: true },
  { label: "Facilities", count: "12", active: false },
  { label: "Staff & Accounts", count: "148", active: false },
  { label: "Verification & Docs", count: "5", active: false },
  { label: "Services & Formularies", count: null, active: false },
  { label: "Activity & Audit Log", count: null, active: false },
];

const kpis = [
  { label: "Connected Facilities", value: "12", change: "+1 Clinic", changeClass: "text-emerald-600", sub: "450 General beds total", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", iconClass: "text-teal-700" },
  { label: "Verified Providers", value: "245", change: "98% Synced", changeClass: "text-emerald-600", sub: "Active Medical Staff", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", iconClass: "text-teal-700" },
  { label: "Digital Cards Issued", value: "18,420", change: "Live NFC", changeClass: "text-teal-600", sub: "Patient records secured", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", iconClass: "text-teal-700" },
  { label: "30D Claim Sync Rate", value: "99.94%", change: "Normal", changeClass: "text-emerald-600", sub: "0.06% latency threshold", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", iconClass: "text-emerald-600" },
];

const documents = [
  { type: "PDF", name: "IL_DPH_Hospital_Lic.pdf", meta: "Verified by SuperAdmin", typeClass: "bg-rose-50 border border-rose-200 text-rose-700" },
  { type: "PDF", name: "DEA_Controlled_Substance_Reg.pdf", meta: "Valid thru 2026", typeClass: "bg-rose-50 border border-rose-200 text-rose-700" },
  { type: "PEM", name: "TLS_Gateway_Public_Key.pem", meta: "Automated Auth Key", typeClass: "bg-teal-50 border border-teal-200 text-teal-800" },
];

const timeline = [
  { title: "Level 2 Annual Compliance Audit Initiated", time: "Today, 09:20 AM", desc: "Automated prompt triggered by MedOS Gateway for updated formulary dispensing registry verification.", dotClass: "bg-amber-500 ring-amber-100" },
  { title: "Primary Admin Re-verification Completed", time: "Oct 12, 2023", desc: "Dr. Evelyn Reed reaffirmed as Root Contact with hardware security token confirmation.", dotClass: "bg-emerald-500 ring-emerald-100" },
  { title: "Organization Registered and Provisioned", time: "Oct 14, 2021", desc: "Initial onboarding and issuance of network tenant partition with 12 facility child tokens.", dotClass: "bg-slate-400 ring-slate-100" },
];

export default function OrganisationsContent() {
  const [selectedOrg, setSelectedOrg] = useState<string>("stj");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<string>("Overview & Metrics");

  const selectedOrgData = organisations.find((o) => o.id === selectedOrg) || organisations[0];

  return (
    <>
      {/* Header & CTAs */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Organisations Directory &amp; Lifecycle Management
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Search, verify, onboard, manage facilities, audit compliance, and control operational status across network entities.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>Export Audit CSV</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#0d5c52] hover:bg-[#09473f] text-white shadow-sm transition-all shadow-teal-900/10">
            <svg className="w-4 h-4 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span>+ Register / Add Organization</span>
          </button>
        </div>
      </section>

      {/* Filter Pills Bar */}
      <section className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {filterPills.map((pill) => (
            <button
              key={pill.label}
              onClick={() => setActiveFilter(pill.label)}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-colors whitespace-nowrap ${
                activeFilter === pill.label
                  ? "font-bold bg-[#0d5c52] text-white shadow-sm"
                  : `font-medium ${pill.className}`
              }`}
            >
              {pill.label}{" "}
              <span className={`ml-1 text-[11px] ${activeFilter === pill.label ? "opacity-80" : "text-slate-400 font-normal"}`}>
                {pill.count}
              </span>
            </button>
          ))}
        </div>
        <div className="hidden xl:flex items-center gap-2">
          <select className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-slate-600 focus:ring-teal-600 focus:border-teal-600">
            <option>Entity Type: All Types</option>
            <option>General Hospital</option>
            <option>Specialized Clinic</option>
            <option>Pharmacy Chain</option>
            <option>Diagnostic Lab</option>
          </select>
          <select className="text-xs bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-slate-600 focus:ring-teal-600 focus:border-teal-600">
            <option>Region: All States</option>
            <option>Illinois (IL)</option>
            <option>Texas (TX)</option>
            <option>California (CA)</option>
            <option>New York (NY)</option>
          </select>
        </div>
      </section>

      {/* Master-Detail Split Layout */}
      <section className="grid grid-cols-12 gap-6 items-start">
        {/* Left Column: Directory List */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Organizations (Filtered: 1,248)
            </span>
            <span className="text-[11px] text-teal-700 font-semibold cursor-pointer hover:underline">
              Clear Filters
            </span>
          </div>

          {organisations.map((org) => (
            <div
              key={org.id}
              onClick={() => setSelectedOrg(org.id)}
              className={`p-4 rounded-2xl bg-white shadow-sm cursor-pointer transition-all ${
                org.id === selectedOrg
                  ? "border-2 border-teal-600 relative"
                  : "border border-slate-200 hover:border-slate-300"
              }`}
            >
              {org.id === selectedOrg && (
                <div className="absolute -top-2.5 right-4 bg-teal-600 text-white font-mono text-[10px] tracking-wider px-2 py-0.5 rounded-full uppercase font-bold shadow-sm">
                  SELECTED VIEW
                </div>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    org.id === selectedOrg
                      ? "bg-teal-50 border border-teal-200 text-teal-800"
                      : "bg-slate-100 border border-slate-200 text-slate-700"
                  }`}
                >
                  {org.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{org.shortName}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${org.statusBadgeClass}`}>
                      {org.statusBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <span>{org.type}</span>
                    <span>•</span>
                    <span>{org.location}</span>
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>LIC: {org.license}</span>
                    <span className={org.id === selectedOrg ? "text-emerald-700 font-medium" : "text-slate-600"}>
                      {org.facilityCount} {org.facilityLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing 1-4 of 1,248</span>
            <div className="flex gap-1">
              <button className="px-2 py-1 rounded border bg-white text-slate-400 cursor-not-allowed">Prev</button>
              <button className="px-2 py-1 rounded border bg-white hover:bg-slate-50 text-slate-700">Next</button>
            </div>
          </div>
        </div>

        {/* Right Column: Detail View */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Organization Header */}
            <div className="p-6 bg-gradient-to-r from-teal-900/[0.03] to-transparent border-b border-slate-100">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#0d5c52] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {selectedOrgData.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{selectedOrgData.name}</h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        Verified Provider Network
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        <strong>License ID:</strong>{" "}
                        <span className="font-mono text-slate-700">{selectedOrgData.license}</span>
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Entity Type:</strong> Non-Profit General Hospital &amp; Teaching Health System
                      </span>
                      <span>•</span>
                      <span>
                        <strong>HQ:</strong> 251 E Huron St, Chicago, IL 60611
                      </span>
                    </p>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-4">
                      <span>
                        Onboarded: <strong className="text-slate-700">Oct 14, 2021</strong>
                      </span>
                      <span>
                        License Expiry: <strong className="text-slate-700">Nov 30, 2026 (Active)</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Pending Level 2 Audit
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Last inspected 2 hours ago</p>
                </div>
              </div>

              {/* Lifecycle Actions Toolbar */}
              <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 -mx-6 -mb-6 px-6 py-3.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mr-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-teal-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Lifecycle Actions:
                  </span>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>Approve Organization</span>
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 transition-colors">
                    Request Additional Info
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors">
                    Reject
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
                    title="Record Reason: License audit discrepancy"
                  >
                    <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span>Suspend Organization</span>
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors">
                    Activate
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="px-6 border-b border-slate-200 bg-white">
              <nav className="flex space-x-6 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`py-3 text-xs flex items-center gap-1.5 whitespace-nowrap transition-colors border-b-2 ${
                      activeTab === tab.label
                        ? "border-[#0d5c52] text-[#0d5c52] font-bold"
                        : "border-transparent text-slate-500 hover:text-slate-700 font-medium"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          tab.label === "Verification & Docs"
                            ? "bg-emerald-100 text-emerald-800 font-semibold"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Body Content */}
            <div className="p-6 space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-slate-50/70 border border-slate-200/70 p-4 rounded-xl">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                      <span>{kpi.label}</span>
                      <svg className={`w-4 h-4 ${kpi.iconClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d={kpi.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</span>
                      <span className={`text-[11px] font-semibold ${kpi.changeClass}`}>{kpi.change}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Admin & Governance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Designated Admin Card */}
                <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100/60 text-teal-800 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Designated Org Administrator
                      </h4>
                    </div>
                    <button className="text-xs font-semibold text-teal-800 hover:text-teal-900 hover:underline">
                      Assign / Change Admin
                    </button>
                  </div>
                  <div className="mt-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                      ER
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-900">Dr. Evelyn Reed, MD</h5>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          2FA Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Chief Medical Information Officer</p>
                      <p className="text-xs text-teal-700 font-mono mt-1">e.reed@stjude-regional.org</p>
                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span>Phone: +1 (312) 555-0192</span>
                        <span>•</span>
                        <span>Last Active: 14 mins ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gateway Encryption Card */}
                <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100/60 text-teal-800 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Gateway Encryption &amp; Node Keys
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">SHA-256</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Infrastructure Key Fingerprint:</span>
                        <span className="text-emerald-600 font-semibold">Active &amp; Rotated</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg font-mono text-[11px] text-slate-700 flex justify-between items-center">
                        <span className="truncate">medos_live_node_il_9482_f0892c90e...</span>
                        <button className="text-teal-700 hover:text-teal-900 text-xs font-semibold ml-2">Copy</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>
                        API Node: <strong className="text-slate-700">api-midwest-04.medpulse.network</strong>
                      </span>
                      <button className="text-xs font-semibold text-rose-600 hover:underline">Revoke Token</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance Documents */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Verified Regulatory Compliance Documents (3 of 3 Verified)
                  </h4>
                  <span className="text-xs text-teal-700 font-semibold cursor-pointer hover:underline">
                    + Upload New Document
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  {documents.map((doc) => (
                    <div key={doc.name} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${doc.typeClass}`}>
                          {doc.type}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">{doc.meta}</p>
                        </div>
                      </div>
                      <span className="text-emerald-600 shrink-0 ml-2" title="Verified">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lifecycle Timeline */}
              <div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Lifecycle History &amp; Network Audits
                  </h4>
                  <span className="text-[11px] text-slate-500">Showing last 3 critical events</span>
                </div>
                <div className="mt-3 space-y-3">
                  {timeline.map((event) => (
                    <div key={event.title} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ring-4 ${event.dotClass}`}></div>
                      <div className="flex-1 text-xs">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{event.title}</span>
                          <span className="text-slate-400 text-[11px] font-normal">{event.time}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{event.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* End Tab Body */}
          </div>
          {/* End Detail Master Card */}
        </div>
        {/* End Right Column */}
      </section>
      {/* End Master-Detail Grid */}
    </>
  );
}

