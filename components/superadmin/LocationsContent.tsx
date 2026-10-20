"use client";

import { useState } from "react";

interface LocationItem {
  id: string;
  name: string;
  type: "hospital" | "clinic" | "pharmacy" | "surgical";
  address: string;
  coordinates: string;
  status: "active" | "pending" | "review";
  statusLabel: string;
  specialties: string[];
  services: string[];
  phone: string;
  adminEmail: string;
  unitsCount: number;
  traumaLevel?: string;
  pharmacyType?: string;
  epaApproved?: boolean;
  deaRegulated?: boolean;
}

const locations: LocationItem[] = [
  {
    id: "FAC-IL-9482",
    name: "St. Jude Regional Medical Center - Main Campus",
    type: "hospital",
    address: "251 E Huron St, Chicago, IL 60611",
    coordinates: "41.8954° N, 87.6217° W",
    status: "active",
    statusLabel: "Verified Active",
    specialties: ["Cardiology", "Trauma", "Oncology"],
    services: ["Emergency", "Surgery", "Radiology"],
    phone: "+1 (312) 555-0199",
    adminEmail: "admin@stjude-regional.org",
    unitsCount: 14,
    traumaLevel: "Level 1 Trauma",
    epaApproved: true,
    deaRegulated: true,
  },
  {
    id: "FAC-IL-8841",
    name: "NovaCare Pediatrics & Urgent Care",
    type: "clinic",
    address: "1044 N Michigan Ave, Suite 300, Chicago, IL",
    coordinates: "41.8972° N, 87.6312° W",
    status: "active",
    statusLabel: "Verified Active",
    specialties: ["Pediatrics", "Urgent Care"],
    services: ["Primary Care", "Immunizations"],
    phone: "+1 (312) 555-0245",
    adminEmail: "info@novacare-peds.com",
    unitsCount: 3,
  },
  {
    id: "FAC-IL-7219",
    name: "BioScript Specialty Pharmacy - North Branch",
    type: "pharmacy",
    address: "830 N Clark St, Chicago, IL 60610",
    coordinates: "41.8941° N, 87.6289° W",
    status: "active",
    statusLabel: "Verified Active",
    specialties: ["Clinical Pharmacy"],
    services: ["Prescription Filling", "MedPass Sync"],
    phone: "+1 (312) 555-0333",
    adminEmail: "pharmacy@bioscript.com",
    unitsCount: 2,
    pharmacyType: "Hospital Pharmacy",
  },
  {
    id: "FAC-IL-6031",
    name: "Lakeside Ambulatory Surgical Center",
    type: "surgical",
    address: "500 E Grand Ave, Chicago, IL 60611",
    coordinates: "41.9003° N, 87.6101° W",
    status: "pending",
    statusLabel: "Needs Review",
    specialties: ["Orthopedic Surgery"],
    services: ["Outpatient Surgery", "Imaging"],
    phone: "+1 (312) 555-0421",
    adminEmail: "contact@lakesidesurgery.com",
    unitsCount: 2,
  },
];

const kpis = [
  { label: "Total Registered Facilities", value: "1,428", badge: "+18 this month", badgeClass: "text-emerald-600 bg-emerald-50", sub: "Across 48 regional health systems" },
  { label: "24/7 Verified Emergency Centers", value: "312", badge: "Verified Active", badgeClass: "text-emerald-700 bg-emerald-50", sub: "Level 1 & 2 Trauma" },
  { label: "Embedded & Retail Pharmacies", value: "584", badge: "In-Network Dispensation", badgeClass: "text-teal-700", sub: "Direct MedPass card sync enabled" },
  { label: "Listings Pending Audit", value: "19", badge: "Needs Geo-Verification", badgeClass: "text-amber-800 bg-amber-100/70", sub: "Awaiting physical address & license check" },
];

const filterPills = [
  { label: "All Facilities", count: "1,428", active: true },
  { label: "General Hospitals", count: "410" },
  { label: "Emergency & Trauma", count: "312" },
  { label: "Specialty Clinics", count: "486" },
  { label: "Pharmacies", count: "220" },
  { label: "Flagged / Outdated", count: "19", warning: true },
];

const tabLabels = [
  { id: "overview", label: "Overview & Services" },
  { id: "departments", label: "Departments & Units", count: 14 },
  { id: "emergency", label: "Emergency & Triage" },
  { id: "pharmacy", label: "Pharmacy & Dispensary" },
  { id: "hours", label: "Operating Hours" },
  { id: "audit", label: "Audit History" },
];

