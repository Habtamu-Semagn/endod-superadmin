"use client";

import { useState } from "react";
import Link from "next/link";
import { organisations, type Organisation } from "@/lib/organisations";

const tabs = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "audit", label: "Audit" },
];

export default function OrganisationsContent() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const filtered = organisations.filter((o) => {
    const matchesTab =
      activeTab === "all" || o.status.toLowerCase() === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.name.toLowerCase().includes(q) ||
      o.licenseNumber.toLowerCase().includes(q) ||
      o.city.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q) ||
      o.phoneNumber.includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisations Directory</h1>
            <p className="text-xs text-slate-500 mt-1">Manage registered healthcare organisations.</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#0d5c52] text-[#0d5c52]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <section>
        <div className="relative max-w-md">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900" placeholder="Search organisations..." type="text" />
        </div>
      </section>

      {/* Organisations Vertical List */}
      <section className="flex flex-col gap-3">
        {filtered.map((org: Organisation) => (
          <Link
            key={org.id}
            href={`/super-admin/organisations/${org.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-slate-100 text-slate-700">
                {org.initials}
              </div>
              <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Organisation Name</p>
                  <p className="text-sm font-bold text-slate-900">{org.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">License Number</p>
                  <p className="text-xs font-mono text-slate-700">{org.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Phone Number</p>
                  <p className="text-xs text-slate-700">{org.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">City</p>
                  <p className="text-xs text-slate-700">{org.city}</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Address</p>
                  <p className="text-xs text-slate-700 truncate">{org.address}</p>
                </div>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${org.statusBadgeClass}`}>{org.statusBadge}</span>
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No organisations found.</p>
        )}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing {filtered.length} of {organisations.length} organisations
      </p>
    </div>
  );
}
