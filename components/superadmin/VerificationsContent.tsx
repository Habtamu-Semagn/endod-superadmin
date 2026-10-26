"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { APPLICATION_STATUS, formatDate, formatDateTime, titleCase } from "@/lib/format";
import type { ApplicationSummary } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";
import CompanyVerificationsContent from "@/components/superadmin/CompanyVerificationsContent";
import KindSwitch, { kindOf } from "@/components/superadmin/KindSwitch";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "draft", label: "Draft" },
  { id: "rejected", label: "Sent back" },
  { id: "approved", label: "Approved" },
  { id: "suspended", label: "Suspended" },
];

export default function VerificationsContent() {
  const kind = kindOf(useSearchParams().get("type"));
  return kind === "companies" ? <CompanyVerificationsContent /> : <HospitalVerifications />;
}

function HospitalVerifications() {
  const [rows, setRows] = useState<ApplicationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("submitted");

  useEffect(() => {
    apiFetch<ApplicationSummary[]>("applications")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the applications."));
  }, []);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: rows?.length ?? 0 };
    for (const row of rows ?? []) result[row.status] = (result[row.status] ?? 0) + 1;
    return result;
  }, [rows]);

  const filtered = (rows ?? []).filter((row) => {
    if (activeFilter !== "all" && row.status !== activeFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.name, row.code, row.city, row.contact?.name, row.contact?.email, row.contact?.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verifications</h1>
            <p className="text-xs text-slate-500 mt-1">
              Hospitals and clinics applying to join Endod. Times are Addis Ababa time (EAT).
            </p>
          </div>
          <KindSwitch basePath="/super-admin/verifications" active="hospitals" />
        </div>
      </section>

      {/* Search + Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search applications"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="Search by facility, code, city or contact..."
            type="text"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
          {FILTERS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveFilter(pill.id)}
              aria-pressed={activeFilter === pill.id}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                activeFilter === pill.id
                  ? "bg-[#0d5c52] text-white border-[#0d5c52]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pill.label} <span className="opacity-70">{counts[pill.id] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {!rows && !error && <p className="text-xs text-slate-500">Loading applications…</p>}

      {/* Applications */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((row) => {
          const status = APPLICATION_STATUS[row.status] ?? APPLICATION_STATUS.draft;
          return (
            <Link
              key={row.hospital_id}
              href={`/super-admin/verifications/${row.hospital_id}`}
              data-testid="application-card"
              className="rounded-xl border p-4 transition-all border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{row.code}</span>
                <StatusBadge label={status.label} className={status.className} />
              </div>
              <h3 className="font-bold text-slate-900 mt-3 text-sm">{row.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {titleCase(row.facility_type)} · {titleCase(row.ownership)} · {row.city ?? "—"}
              </p>
              <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 font-mono">
                <p>Submitted: {formatDate(row.submitted_at)}</p>
                <p>Demo: {formatDateTime(row.demo_at)}</p>
                {row.contact && (
                  <p>
                    {row.contact.name}
                    {row.contact.phone ? ` · ${row.contact.phone}` : ""}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
        {rows && filtered.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8 sm:col-span-2">No applications match.</p>
        )}
      </section>

      {rows && (
        <p className="text-[11px] text-slate-500 text-right">
          Showing {filtered.length} of {rows.length} applications
        </p>
      )}
    </div>
  );
}
