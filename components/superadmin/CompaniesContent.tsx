"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { COMPANY_STATUS, formatDate, initials } from "@/lib/format";
import type { Company } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";
import KindSwitch, { NotConnected, isNotConnected } from "@/components/superadmin/KindSwitch";

const tabs = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
];

type Pending = { company: Company; action: "suspend" | "reactivate" } | null;

/** The Companies directory: organisations on TenaCare, suspended or reactivated from here. */
export default function CompaniesContent({ initialSearch = "" }: { initialSearch?: string }) {
  const { runSensitive } = useAdmin();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState<string>(initialSearch);
  const [rows, setRows] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<Company[]>("companies")
      .then((value) => {
        setRows(value);
        setError(null);
      })
      .catch((e: unknown) => {
        if (isNotConnected(e)) setNotConnected((e as ApiError).message);
        else setError(e instanceof ApiError ? e.message : "Could not load the companies.");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perform = async () => {
    if (!pending) return;
    const { company, action } = pending;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      await runSensitive(() => apiFetch(`companies/${company.id}/${action}`, { method: "POST" }));
      setNotice(action === "suspend" ? `${company.name} is suspended.` : `${company.name} is active again.`);
      load();
    } catch (e) {
      if (!(e instanceof Cancelled)) setActionError(e instanceof ApiError ? e.message : "The request failed.");
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  const filtered = (rows ?? []).filter((c) => {
    if (activeTab !== "all" && c.status !== activeTab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [c.name, c.tin].some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisations Directory</h1>
            <p className="text-xs text-slate-500 mt-1">Companies on TenaCare, approved by Endod.</p>
          </div>
          <KindSwitch basePath="/super-admin/organisations" active="companies" />
        </div>
      </section>

      {notConnected ? (
        <NotConnected message={notConnected} />
      ) : (
        <>
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
                aria-label="Search companies"
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
                placeholder="Search companies by name or TIN..."
                type="text"
              />
            </div>
          </section>

          {error && <ErrorBanner message={error} />}
          {actionError && <ErrorBanner message={actionError} testId="action-error" />}
          {notice && <SuccessBanner message={notice} />}
          {!rows && !error && <p className="text-xs text-slate-500">Loading companies…</p>}

          <section className="flex flex-col gap-3">
            {filtered.map((company) => {
              const status = COMPANY_STATUS[company.status] ?? COMPANY_STATUS.active;
              const suspended = company.status === "suspended";
              return (
                <div key={company.id} data-testid="company-row" className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-slate-100 text-slate-700">
                      {initials(company.name)}
                    </div>
                    <div className="min-w-0 flex-1 grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-1">
                      <div className="col-span-2 lg:col-span-1">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Company</p>
                        <p className="text-sm font-bold text-slate-900">{company.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">TIN</p>
                        <p className="text-xs font-mono text-slate-700">{company.tin}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Employees</p>
                        <p className="text-xs text-slate-700" data-testid="company-employees">{company.employees.toLocaleString("en-US")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Admins</p>
                        <p className="text-xs text-slate-700" data-testid="company-admins">{company.admins.toLocaleString("en-US")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Joined</p>
                        <p className="text-xs text-slate-700">{formatDate(company.created_at)}</p>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <StatusBadge label={status.label} className={status.className} />
                      <button
                        type="button"
                        onClick={() => setPending({ company, action: suspended ? "reactivate" : "suspend" })}
                        className={
                          suspended
                            ? "px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white"
                            : "px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700"
                        }
                      >
                        {suspended ? "Reactivate" : "Suspend"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {rows && filtered.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No companies found.</p>}
          </section>

          {rows && (
            <p className="text-[11px] text-slate-500 text-right">
              Showing {filtered.length} of {rows.length} companies
            </p>
          )}
        </>
      )}

      {pending?.action === "suspend" && (
        <Dialog
          testId="suspend-dialog"
          title={`Suspend ${pending.company.name}?`}
          description="Its admins are signed out of TenaCare and cannot sign in until the company is reactivated."
          confirmLabel="Suspend"
          tone="danger"
          busy={busy}
          onConfirm={perform}
          onCancel={() => !busy && setPending(null)}
        />
      )}
      {pending?.action === "reactivate" && (
        <Dialog
          testId="reactivate-dialog"
          title={`Reactivate ${pending.company.name}?`}
          description="Its admins can sign in to TenaCare again."
          confirmLabel="Reactivate"
          busy={busy}
          onConfirm={perform}
          onCancel={() => !busy && setPending(null)}
        />
      )}
    </div>
  );
}
