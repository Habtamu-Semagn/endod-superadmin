"use client";

import { Fragment, useState } from "react";

interface Chip {
  text: string;
  className: string;
}

interface Badge {
  text: string;
  className: string;
  icon?: string;
  dot?: boolean;
}

interface UserEntry {
  id: string;
  initials: string;
  avatarClass: string;
  name: string;
  nameIcon?: { symbol: string; className: string; fill?: boolean };
  subtitle: string;
  headerIndicator: { kind: "dot"; className: string } | { kind: "hits"; text: string };
  chips: Chip[];
  footerLeft: string;
  footerMid: string;
  footerRight: string;
  footerRightClass: string;
  detail: {
    badges: Badge[];
    meta: { label: string; value: string }[];
    clearance: string;
  };
}

const users: UserEntry[] = [
  {
    id: "vance",
    initials: "MV",
    avatarClass: "bg-slate-100 text-slate-700",
    name: "Dr. Marcus Vance, MD",
    nameIcon: { symbol: "verified", className: "text-teal-700", fill: true },
    subtitle: "Chief Cardiologist • St. Jude Medical",
    headerIndicator: { kind: "dot", className: "bg-emerald-500" },
    chips: [
      { text: "Licensed MD - Tier 3", className: "bg-emerald-100 text-emerald-900" },
      { text: "Org Admin", className: "bg-slate-200/80 text-slate-700" },
    ],
    footerLeft: "NPI: 1849204812",
    footerMid: "2 Facilities",
    footerRight: "#CRD-88219",
    footerRightClass: "text-teal-700 font-semibold",
    detail: {
      badges: [
        { text: "Verified Provider (Tier 3)", className: "bg-emerald-100 text-emerald-900", icon: "verified" },
        { text: "Active & Synced", className: "bg-teal-50 text-teal-800 font-medium", dot: true },
      ],
      meta: [
        { label: "NPI", value: "1849204812" },
        { label: "Global Identity", value: "US-MED-9402851" },
        { label: "Member Since", value: "March 14, 2022" },
      ],
      clearance: "SEC-LEVEL-4: CLINICAL ADMIN",
    },
  },
  {
    id: "rostova",
    initials: "ER",
    avatarClass: "bg-slate-100 text-slate-700",
    name: "Elena Rostova, RN",
    subtitle: "Staff Nurse • NovaCare Specialized Peds",
    headerIndicator: { kind: "dot", className: "bg-emerald-500" },
    chips: [
      { text: "Verified Practitioner", className: "bg-teal-50 text-teal-800" },
      { text: "Active Cardholder", className: "bg-slate-100 text-slate-600" },
    ],
    footerLeft: "NPI: 1092847120",
    footerMid: "Austin, TX",
    footerRight: "Tier 2",
    footerRightClass: "text-slate-500",
    detail: {
      badges: [
        { text: "Verified Practitioner (Tier 2)", className: "bg-emerald-100 text-emerald-900", icon: "verified" },
        { text: "Active & Synced", className: "bg-teal-50 text-teal-800 font-medium", dot: true },
      ],
      meta: [
        { label: "NPI", value: "1092847120" },
        { label: "Global Identity", value: "US-MED-5510093" },
        { label: "Member Since", value: "June 2, 2023" },
      ],
      clearance: "SEC-LEVEL-2: CLINICAL STAFF",
    },
  },
  {
    id: "miller",
    initials: "DM",
    avatarClass: "bg-amber-100 text-amber-900",
    name: "David K. Miller",
    nameIcon: { symbol: "warning", className: "text-amber-600" },
    subtitle: "Patient / Cardholder • Multiple Records",
    headerIndicator: { kind: "hits", text: "2 Hits" },
    chips: [
      { text: "⚠️ Potential Duplicate (2 records)", className: "bg-amber-50 text-amber-800" },
      { text: "Level 1 Verified", className: "bg-slate-100 text-slate-600" },
    ],
    footerLeft: "DOB: 1984-06-12",
    footerMid: "Chicago, IL",
    footerRight: "Collision #44",
    footerRightClass: "text-amber-700 font-semibold",
    detail: {
      badges: [
        { text: "Level 1 Verified", className: "bg-amber-100 text-amber-900", icon: "warning" },
        { text: "Duplicate Review Pending", className: "bg-amber-50 text-amber-800 font-medium" },
      ],
      meta: [
        { label: "DOB", value: "1984-06-12" },
        { label: "Global Identity", value: "US-PAT-3381042" },
        { label: "Member Since", value: "January 9, 2024" },
      ],
      clearance: "SEC-LEVEL-1: PATIENT",
    },
  },
  {
    id: "jenkins",
    initials: "SJ",
    avatarClass: "bg-slate-100 text-slate-700",
    name: "Sarah Jenkins, PharmD",
    subtitle: "Clinical Pharmacist • BioScript Pharmacy",
    headerIndicator: { kind: "dot", className: "bg-emerald-500" },
    chips: [
      { text: "Licensed Pharmacist", className: "bg-teal-50 text-teal-800" },
      { text: "Active", className: "bg-emerald-50 text-emerald-800" },
    ],
    footerLeft: "LIC: TX-PHAR-9932",
    footerMid: "Miami, FL",
    footerRight: "Tier 2",
    footerRightClass: "text-slate-500",
    detail: {
      badges: [
        { text: "Licensed Pharmacist (Tier 2)", className: "bg-emerald-100 text-emerald-900", icon: "verified" },
        { text: "Active & Synced", className: "bg-teal-50 text-teal-800 font-medium", dot: true },
      ],
      meta: [
        { label: "LIC", value: "TX-PHAR-9932" },
        { label: "Global Identity", value: "US-MED-7720145" },
        { label: "Member Since", value: "August 21, 2022" },
      ],
      clearance: "SEC-LEVEL-3: PHARMACY ADMIN",
    },
  },
  {
    id: "sterling",
    initials: "RS",
    avatarClass: "bg-rose-100 text-rose-800",
    name: "Dr. Robert Sterling, DO",
    subtitle: "Anesthesiologist • Apex Diagnostic Labs",
    headerIndicator: { kind: "dot", className: "bg-rose-500" },
    chips: [
      { text: "Suspended (Pending Credential Audit)", className: "bg-rose-100 text-rose-800" },
    ],
    footerLeft: "NPI: 1993021495",
    footerMid: "Atlanta, GA",
    footerRight: "Audit Hold",
    footerRightClass: "text-rose-700 font-semibold",
    detail: {
      badges: [
        { text: "Suspended (Credential Audit)", className: "bg-rose-100 text-rose-800", icon: "warning" },
        { text: "Access Restricted", className: "bg-rose-50 text-rose-700 font-medium" },
      ],
      meta: [
        { label: "NPI", value: "1993021495" },
        { label: "Global Identity", value: "US-MED-4481027" },
        { label: "Member Since", value: "February 11, 2021" },
      ],
      clearance: "SEC-LEVEL-0: SUSPENDED",
    },
  },
];