export default function LocationsContent() {
  const [selectedId, setSelectedId] = useState<string>("FAC-IL-9482");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const selected = locations.find((l) => l.id === selectedId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-teal-800">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              National Facilities & Clinical Service Registry
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">SEC-TIER-0</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Locations & Clinical Services Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Manage verified healthcare facilities, operational clinics, licensed pharmacies, coordinates, and emergency services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            Export GeoJSON / CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0d5c52] hover:bg-teal-800 rounded-lg shadow-sm transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            + Register Facility / Location
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">{kpi.label}</span>
              <span className="p-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {i === 0 && <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                  {i === 1 && <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                  {i === 2 && <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                  {i === 3 && <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />}
                </svg>
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{kpi.value}</span>
              <span className={`text-[11px] font-semibold ${kpi.badgeClass.split(" ")[0]} bg-[${kpi.badgeClass.split(" ")[1]}] px-1.5 py-0.2 rounded`}>{kpi.badge}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Filter Bar */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1 text-xs flex-wrap">
            {filterPills.map((pill, i) => (
              <button
                key={i}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  pill.active ? "bg-slate-900 text-white shadow-2xs" : pill.warning ? "bg-rose-50/70 text-rose-700 hover:bg-rose-100/70 border border-rose-200/50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {pill.label} <span className="ml-1 text-[11px] opacity-75 font-normal">{pill.count}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
              <option>Region: All States</option>
              <option>Illinois & Chicago Metro</option>
            </select>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700">
              <option>Service Type: All</option>
              <option>Emergency & Trauma</option>
            </select>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </section>

      {/* Master-Detail Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel - List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="relative flex-1">
              <svg className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <input className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg" placeholder="Search facilities..." defaultValue="St. Jude Regional Medical" />
            </div>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">Sort: <strong>Proximity</strong></span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[660px] overflow-y-auto">
            {locations.map((loc) => (
              <div
                key={loc.id}
                onClick={() => setSelectedId(loc.id)}
                className={`p-4 cursor-pointer transition-all ${
                  loc.id === selectedId ? "bg-teal-50/40 border-l-4 border-teal-700" : loc.status === "pending" ? "bg-amber-50/40 border-l-4 border-amber-500" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-white border border-slate-200 px-2 py-0.5 rounded">{loc.id}</span>
                    {loc.id === selectedId && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-800 text-white">Selected</span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border">
                    {loc.status === "active" && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="bg-emerald-50 text-emerald-800">Active</span>
                      </>
                    )}
                    {loc.status === "pending" && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span className="bg-amber-100 text-amber-900">Pending Review</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-900">{loc.name}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                    {loc.traumaLevel && <span className="text-xs text-slate-400">{loc.traumaLevel}</span>}
                    {loc.pharmacyType && <span className="text-xs text-slate-400">{loc.pharmacyType}</span>}
                  </p>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{loc.address}</span>
                </div>
                {loc.status === "pending" && (
                  <div className="mt-2 p-1.5 rounded bg-amber-100/60 border border-amber-200 text-[10px] text-amber-900 font-medium">⚠️ Address pin discrepancy</div>
                )}
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Registry: <strong className={loc.status === "pending" ? "text-amber-800" : "text-teal-800"}>{loc.statusLabel}</strong></span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs">
            <span>Showing <strong>1-4</strong> of <strong>1,428</strong> facilities</span>
            <div className="flex gap-1">
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40" disabled>Prev</button>
              <button className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">Next</button>
            </div>
          </div>
        </div>

        {/* Right Panel - Detail */}
        {selected && (
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col">
            <div className="p-6 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-white border border-teal-200 px-2 py-0.5 rounded shadow-2xs">{selected.id}</span>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">{selected.name}</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                      {selected.status === "active" ? "Active & Verified" : "Pending Review"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-2 flex-wrap">
                    <span>NPI: <strong className="font-mono">{selected.type === "hospital" ? "1942048120" : "N/A"}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>License: {selected.type === "hospital" ? "IL-HOSP-00412" : "Illinois Health Registry"}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs">Edit Details</button>
                  <button className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50">Flag</button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-medium bg-white">
              {tabLabels.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 font-semibold transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? "text-teal-800 border-b-2 border-teal-700" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {tab.label}
                  {tab.count && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[10px] font-bold">{tab.count}</span>}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50/60 rounded-lg p-3.5 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Location Contacts</span>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">Address:</span><span className="font-medium text-slate-800">{selected.address}</span></div>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">Phone:</span><span className="font-mono text-slate-800">{selected.phone}</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-slate-500">Admin:</span><span className="text-slate-800">{selected.adminEmail}</span></div>
                    </div>

                    <div className="bg-slate-50/60 rounded-lg p-3.5 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Verification Record</span>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">Agency:</span><span className="font-medium text-slate-800">Health Registry</span></div>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">Inspection:</span><span className="font-mono text-slate-800">IDPH-2024-L{selected.id.split("-")[2]}</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-slate-500">Auditor:</span><span className="font-medium text-teal-800">Sarah Lin</span></div>
                    </div>
                  </div>

                  {selected.traumaLevel && (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">24/7 Emergency Center Active</h4>
                          <p className="text-[11px] text-slate-600 mt-1">Level 1 Trauma: {selected.traumaLevel}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Clinical Departments</h4>
                    <div className="flex flex-wrap gap-2 text-xs mt-2">
                      {[
                        "Emergency Medicine (24/7)",
                        "Trauma Center",
                        ...(selected.specialties || []),
                        "Laboratory (CLIA Verified)",
                        ...(selected.services ? ["Radiology", "Surgery"] : []),
                      ].map((s, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>

                  {selected.pharmacyType && (
                    <div className="bg-slate-50/60 rounded-lg p-3.5 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Integrated Pharmacy</span>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">Name:</span><span className="font-medium text-slate-800">{selected.pharmacyType}</span></div>
                      <div className="flex justify-between py-0.5 border-b border-slate-100"><span className="text-slate-500">MedPass:</span><span className="font-semibold text-emerald-700">Active & Synced</span></div>
                      <div className="flex justify-between py-0.5"><span className="text-slate-500">Hours:</span><span className="font-mono text-slate-800">24/7 Inpatient / 7a-9p</span></div>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex gap-2 flex-wrap">
                      <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>Update Hours
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>Verify GIS
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Audit: SHA256:7b91...f02a</span>
                  </div>
                </div>
              )}

              {activeTab !== "overview" && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">Content for {tabLabels.find(t => t.id === activeTab)?.label || "Tab"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
