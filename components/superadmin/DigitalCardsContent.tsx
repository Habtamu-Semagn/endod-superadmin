"use client";

import { useState } from "react";

interface CardEntry {
  id: string;
  holder: string;
  account: string;
  description: string;
  status: "active" | "suspended" | "revoked";
  statusLabel: string;
  issuedLabel: string;
  lastLabel: string;
  lastClass: string;
  incident?: string;
  replacedBy?: string;
  revokedMeta?: string;
  revokedMetaClass?: string;
  tail: string;
  expiry: string;
  securityLevel: string;
}

const cards: CardEntry[] = [
  {
    id: "CRD-88219-US",
    holder: "David K. Miller",
    account: "US-MED-9402851",
    description: "Universal Prescription & Dispensation Pass",
    status: "active",
    statusLabel: "Active & Synced",
    issuedLabel: "Issued: Mar 14, 2022",
    lastLabel: "Last: Today, 11:20 AM @ St. Jude",
    lastClass: "text-teal-900 font-medium",
    tail: "88219",
    expiry: "03/28",
    securityLevel: "GATEWAY VERIFIED - SEC TIER-1",
  },
  {
    id: "CRD-77402-TX",
    holder: "Elena Rostova, RN",
    account: "US-MED-1092847",
    description: "Staff Direct Authentication & Med Access Card",
    status: "active",
    statusLabel: "Active",
    issuedLabel: "Issued: Jan 09, 2023",
    lastLabel: "Last: Yesterday @ NovaCare Pediatrics",
    lastClass: "text-slate-600",
    tail: "77402",
    expiry: "01/27",
    securityLevel: "GATEWAY VERIFIED - SEC TIER-1",
  },
  {
    id: "CRD-44109-IL",
    holder: "Marcus Vance",
    account: "US-MED-6610293",
    description: "Universal Prescription & Dispensation Pass",
    status: "suspended",
    statusLabel: "Suspended (Velocity Alert)",
    issuedLabel: "Issued: Nov 22, 2021",
    lastLabel: "Flagged 42 mins ago",
    lastClass: "text-amber-800 font-semibold",
    incident: "⚠️ 3 rapid scans across different cities within 15 mins",
    tail: "44109",
    expiry: "11/26",
    securityLevel: "UNDER REVIEW - ACCESS FROZEN",
  },
  {
    id: "CRD-12093-FL",
    holder: "Robert Brown",
    account: "US-MED-3301928",
    description: "Universal Prescription & Dispensation Pass",
    status: "revoked",
    statusLabel: "Revoked (Lost)",
    issuedLabel: "Revoked: Aug 04, 2024",
    lastLabel: "Reissue Verified",
    lastClass: "text-slate-500 font-medium",
    replacedBy: "CRD-99014-FL",
    revokedMeta: "Replaced by Card ID:",
    revokedMetaClass: "font-mono font-medium text-slate-700",
    tail: "12093",
    expiry: "08/26",
    securityLevel: "TOKEN INVALIDATED - SEC TIER-0",
  },
];