const ribbonTabs = [
  { label: "All Users", count: "482,910", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Healthcare Providers", count: "14,208", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Org Admins & Staff", count: "3,412", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Patients / Cardholders", count: "465,290", inactiveClass: "text-slate-600 hover:text-slate-900 hover:bg-slate-100", countClass: "text-slate-400" },
  { label: "Pending Verification", count: "42", inactiveClass: "text-amber-800 bg-amber-50/70 hover:bg-amber-100/70", countClass: "text-amber-900" },
  { label: "Flagged / Suspended", count: "18", inactiveClass: "text-rose-700 bg-rose-50/70 hover:bg-rose-100/70", countClass: "text-rose-800" },
];

const detailTabs = [
  "Overview & Credentials",
  "Organization Memberships (2)",
  "Digital Health Cards & NFC",
  "Security & Authentication",
  "Identity Resolution & History",
];

export default function UsersStaffContent() {
  const [selectedUserId, setSelectedUserId] = useState<string>("vance");
  const [activeRibbon, setActiveRibbon] = useState<string>("All Users");
  const [activeDetailTab, setActiveDetailTab] = useState<string>("Overview & Credentials");
  const [search, setSearch] = useState<string>("Dr. Marcus Vance");

  const selectedUser = users.find((u) => u.id === selectedUserId) || users[0];

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Hero / Page Header with Action Center */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse"></span>
              National Identity Registry
            </span>
            <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">SEC-TIER-0</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Users &amp; Healthcare Staff Directory</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl mt-0.5">
            Search, verify professional credentials, manage organization affiliations, resolve duplicate profiles, and administer authentication security across the MedOS ecosystem.
          </p>
        </div>
        {/* Quick Super Admin Action Group */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-amber-600 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>merge_type</span>
            <span>Resolve Duplicate Identities</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">3 pending</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0d5c52] hover:bg-[#0a4840] text-white shadow-sm transition-all hover:shadow-md">
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>Invite / Provision User</span>
          </button>
        </div>
      </div>

      {/* Metric Badges & Filter Ribbon */}
      <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col gap-3">
        {/* Horizontal Tab Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {ribbonTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveRibbon(tab.label)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                activeRibbon === tab.label
                  ? "font-bold bg-[#0d5c52] text-white shadow-sm"
                  : `font-semibold ${tab.inactiveClass}`
              }`}
            >
              {tab.label}{" "}
              <span className={`ml-1 font-mono text-[11px] ${activeRibbon === tab.label ? "opacity-80" : tab.countClass}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        {/* Micro Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-medium">
              <span className="text-slate-400 text-[11px]">Role:</span>
              <select className="bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0 cursor-pointer pr-4">
                <option>All System Roles</option>
                <option>Licensed Physician (MD/DO)</option>
                <option>Registered Nurse (RN)</option>
                <option>Chief Medical Officer</option>
                <option>Hospital Super Admin</option>
                <option>Pharmacist (PharmD)</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-medium">
              <span className="text-slate-400 text-[11px]">Affiliation:</span>
              <select className="bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0 cursor-pointer pr-4">
                <option>All Organizations (1,248)</option>
                <option>St. Jude Regional Medical Center</option>
                <option>NovaCare Pediatrics</option>
                <option>Apex Diagnostic Labs</option>
                <option>BioScript Pharmacy Group</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg text-slate-700 font-medium">
              <span className="text-slate-400 text-[11px]">Security:</span>
              <select className="bg-transparent border-none p-0 text-xs font-semibold text-slate-800 focus:ring-0 cursor-pointer pr-4">
                <option>All Statuses</option>
                <option>MFA Enforced (Active)</option>
                <option>Temporary Access Active</option>
                <option>Credential Renewal Required</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sync Engine Active (Latency 14ms)</span>
            </span>
            <button className="text-slate-600 hover:text-slate-900 font-semibold underline underline-offset-2">Export CSV</button>
          </div>
        </div>
      </div>

      {/* Master / Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: Directory List */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-3.5 flex flex-col gap-3">
            {/* Search within current view */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 rounded-xl pl-9 pr-3 py-2 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                placeholder="Filter current view by name or NPI..."
                type="text"
              />
            </div>
            {/* User Cards List */}
            <div className="space-y-2">
              {users.map((user) => {
                const isSelected = user.id === selectedUserId;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3.5 rounded-xl shadow-sm cursor-pointer transition-all ${
                      isSelected ? "bg-teal-50/60 relative" : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shrink-0 ${
                            isSelected ? "bg-[#0d5c52] text-white shadow-sm" : user.avatarClass
                          }`}
                        >
                          {user.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-900">{user.name}</h3>
                            {user.nameIcon && (
                              <span
                                className={`material-symbols-outlined text-sm ${user.nameIcon.className}`}
                                style={user.nameIcon.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
                              >
                                {user.nameIcon.symbol}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{user.subtitle}</p>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-900 shrink-0">Selected</span>
                      ) : user.headerIndicator.kind === "dot" ? (
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${user.headerIndicator.className}`}></span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 shrink-0">{user.headerIndicator.text}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {user.chips.map((chip) => (
                        <span key={chip.text} className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${chip.className}`}>
                          {chip.text}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{user.footerLeft}</span>
                      <span>{user.footerMid}</span>
                      <span className={user.footerRightClass}>{user.footerRight}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination Controls */}
            <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong>1-5</strong> of <strong>482,910</strong>
              </span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium">Prev</button>
                <button className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium">Next</button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: User Profile & Staff Governance Workspace */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Top Inspector Header Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-52 h-52 bg-teal-50/70 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0d5c52] to-[#134e4a] text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                  {selectedUser.initials}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{selectedUser.name}</h3>
                    {selectedUser.detail.badges.map((badge) => (
                      <span
                        key={badge.text}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${badge.className}`}
                      >
                        {badge.icon && (
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {badge.icon}
                          </span>
                        )}
                        {badge.dot && <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>}
                        {badge.text}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 font-mono">
                    {selectedUser.detail.meta.map((m, i) => (
                      <Fragment key={m.label}>
                        <span>
                          {m.label}: <strong className="text-slate-800">{m.value}</strong>
                        </span>
                        {i < selectedUser.detail.meta.length - 1 && <span>•</span>}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              {/* Profile Header Quick Action Badge */}
              <div className="flex md:flex-col items-end gap-1.5 text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Clearance</span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-900 text-teal-100 text-xs font-mono font-semibold">
                  {selectedUser.detail.clearance}
                </span>
              </div>
            </div>
            {/* Clinical Privacy Isolated Notice Bar */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-50 flex items-start gap-3 text-xs text-slate-600">
              <span className="material-symbols-outlined text-teal-700 text-base shrink-0 mt-0.5">lock</span>
              <div>
                <strong className="text-slate-800 font-semibold">Clinical Privacy Notice:</strong> Full medical charts and electronic health records (EHR) are strictly isolated. Clinical record access requires dedicated audit clearance and institutional HIPAA privilege delegation.
              </div>
            </div>
            {/* Administrative Governance Actions Toolbar */}
            <div className="mt-5 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                  <span className="material-symbols-outlined text-sm">block</span>
                  Suspend Account
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  Reset Access / MFA
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                  Assign / Edit Org Roles
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors">
                  <span className="material-symbols-outlined text-sm">merge</span>
                  Merge / Resolve Identity
                </button>
              </div>
              <button className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                <span className="material-symbols-outlined text-sm">history</span>
                <span>View Full Audit Log</span>
              </button>
            </div>
          </div>

          {/* Tabbed Workspace Section */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            {/* Sub-tabs navigation */}
            <div className="flex items-center gap-3 text-xs overflow-x-auto pb-1">
              {detailTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={`pb-2.5 whitespace-nowrap relative transition-colors ${
                    activeDetailTab === tab
                      ? "font-bold text-[#0d5c52]"
                      : "font-medium text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                  {activeDetailTab === tab && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0d5c52] rounded-full"></span>
                  )}
                </button>
              ))}
            </div>

            {/* 4 Grid Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Professional Credentials & Licensure */}
              <div className="p-4 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">verified_user</span>
                      Professional Credentials &amp; Licensure
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 font-mono">VERIFIED ACTIVE</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">State Medical Board</span>
                      <span className="font-medium text-slate-800">Illinois Dept of Financial &amp; Professional Regulation</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">License Number</span>
                        <span className="font-mono font-semibold text-slate-800">IL-MED-0361094</span>
                      </div>
                      <span className="text-emerald-700 text-[11px] font-medium">Valid until Oct 31, 2026</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Primary Specialty</span>
                      <span className="font-medium text-slate-800">Cardiovascular Disease &amp; Critical Care</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">DEA Registration</span>
                        <span className="font-mono font-semibold text-slate-800">FV9302184 (Active)</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">Sched II-V</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Malpractice: <strong>Cleared (A+ carrier)</strong></span>
                  <button className="text-teal-700 font-semibold hover:underline">Verify Board API</button>
                </div>
              </div>

              {/* Card 2: Organization Affiliations & Admin Privileges */}
              <div className="p-4 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">domain</span>
                      Organization Affiliations
                    </span>
                    <button className="text-[11px] font-bold text-teal-700 hover:underline">+ Add Affiliation</button>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    {/* Org 1 */}
                    <div className="p-2.5 rounded-lg bg-white shadow-2xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">St. Jude Regional Medical Center</h4>
                          <p className="text-[11px] text-teal-800 font-medium mt-0.5">Role: Department Admin &amp; Chief of Cardiology</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-100 text-teal-900 font-mono">PRIMARY</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Facilities: Central Hospital Campus + West Heart Clinic</div>
                    </div>
                    {/* Org 2 */}
                    <div className="p-2.5 rounded-lg bg-white shadow-2xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800">Midwest TeleHealth Consortium</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5">Role: Attending Consulting Physician</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 font-mono">AFFILIATE</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Remote Tele-Consult Privileges Only</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">2 Active Affiliated Nodes</span>
                  <button className="text-teal-700 font-semibold hover:underline">Manage Delegation</button>
                </div>
              </div>

              {/* Card 3: Digital Card & Prescription Authorization */}
              <div className="p-4 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">contactless</span>
                      Digital Card &amp; Prescriptions
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 font-mono">NFC ONLINE</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Linked Digital Med-Card Token</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono font-bold text-slate-800">#MED-9082-VANCE</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-50 text-emerald-800">FIPS 140-3 Synced</span>
                      </div>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-400 block text-[11px]">Prescription Authority (EPCS)</span>
                      <span className="font-medium text-slate-800">Schedule II-V Electronic Prescribing Cleared</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Encounters This Month</span>
                        <span className="font-semibold text-slate-800">42 verified digital card touches</span>
                      </div>
                      {/* Mini sparkline metric visualization */}
                      <div className="w-16 h-6 flex items-end gap-1">
                        <span className="w-2.5 h-3 bg-teal-200 rounded-t-sm"></span>
                        <span className="w-2.5 h-4 bg-teal-400 rounded-t-sm"></span>
                        <span className="w-2.5 h-6 bg-[#0d5c52] rounded-t-sm"></span>
                        <span className="w-2.5 h-5 bg-teal-500 rounded-t-sm"></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Gateway: <strong>Encrypted BLE/NFC</strong></span>
                  <button className="text-teal-700 font-semibold hover:underline">Rotate NFC Keys</button>
                </div>
              </div>

              {/* Card 4: Security & Authentication Controls */}
              <div className="p-4 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">shield</span>
                      Security &amp; Auth Controls
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 font-mono">MFA ENFORCED</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Multi-Factor Authentication</span>
                      <span className="font-medium text-slate-800">FIDO2 Hardware Token + Biometric Authenticator</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Last Secure Session Login</span>
                        <span className="font-mono text-slate-800">Today, 08:42 AM</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">Chicago, IL (192.168.1.42)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Identity Collision Confidence</span>
                        <span className="font-semibold text-emerald-700">100% Unique Profile Match</span>
                      </div>
                      <span className="text-[10px] text-slate-400">0 Duplicates</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Active Sessions: <strong>2 Active</strong></span>
                  <button className="text-rose-600 font-semibold hover:underline">Revoke All &amp; Force Reset</button>
                </div>
              </div>
            </div>

            {/* Identity Integrity Monitor Notification Box */}
            <div className="p-4 rounded-xl bg-teal-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-800 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">fingerprint</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Identity Integrity &amp; Collision Engine</h4>
                  <p className="text-[11px] text-slate-500">Automated biometric and NPI cross-matching reports zero collisions for Dr. Vance across 14 state health registries.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-slate-500 font-mono text-[11px]">Cluster ID #NPI-1849</span>
                <button className="px-3 py-1.5 rounded-lg bg-white text-teal-800 font-semibold hover:bg-teal-50 transition-colors shadow-2xs">Run Deep Re-check</button>
              </div>
            </div>
          </div>
          {/* End Tabbed Workspace */}
        </div>
        {/* End Right Panel */}
      </div>
      {/* End Master / Detail Workspace */}
    </div>
  );
}


