"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { PATIENT_STATUS, formatDate, initials } from "@/lib/format";
import type { PatientSearch } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";

/** Patient accounts on the Endod app: search, then open one. Account data only. */
export default function UsersStaffContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") ?? "";
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [result, setResult] = useState<PatientSearch | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only the latest search's answer is shown, whatever order they arrive in.
    let current = true;
    // A POST: what was searched stays out of URLs and access logs.
    apiFetch<PatientSearch>("patients/search", { method: "POST", body: { query } })
      .then((data) => {
        if (!current) return;
        setResult(data);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!current) return;
        setResult(null);
        setError(e instanceof ApiError ? e.message : "Could not load the patient accounts.");
      });
    return () => {
      current = false;
    };
  }, [query]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(input.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
            <p className="text-xs text-slate-500 mt-1">
              Patient accounts on the Endod app. Account details only: health data is never shown here.
              Suspending signs the patient out and blocks sign-in and new hospital links; prescriptions and existing hospital links keep working.
            </p>
          </div>
        </div>
      </section>

      {/* Search */}
      <section>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2 max-w-xl" role="search">
          <div className="relative flex-1 min-w-[240px]">
            <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Search patient accounts"
              maxLength={100}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
              placeholder="Name, phone, email or Endod ID..."
              type="text"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
          >
            Search
          </button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {!result && !error && <p className="text-xs text-slate-500">Loading accounts…</p>}

      <section className="flex flex-col gap-3">
        {result?.items.map((account) => {
          const status = PATIENT_STATUS[account.status] ?? PATIENT_STATUS.active;
          return (
            <Link
              key={account.dedan_id}
              href={`/super-admin/users/${account.dedan_id}`}
              data-testid="patient-card"
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-slate-100 text-slate-700">
                  {initials(account.name ?? account.dedan_id)}
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Name</p>
                    <p className="text-sm font-bold text-slate-900">{account.name ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Endod ID</p>
                    <p className="text-xs font-mono text-slate-700">{account.dedan_id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Phone · Email</p>
                    <p className="text-xs text-slate-700 truncate">{account.phone ?? "—"} · {account.email ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Joined</p>
                    <p className="text-xs text-slate-700">{formatDate(account.created_at)}</p>
                  </div>
                </div>
                <div className="shrink-0">
                  <StatusBadge label={status.label} className={status.className} />
                </div>
              </div>
            </Link>
          );
        })}
        {result && result.items.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No patient accounts found.</p>
        )}
      </section>

      {result && result.items.length > 0 && (
        <p className="text-[11px] text-slate-500 text-right" data-testid="patient-count">
          {result.limit !== null && result.items.length >= result.limit
            ? `Showing the first ${result.items.length} accounts; search to narrow them down`
            : `Showing ${result.items.length} account${result.items.length === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}
