"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime, initials } from "@/lib/format";
import type { AdminRow } from "@/lib/types";
import { ComingSoonCard, ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";

export default function SettingsContent() {
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AdminRow[]>("admins")
      .then(setAdmins)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the admins."));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
            <p className="text-xs text-slate-500 mt-1">Admin accounts of this site.</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">Admins</h3>
          <span className="text-[11px] font-semibold text-slate-700">{admins ? `${admins.length} accounts` : ""}</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Read-only here. Admins are added, reset and disabled on the server with <code className="font-mono">python -m app.cli</code>.
        </p>
        {error && <ErrorBanner message={error} />}
        <div className="space-y-3">
          {admins?.map((admin) => (
            <div key={admin.id} data-testid="admin-row" className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(admin.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{admin.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{admin.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                <span className="text-[11px] text-slate-500 hidden md:inline">Last sign-in {formatDateTime(admin.last_login_at)}</span>
                {admin.two_factor ? (
                  <StatusBadge label="2FA on" className="bg-emerald-50 text-emerald-700 border border-emerald-200" />
                ) : (
                  <StatusBadge label="2FA not set up" className="bg-amber-50 text-amber-800 border border-amber-200" />
                )}
                {!admin.active && <StatusBadge label="Disabled" className="bg-slate-100 text-slate-600 border border-slate-200" />}
                {admin.locked && <StatusBadge label="Locked" className="bg-rose-50 text-rose-800 border border-rose-200" />}
              </div>
            </div>
          ))}
          {!admins && !error && <p className="text-xs text-slate-500">Loading…</p>}
        </div>
      </section>

      <ComingSoonCard compact plan="Platform settings (notifications, retention, integrations) arrive in the next step." />
    </div>
  );
}
