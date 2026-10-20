"use client";

import { useState } from "react";

interface Location {
  id: string;
  name: string;
  type: "hospital" | "clinic" | "pharmacy" | "surgical";
  address: string;
  status: "active" | "pending";
  statusLabel: string;
  statusClass: string;
  phone: string;
  specialties: string;
}

const locations: Location[] = [
  { id: "FAC-IL-9482", name: "St. Jude Regional Medical Center - Main Campus", type: "hospital", address: "251 E Huron St, Chicago, IL 60611", status: "active", statusLabel: "Active", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", phone: "+1 (312) 555-0199", specialties: "Cardiology, Trauma, Oncology" },
  { id: "FAC-IL-8841", name: "NovaCare Pediatrics & Urgent Care", type: "clinic", address: "1044 N Michigan Ave, Suite 300, Chicago, IL", status: "active", statusLabel: "Active", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", phone: "+1 (312) 555-0245", specialties: "Pediatrics, Urgent Care" },
  { id: "FAC-IL-7219", name: "BioScript Specialty Pharmacy - North Branch", type: "pharmacy", address: "830 N Clark St, Chicago, IL 60610", status: "active", statusLabel: "Active", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", phone: "+1 (312) 555-0333", specialties: "Clinical Pharmacy" },
  { id: "FAC-IL-6031", name: "Lakeside Ambulatory Surgical Center", type: "surgical", address: "500 E Grand Ave, Chicago, IL 60611", status: "pending", statusLabel: "Pending Review", statusClass: "bg-amber-50 text-amber-800 border border-amber-300", phone: "+1 (312) 555-0421", specialties: "Orthopedic Surgery" },
];

export default function LocationsContent() {
  const [selectedId, setSelectedId] = useState<string>("FAC-IL-9482");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const selected = locations.find((l) => l.id === selectedId);

  const filteredLocations = locations.filter((loc) => {
    const matchesStatus = statusFilter === "all" || loc.status === statusFilter;
    const matchesType = typeFilter === "all" || loc.type === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      loc.id.toLowerCase().includes(q) ||
      loc.name.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q) ||
      loc.phone.includes(q) ||
      loc.specialties.toLowerCase().includes(q) ||
      loc.type.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Locations & Facilities</h1>
            <p className="text-xs text-slate-500 mt-1">{selected?.name}</p>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900" placeholder="Search facilities..." type="text" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === "all" ? "bg-[#0d5c52] text-white border-[#0d5c52]" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>All Facilities</button>
          <button onClick={() => setStatusFilter("active")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === "active" ? "bg-[#0d5c52] text-white border-[#0d5c52]" : "bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200"}`}>Active</button>
          <button onClick={() => setStatusFilter("pending")} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${statusFilter === "pending" ? "bg-[#0d5c52] text-white border-[#0d5c52]" : "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"}`}>Pending Review</button>
        </div>
      </section>

      {/* Type Filters */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mr-1">Type:</span>
        {[
          { id: "all", label: "All Types" },
          { id: "hospital", label: "Hospitals" },
          { id: "clinic", label: "Clinics" },
          { id: "pharmacy", label: "Pharmacies" },
          { id: "surgical", label: "Surgical Centers" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTypeFilter(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              typeFilter === t.id
                ? "bg-[#0d5c52] text-white border-[#0d5c52]"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            {t.label}
          </button>
        ))}
      </section>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map((loc) => (
          <div key={loc.id}
            onClick={() => setSelectedId(loc.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              loc.id === selectedId ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{loc.id}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${loc.statusClass}`}>{loc.statusLabel}</span>
              </div>
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-sm">{loc.name}</h3>
            <p className="text-[11px] text-slate-500">{loc.type}</p>
            <p className="text-[11px] text-slate-600 mt-1">{loc.address}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">{loc.phone}</p>
            <p className="text-[11px] text-slate-500 mt-1">{loc.specialties}</p>
          </div>
        ))}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing {filteredLocations.length} of {locations.length} facilities • Search filters apply
      </p>
    </div>
  );
}
