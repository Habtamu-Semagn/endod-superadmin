"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { HOSPITAL_STATUS, initials, titleCase } from "@/lib/format";
import type { Hospital } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";

const tabs = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
];

export default function OrganisationsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>(searchParams.get("q") ?? "");
  const [rows, setRows] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Hospital[]>("organisations")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the organisations."));
  }, []);

  const filtered = (rows ?? []).filter((o) => {
    if (activeTab !== "all" && o.status !== activeTab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [o.name, o.code, o.city, o.address, o.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisations Directory</h1>
            <p className="text-xs text-slate-500 mt-1">Hospitals and clinics registered with the Endod hospital service.</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search organisations"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="Search organisations..."
            type="text"
          />
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {!rows && !error && <p className="text-xs text-slate-500">Loading organisations…</p>}

      {/* Organisations Vertical List */}
      <section className="flex flex-col gap-3">
        {filtered.map((org) => {
          const status = HOSPITAL_STATUS[org.status] ?? HOSPITAL_STATUS.pending;
          return (
            <Link
              key={org.id}
              href={`/super-admin/organisations/${org.id}`}
              data-testid="organisation-card"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-slate-100 text-slate-700">
                  {initials(org.name)}
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Organisation Name</p>
                    <p className="text-sm font-bold text-slate-900">{org.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Code · Type</p>
                    <p className="text-xs font-mono text-slate-700">{org.code} · {titleCase(org.facility_type)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Phone Number</p>
                    <p className="text-xs text-slate-700">{org.phone ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">City</p>
                    <p className="text-xs text-slate-700">{org.city ?? "—"}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Address</p>
                    <p className="text-xs text-slate-700 truncate">{org.address ?? "—"}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge label={status.label} className={status.className} />
                </div>
              </div>
            </Link>
          );
        })}
        {rows && filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No organisations found.</p>
        )}
      </section>

      {rows && (
        <p className="text-[11px] text-slate-500 text-right">
          Showing {filtered.length} of {rows.length} organisations
        </p>
      )}
    </div>
  );
}
