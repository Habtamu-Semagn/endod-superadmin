"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import type { Dashboard } from "@/lib/types";
import { ComingSoonCard, ErrorBanner } from "@/components/superadmin/ComingSoon";

export default function DashboardContent() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Dashboard>("dashboard")
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard."));
  }, []);

  const value = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">Applications waiting for Endod, from hospitals and companies, and the hospitals already approved.</p>
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
          <p className="text-[11px] text-slate-400 mt-2">Hospitals and clinics approved by Endod</p>
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
        </Link>
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
          <ComingSoonCard compact plan="Users, digital cards, regional coverage and system health arrive here in the next step." />
        </div>
      </section>
    </div>
  );
}
