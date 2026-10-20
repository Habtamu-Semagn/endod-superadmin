"use client";

import { useState } from "react";

interface AuditEvent {
  id: string;
  action: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  severityClass: string;
  status: "normal" | "flagged";
  statusLabel: string;
  statusClass: string;
  target: string;
  actor: string;
  timestamp: string;
}

const auditEvents: AuditEvent[] = [
  { id: "LOG-2024-99824", action: "Emergency Break-Glass Role Assignment", severity: "SEV-1", severityClass: "bg-rose-100 text-rose-800 border border-rose-300", status: "flagged", statusLabel: "Flagged", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", target: "St. Jude Regional Medical Center", actor: "admin.r.mercer", timestamp: "2024-10-24 14:18 UTC" },
  { id: "LOG-2024-99819", action: "Credential Determination Approved", severity: "SEV-3", severityClass: "bg-blue-100 text-blue-800 border border-blue-300", status: "normal", statusLabel: "Normal", statusClass: "bg-emerald-100 text-emerald-800 border border-emerald-200", target: "Dr. Alistair Vance, MD (NPI: 1849204812)", actor: "sarah.lin", timestamp: "2024-10-24 13:55 UTC" },
  { id: "LOG-2024-99805", action: "Revoked Compromised Smart Card", severity: "SEV-2", severityClass: "bg-amber-100 text-amber-900 border border-amber-300", status: "normal", statusLabel: "Normal", statusClass: "bg-emerald-100 text-emerald-800 border border-emerald-200", target: "Marcus Vance (Card CRD-44109-IL)", actor: "admin.super", timestamp: "2024-10-24 13:12 UTC" },
  { id: "LOG-2024-99788", action: "Token Verification Burst Blocked", severity: "SEV-1", severityClass: "bg-rose-100 text-rose-800 border border-rose-300", status: "flagged", statusLabel: "Flagged", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", target: "Token Route /v2/cards/nfc/verify", actor: "system.gateway-edge", timestamp: "2024-10-24 11:45 UTC" },
  { id: "LOG-2024-99750", action: "Signing Certificate Rotated", severity: "SEV-3", severityClass: "bg-blue-100 text-blue-800 border border-blue-300", status: "normal", statusLabel: "Normal", statusClass: "bg-emerald-100 text-emerald-800 border border-emerald-200", target: "medos-gateway-prod-key-04", actor: "system.kms-daemon", timestamp: "2024-10-24 08:00 UTC" },
];

export default function AuditLogsContent() {
  const [selectedId, setSelectedId] = useState<string>("LOG-2024-99824");
  const [search, setSearch] = useState<string>("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Logs</h1>
            <p className="text-xs text-slate-500 mt-1">Monitor administrative activities and security events.</p>
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Total Events</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">2,481,904</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Append-Only</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Successful Actions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">2,478,562</span>
            <span className="text-[11px] text-emerald-700 font-semibold">99.9%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Failed Actions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">3,342</span>
            <span className="text-[11px] text-amber-700 font-semibold">0.1%</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Security Events</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">39</span>
            <span className="text-[11px] font-semibold text-rose-700 font-semibold">Flagged</span>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" placeholder="Search actor, action, or target..." type="text" />
        </div>
      </section>

      {/* Events List */}
      <section className="space-y-3">
        {auditEvents.map((event) => (
          <div key={event.id}
            onClick={() => setSelectedId(event.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              event.id === selectedId ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-[11px] bg-white border border-teal-200 px-2 py-0.5 rounded flex-shrink-0">{event.id}</span>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{event.action}</h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{event.target}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${event.severityClass}`}>{event.severity}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${event.statusClass}`}>{event.statusLabel}</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800">{event.actor}</span>
              <span className="text-slate-400 mx-1">|</span>
              <span className="font-mono">{event.timestamp}</span>
            </div>
          </div>
        ))}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing 1–5 of 2,481,904 audit events • Search filters apply
      </p>
    </div>
  );
}
