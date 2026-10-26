"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { TIMEZONE, formatDateTime, titleCase } from "@/lib/format";
import type { AuditItem, AuditPage } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  sign_in: "Sign-in",
  sign_in_password: "Password accepted",
  sign_out: "Sign-out",
  account_locked: "Address locked out of account",
  account_backoff: "Sign-in backoff",
  setup_link: "Setup link used",
  setup_completed: "Setup completed",
  enrolment_started: "Authenticator set-up started",
  totp_enrolled: "Authenticator enrolled",
  reauth: "Re-authentication",
  hospital_approve: "Hospital approved",
  application_reject: "Application sent back",
  hospital_suspend: "Hospital suspended",
  hospital_delete: "Sign-up deleted",
  document_view: "Document viewed",
  admin_created: "Admin created",
  admin_2fa_reset: "Two-factor reset",
  admin_disabled: "Admin disabled",
  company_approve: "Company approved",
  company_reject: "Company application sent back",
  company_suspend: "Company suspended",
  company_reactivate: "Company reactivated",
  company_document_view: "Company document viewed",
};

const RESULT = {
  success: { label: "Success", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  failure: { label: "Failure", className: "bg-rose-100 text-rose-800 border border-rose-300" },
};

/** The start of a day (yyyy-mm-dd) in Addis Ababa time (UTC+3, no daylight saving), as ISO. */
function addisDayStart(day: string, addDays = 0): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + addDays);
  return date.toISOString();
}

function describe(item: AuditItem): string {
  const detail = item.detail ?? {};
  const parts: string[] = [];
  for (const key of ["reason", "error", "kind", "method", "step", "via"]) {
    const value = detail[key];
    if (typeof value === "string" && value) parts.push(`${key}: ${value}`);
  }
  if (detail.download === true) parts.push("downloaded");
  return parts.join(" · ");
}

export default function AuditLogsContent() {
  const [data, setData] = useState<AuditPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (query) params.set("q", query);
    if (action) params.set("action", action);
    if (result) params.set("result", result);
    const since = from ? addisDayStart(from) : null;
    const until = to ? addisDayStart(to, 1) : null;
    if (since) params.set("since", since);
    if (until) params.set("until", until);
    let alive = true;
    apiFetch<AuditPage>(`audit?${params.toString()}`)
      .then((value) => {
        if (!alive) return;
        setData(value);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof ApiError ? e.message : "Could not load the audit log."));
    return () => {
      alive = false;
    };
  }, [page, query, action, result, from, to]);

  const totals = data?.totals;
  const first = data && data.total ? (data.page - 1) * data.page_size + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.page_size) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Logs</h1>
            <p className="text-xs text-slate-500 mt-1">
              Every sign-in, enrolment, approval, rejection, suspension, deletion and document view. Times in {TIMEZONE.replace("_", " ")} (EAT).
            </p>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Events", value: totals?.all, note: "Append-only", noteClass: "text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full" },
          { label: "Successful Actions", value: totals?.success, note: "", noteClass: "" },
          { label: "Failed Actions", value: totals?.failure, note: "", noteClass: "" },
          { label: "Failed Sign-ins", value: totals?.sign_in_failures, note: "Security", noteClass: "text-rose-700" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">{card.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{card.value ?? "—"}</span>
              {card.note && <span className={`text-[11px] font-semibold ${card.noteClass}`}>{card.note}</span>}
            </div>
          </div>
        ))}
      </section>

      {/* Search + Filters */}
      <section className="flex flex-wrap items-end gap-3">
        <form
          className="relative flex-1 min-w-[250px]"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
        >
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => {
              if (search.trim() !== query) {
                setQuery(search.trim());
                setPage(1);
              }
            }}
            aria-label="Search the audit log"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="Search admin email, target, hospital id or IP (Enter)..."
            type="text"
          />
        </form>
        <select
          aria-label="Action"
          value={action}
          onChange={(e) => resetPage(setAction)(e.target.value)}
          className="py-2 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
        >
          <option value="">All actions</option>
          {(data?.actions ?? Object.keys(ACTION_LABELS)).map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? titleCase(a)}</option>
          ))}
        </select>
        <select
          aria-label="Result"
          value={result}
          onChange={(e) => resetPage(setResult)(e.target.value)}
          className="py-2 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
        >
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
        <label className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          From
          <input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} className="block mt-0.5 py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 normal-case" />
        </label>
        <label className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          To
          <input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} className="block mt-0.5 py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 normal-case" />
        </label>
      </section>

      {error && <ErrorBanner message={error} />}

      {/* Events List */}
      <section className="space-y-3">
        {data?.items.map((event) => {
          const badge = RESULT[event.result] ?? RESULT.failure;
          const extra = describe(event);
          return (
            <div key={event.id} data-testid="audit-event" className="rounded-xl border p-4 transition-all border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[11px] bg-white border border-teal-200 px-2 py-0.5 rounded flex-shrink-0">{event.id.slice(0, 8)}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate" data-testid="audit-action">{ACTION_LABELS[event.action] ?? titleCase(event.action)}</h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                      {event.target_type ? `${event.target_name ?? event.target_id ?? ""}${event.target_name && event.target_id ? ` (${event.target_id})` : ""}` : "—"}
                      {extra ? ` · ${extra}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <StatusBadge label={badge.label} className={badge.className} />
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-800">{event.admin_email ?? "unknown"}</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className="font-mono">{event.ip ?? "—"}</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className="font-mono">{formatDateTime(event.at)}</span>
              </div>
            </div>
          );
        })}
        {data && data.items.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No events match.</p>}
        {!data && !error && <p className="text-xs text-slate-500">Loading the audit log…</p>}
      </section>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500" data-testid="audit-range">
          {data ? `Showing ${first}–${last} of ${data.total} audit events` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
