"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { APPLICATION_STATUS, formatDate, titleCase } from "@/lib/format";
import type { CompanyApplicationSummary } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";
import KindSwitch, { NotConnected, isNotConnected } from "@/components/superadmin/KindSwitch";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "draft", label: "Draft" },
  { id: "rejected", label: "Sent back" },
  { id: "approved", label: "Approved" },
];

/** Companies applying on TenaCare (organisation.endod-health.com). */
export default function CompanyVerificationsContent() {
  const [rows, setRows] = useState<CompanyApplicationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("submitted");

  useEffect(() => {
    apiFetch<CompanyApplicationSummary[]>("company-applications")
      .then(setRows)
      .catch((e: unknown) => {
        if (isNotConnected(e)) setNotConnected((e as ApiError).message);
        else setError(e instanceof ApiError ? e.message : "Could not load the company applications.");
      });
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
    return [row.legal_name, row.trade_name, row.tin, row.city, row.sector, row.contact?.full_name, row.contact?.email, row.contact?.phone]
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
              Companies applying on TenaCare for their employees. Times are Addis Ababa time (EAT).
            </p>
          </div>
          <KindSwitch basePath="/super-admin/verifications" active="companies" />
        </div>
      </section>

      {notConnected ? (
        <NotConnected message={notConnected} />
      ) : (
        <>
          {/* Search + Filters */}
          <section className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[250px]">
              <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search company applications"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                placeholder="Search by company, TIN, city, sector or contact..."
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
          {!rows && !error && <p className="text-xs text-slate-500">Loading company applications…</p>}

          {/* Applications */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((row) => {
              const status = APPLICATION_STATUS[row.status] ?? APPLICATION_STATUS.draft;
              return (
                <Link
                  key={row.id}
                  href={`/super-admin/verifications/companies/${row.id}`}
                  data-testid="company-application-card"
                  className="rounded-xl border p-4 transition-all border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">TIN {row.tin}</span>
                    <StatusBadge label={status.label} className={status.className} />
                  </div>
                  <h3 className="font-bold text-slate-900 mt-3 text-sm">{row.legal_name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {titleCase(row.sector)} · {row.employee_count.toLocaleString("en-US")} employees · {row.city ?? "—"}
                  </p>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 font-mono">
                    <p>Submitted: {formatDate(row.submitted_at)}</p>
                    {row.contact && (
                      <p>
                        {row.contact.full_name}
                        {row.contact.phone ? ` · ${row.contact.phone}` : ""}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
            {rows && filtered.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8 sm:col-span-2">No company applications match.</p>
            )}
          </section>

          {rows && (
            <p className="text-[11px] text-slate-500 text-right">
              Showing {filtered.length} of {rows.length} company applications
            </p>
          )}
        </>
      )}
    </div>
  );
}
