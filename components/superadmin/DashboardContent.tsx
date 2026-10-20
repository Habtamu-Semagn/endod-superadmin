"use client";

import { } from "react";

interface DashboardContentProps {}

export default function DashboardContent({ }: DashboardContentProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-500 mt-1">
              Overview of organisations, facilities, and infrastructure health.
            </p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Connected Organisations</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">1,248</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">+12%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">24 new this week</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Registered Users</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">482,910</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">+8.4%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">3,410 active sessions today</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Active Digital Cards</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">329,450</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">+15.2%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Issued across 42 regions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Pending Reviews</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">38</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">Action Req.</span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-2">14 high priority audits</p>
        </div>
      </section>

      {/* Key Sections */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Approvals Awaiting Review */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Approvals Awaiting Review</h3>
              <span className="text-[11px] font-semibold text-slate-700">4 items</span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { name: "St. Jude Regional Medical Center", type: "General Hospital", status: "Pending Level 2", id: "IL-HOSP-9482" },
                { name: "NovaCare Specialized Pediatrics", type: "Specialized Clinic", status: "Doc Verification", id: "TX-CLIN-1049" },
                { name: "MediPulse Express Pharmacy Chain", type: "Pharmacy Chain", status: "Audit Needed", id: "WA-PHAR-8831" },
                { name: "Lakeside Ambulatory Surgical Center", type: "Surgical Center", status: "Pending", id: "IL-SURG-6031" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.id}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${
                    item.status.includes("Pending") || item.status.includes("Audit") || item.status.includes("Doc")
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  }`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Active Facilities */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Recently Active Facilities</h3>
              <span className="text-[11px] font-semibold text-teal-700">4 items</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { name: "MetroHealth Hub", status: "Enabled" },
                { name: "Apex Pathology Labs", status: "Enabled" },
                { name: "Crestview Oncology", status: "Syncing" },
                { name: "Northshore Ambulatory Surgical Center", status: "Pending Review" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      item.status === "Enabled" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.name.split(" ").map(w => w[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-500">Tier-1 Healthcare Network</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${
                    item.status === "Enabled" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
