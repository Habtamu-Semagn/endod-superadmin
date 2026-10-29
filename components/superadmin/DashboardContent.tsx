"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { ErrorBanner } from "@/components/superadmin/ComingSoon";

export default function DashboardContent() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("dashboard")
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard."));
  }, []);

  const value = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
  const platform = data?.platform ?? null;
  const platformNote = data && !data.platform_connected ? "The patient platform is not connected yet" : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">Applications waiting for Endod, hospitals and companies, and activity on the patient platform.</p>
          </div>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {data?.errors.map((message) => <ErrorBanner key={message} message={message} />)}

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/super-admin/verifications" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pending Applications</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-pending">{value(data?.pending_applications)}</span>
            {(data?.pending_applications ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">Action Req.</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Submitted and waiting for review</p>
        </Link>
        <Link href="/super-admin/organisations" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Approved Hospitals</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-approved">{value(data?.approved_hospitals)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Hospitals and clinics approved by Endod · <span data-testid="kpi-pending-hospitals">{value(data?.pending_hospitals)}</span> pending
          </p>
        </Link>
        <Link href="/super-admin/verifications?type=companies" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pending Company Applications</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-pending-companies">{value(data?.pending_company_applications)}</span>
            {(data?.pending_company_applications ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">Action Req.</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2" data-testid="kpi-pending-companies-note">
            {data && !data.companies_connected ? "Companies are not connected yet" : "Companies on TenaCare waiting for review"}
          </p>
          {data?.companies_connected && (
            <p className="text-[11px] text-slate-400" data-testid="kpi-approved-companies">
              {value(data.approved_companies)} approved
            </p>
          )}
        </Link>
      </section>

      {/* The patient platform */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/super-admin/users" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Patient Accounts</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-patients">{value(platform?.users_total)}</span>
            {platform && (
              <span className="text-[11px] font-semibold text-emerald-700" data-testid="kpi-patients-new">+{value(platform.users_new_7d)} in 7 days</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{platformNote ?? "Accounts on the Endod app"}</p>
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Bookings Today</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-bookings-today">{value(platform?.bookings_today)}</span>
            {platform && (
              <span className="text-[11px] font-semibold text-slate-600" data-testid="kpi-bookings-week">{value(platform.bookings_week)} this week</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{platformNote ?? "Paid partner-hospital bookings, Addis Ababa time"}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Open Prescriptions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900" data-testid="kpi-prescriptions">{value(platform?.open_prescriptions)}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{platformNote ?? "Not yet fully given at a pharmacy"}</p>
        </div>
      </section>

      {/* Key Sections */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Approvals Awaiting Review</h3>
              <span className="text-[11px] font-semibold text-slate-700">{data ? `${data.awaiting_review.length} shown` : ""}</span>
            </div>
            <div className="space-y-3 text-sm">
              {data?.awaiting_review.map((item) => (
                <Link
                  key={item.hospital_id}
                  href={`/super-admin/verifications/${item.hospital_id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {item.code} · {titleCase(item.facility_type)} · submitted {formatDate(item.submitted_at)}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono text-right">Demo<br />{formatDateTime(item.demo_at)}</span>
                </Link>
              ))}
              {data && data.awaiting_review.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">No applications are waiting for review.</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Company Applications Awaiting Review</h3>
              <span className="text-[11px] font-semibold text-slate-700">
                {data?.companies_connected ? `${data.awaiting_company_review.length} shown` : ""}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {data?.awaiting_company_review.map((item) => (
                <Link
                  key={item.id}
                  href={`/super-admin/verifications/companies/${item.id}`}
                  data-testid="company-awaiting"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.legal_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      TIN {item.tin} · {titleCase(item.sector)} · submitted {formatDate(item.submitted_at)}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono text-right">{item.city ?? ""}</span>
                </Link>
              ))}
              {data && !data.companies_connected && (
                <p className="text-xs text-slate-500 py-4 text-center">Companies are not connected yet.</p>
              )}
              {data?.companies_connected && data.awaiting_company_review.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">No company applications are waiting for review.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