const kpis = [
  { label: "Total Issued Cards", value: "329,450", badge: "+15.2% MoM", badgeClass: "text-emerald-600 bg-emerald-50", sub: "Across 42 state hospital networks", iconClass: "bg-teal-50 text-teal-700", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { label: "Active & Validated", value: "318,120", badge: "Healthy Gateway", badgeClass: "text-teal-700 flex items-center gap-1", badgeDot: "bg-teal-500", sub: "96.5% active in past 30 days", iconClass: "bg-emerald-50 text-emerald-700", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Suspended / Flagged", value: "1,842", badge: "Needs Review", badgeClass: "text-amber-800 bg-amber-100/70", sub: "Pending PIN reset or identity review", iconClass: "bg-amber-50 text-amber-700", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { label: "Revoked & Replaced", value: "9,488", badge: "Lifecycle End", badgeClass: "text-slate-600 bg-slate-100", sub: "Reported lost/stolen or expired", iconClass: "bg-slate-100 text-slate-600", icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
];

const filterPills = [
  { label: "All Cards", count: "329,450", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Active", count: "318,120", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Suspended", count: "1,842", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-amber-600 font-bold" },
  { label: "Revoked", count: "9,488", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Flagged Anomalies", count: "24", inactiveClass: "text-red-700 bg-red-50/70 hover:bg-red-100 border border-red-200/50", countClass: "font-bold text-red-800" },
];

const inspectionTabs = [
  { label: "Overview & Card Specs", count: null as string | null },
  { label: "Status History & Issuance", count: null },
  { label: "Validation & Tap Events", count: "142" },
  { label: "Security & Anomalies", count: null },
];

const specs = [
  { label: "Tokenization Engine", value: "Dynamic AES-256 Rotating QR & NFC Type-4", foot: "Payload Hash: SHA256:d8a9...b104", footClass: "font-mono text-[10px] text-teal-700" },
  { label: "Primary Issuer Facility", value: "St. Jude Regional Medical Center", foot: "License ID: IL-HOSP-9482", footClass: "font-mono text-[10px] text-slate-500" },
  { label: "Validity Lifecycle", value: "Mar 14, 2022 — Mar 14, 2027", foot: "Valid for 2.4 more years", footClass: "text-[10px] text-emerald-600 font-medium" },
  { label: "Eligibility Clearance", value: "Medicare Part D & State Health Pass", foot: "Sync Active: IL State Health Exchange", footClass: "text-[10px] text-teal-700 font-medium" },
];

const tapEvents = [
  {
    time: "Today, 11:20 AM",
    ping: "14ms Gateway ping",
    facility: "St. Jude Regional Pharmacy",
    facilitySub: "Chicago, IL (Terminal #04)",
    purpose: "Dispensation Check-in",
    purposeSub: "Metformin 500mg (Refill #2)",
    actor: "PharmD Sarah Jenkins",
    actorSub: "BioID Verified",
    result: "Success (#TX-90182)",
  },
  {
    time: "Oct 12, 2024, 03:15 PM",
    ping: "18ms Gateway ping",
    facility: "Mercy West Hospital",
    facilitySub: "Outpatient Triage B",
    purpose: "Card Presence Verification",
    purposeSub: "Routine Consultation Intake",
    actor: "Elena Rostova, RN",
    actorSub: "Card Tap Verified",
    result: "Success",
  },
  {
    time: "Sep 28, 2024, 09:40 AM",
    ping: "22ms Gateway ping",
    facility: "BioScript Miami Clinic",
    facilitySub: "Miami, FL (NFC Pad #01)",
    purpose: "Pharmacy Verification",
    purposeSub: "Atorvastatin 20mg",
    actor: "Dr. Evelyn Reed",
    actorSub: "Prescriber Sign",
    result: "Success",
  },
];

export default function DigitalCardsContent() {
  const [selectedCardId, setSelectedCardId] = useState<string>("CRD-88219-US");
  const [activeFilter, setActiveFilter] = useState<string>("All Cards");
  const [activeTab, setActiveTab] = useState<string>("Overview & Card Specs");
  const [listSearch, setListSearch] = useState<string>("CRD-88219");

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  return (
    <>
      {/* Page Title & Actions */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              National Card Registry &amp; Tokenization Engine
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SEC-TIER-0</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Digital Cards &amp; Medication Pass Management</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Manage cryptographic NFC/QR patient medication cards, verify issuance eligibility, track redemption telemetry across facilities, and investigate security anomalies.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Investigate Anomalies
            <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold">2 flagged</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0d5c52] hover:bg-teal-800 rounded-lg shadow-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Issue / Activate New Card
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
          <div className="flex items-center gap-1 text-xs">
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
                {pill.label}{" "}
                <span className={`ml-1 text-[11px] ${activeFilter === pill.label ? "opacity-75 font-normal" : pill.countClass}`}>
                  {pill.count}
                </span>
              </button>
            ))}
          </div>
          {/* Additional Filter Controls */}
          <div className="flex items-center gap-2">
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-600 focus:border-teal-600">
              <option>Issuer Facility: All Networks (1,248)</option>
              <option>St. Jude Regional Medical Center</option>
              <option>NovaCare Specialized Clinic</option>
              <option>Apex Diagnostic Labs</option>
            </select>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-600 focus:border-teal-600">
              <option>Card Type: Universal MedPass</option>
              <option>NFC Type-4 Dual Token</option>
              <option>Encrypted QR Token Only</option>
            </select>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Master-Detail Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT MASTER LIST */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* List Header with search & count */}
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
                placeholder="Filter current list..."
                type="text"
              />
            </div>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Sort: <strong>Recent Tap</strong></span>
          </div>
          {/* List Item Container */}
          <div className="divide-y divide-slate-100 max-h-[660px] overflow-y-auto" role="list">
            {cards.map((card) => {
              const isSelected = card.id === selectedCardId;
              const itemClass = isSelected
                ? "p-4 bg-teal-50/40 border-l-4 border-teal-700 cursor-pointer transition-all hover:bg-teal-50/70"
                : card.status === "suspended"
                ? "p-4 hover:bg-amber-50/40 bg-amber-50/20 cursor-pointer transition-all border-l-4 border-amber-500"
                : card.status === "revoked"
                ? "p-4 hover:bg-slate-50 cursor-pointer opacity-75 transition-all"
                : "p-4 hover:bg-slate-50 cursor-pointer transition-all";
              const chipClass = isSelected
                ? "font-mono font-bold text-xs text-slate-900 bg-white border border-teal-200 px-2 py-0.5 rounded shadow-2xs"
                : card.status === "revoked"
                ? "font-mono font-semibold text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded line-through"
                : card.status === "suspended"
                ? "font-mono font-semibold text-xs text-slate-800 bg-white border border-amber-200 px-2 py-0.5 rounded"
                : "font-mono font-semibold text-xs text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded";
              const statusChipClass =
                card.status === "suspended"
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                  : card.status === "revoked"
                  ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300"
                  : isSelected
                  ? "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800 text-white"
                  : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCardId(card.id)}
                  className={itemClass}
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={chipClass}>{card.id}</span>
                      {isSelected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800 text-white">
                          Selected View
                        </span>
                      )}
                    </div>
                    <span className={statusChipClass}>
                      {card.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      {card.status === "suspended" && <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>}
                      {card.statusLabel}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <p className={`text-xs font-bold ${card.status === "revoked" ? "text-slate-700" : "text-slate-900"}`}>{card.holder}</p>
                    <p className={`text-[11px] font-mono ${card.status === "revoked" ? "text-slate-400" : "text-slate-500"}`}>
                      Patient Account: {card.account}
                    </p>
                  </div>
                  {card.incident && (
                    <div className="mt-2 p-1.5 rounded bg-amber-100/60 border border-amber-200 text-[10px] text-amber-900 font-medium">
                      {card.incident}
                    </div>
                  )}
                  {card.revokedMeta && card.replacedBy ? (
                    <div className="mt-2 text-[11px] text-slate-500">
                      <span>{card.revokedMeta} </span>
                      <span className={card.revokedMetaClass}>{card.replacedBy}</span>
                    </div>
                  ) : (
                    !card.incident && (
                      <div className="mt-2 text-[11px] text-slate-500">
                        <span>{card.description}</span>
                      </div>
                    )
                  )}
                  <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                    isSelected ? "border-teal-100 text-slate-500" : card.status === "suspended" ? "border-amber-100 text-slate-400" : "border-slate-100 text-slate-400"
                  }`}>
                    <span>{card.issuedLabel}</span>
                    <span className={card.lastClass}>{card.lastLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* List Footer / Pagination */}
          <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Showing <strong>1-4</strong> of 329,450</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-600 disabled:opacity-40" disabled>Prev</button>
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-600">Next</button>
            </div>
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* Detail Header with Card Preview Graphic */}
          <div className="p-6 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Smart Card Miniature Visual Representation */}
                <div className="smart-card-bg w-28 h-18 rounded-lg p-2.5 shadow-md border border-teal-600/30 text-white flex flex-col justify-between shrink-0 aspect-[1.58/1]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-tight text-teal-200">Endod MedPass</span>
                    {/* Contactless NFC Symbol */}
                    <svg className="w-3.5 h-3.5 text-teal-200 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  {/* Microchip Graphic representation */}
                  <div className="w-4 h-3 rounded-xs bg-amber-300/80 border border-amber-400/80 my-0.5"></div>
                  <div className="flex items-end justify-between">
                    <span className="font-mono text-[8.5px] tracking-wider text-teal-100">•••• {selectedCard.tail}</span>
                    <span className="text-[7px] text-teal-200 font-mono">{selectedCard.expiry}</span>
                  </div>
                </div>
                {/* Identifier and Account Info */}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold font-mono text-slate-900 tracking-tight">{selectedCard.id}</h3>
                    <button className="text-slate-400 hover:text-slate-600" title="Copy Card Identifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                    {selectedCard.status === "active" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active &amp; Cryptographically Verified
                      </span>
                    ) : selectedCard.status === "suspended" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Suspended (Velocity Alert)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                        Revoked (Lost)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Linked Cardholder: <strong className="text-slate-900">{selectedCard.holder}</strong>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded font-medium">{selectedCard.account}</span>
                    <a className="text-teal-700 hover:underline font-semibold ml-1.5 text-xs inline-flex items-center gap-0.5" href="#">
                      View User Profile →
                    </a>
                  </p>
                </div>
              </div>
              {/* Assigned Security Badge */}
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Security Level</span>
                <span className="inline-block mt-0.5 px-2.5 py-1 text-xs font-mono font-bold text-white bg-slate-900 rounded tracking-wide">
                  {selectedCard.securityLevel}
                </span>
              </div>
            </div>

            {/* Critical Architecture Security Callout */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3 shadow-2xs">
              <div className="p-1 rounded-md bg-teal-100 text-teal-800 shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs mb-0.5">Cryptographic Tokenization Notice:</h4>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Patient QR code and NFC payload contain a zero-knowledge rotating authorization token (<span className="font-mono text-teal-800 bg-teal-50 px-1 py-0.2 rounded font-medium">zkt_0x94f2...3a</span>) referencing the MedOS Gateway. It strictly <strong className="text-slate-800">DOES NOT</strong> store raw medical histories or full clinical records. Validating providers must pass facility biometric authorization before receiving limited dispensation clearance.
                </p>
              </div>
            </div>

            {/* Lifecycle Management Action Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50/80 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Suspend Card
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Reissue &amp; Revoke Old
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Force Token Rotation / Invalidate Cache
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-transparent rounded-lg hover:bg-slate-100 transition-colors ml-auto">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Investigate Velocity Flags
              </button>
            </div>
          </div>

          {/* Deep Card Inspection Navigation Tabs */}
          <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-medium bg-white">
            {inspectionTabs.map((tab) => (
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
            {/* Technical Card Specifications */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Card Cryptographic Specification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {specs.map((spec) => (
                  <div key={spec.label} className="p-3 rounded-lg border border-slate-200/90 bg-slate-50/50">
                    <span className="text-slate-500 text-[11px] block">{spec.label}</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{spec.value}</span>
                    <span className={spec.footClass}>{spec.foot}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Tap & Validation Telemetry Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Validation &amp; Tap Events Log</h4>
                <span className="text-[11px] font-semibold text-teal-700 cursor-pointer hover:underline">Download Audit Stream</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3.5">Timestamp</th>
                      <th className="py-2.5 px-3">Location &amp; Facility</th>
                      <th className="py-2.5 px-3">Transaction / Purpose</th>
                      <th className="py-2.5 px-3">Authorized By</th>
                      <th className="py-2.5 px-3.5 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                    {tapEvents.map((event) => (
                      <tr key={event.time} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-900">{event.time}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{event.ping}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900">{event.facility}</span>
                          <span className="block text-[10px] text-slate-500">{event.facilitySub}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span>{event.purpose}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{event.purposeSub}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium">{event.actor}</span>
                          <span className="block text-[10px] text-slate-400">{event.actorSub}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {event.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Telemetry & Fraud Protection Box */}
            <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Fraud &amp; Replay Detection Telemetry</h5>
                  <p className="text-[11px] text-slate-500">
                    0 anomalies detected in last 30 days. Velocity check: Normal. Geofence radius: Consistent.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-teal-800 bg-teal-100/70 px-2.5 py-1 rounded-full whitespace-nowrap">
                Risk Score: 0 / 100
              </span>
            </div>
          </div>
          {/* End Tab Content */}
        </div>
        {/* End Right Detail Panel */}
      </section>
      {/* End Master-Detail Grid */}
    </>
  );
}


