"use client";

import { useState } from "react";

interface Incident {
  id: string;
  severity: "P1" | "P2" | "P3";
  title: string;
  description: string;
  statusClass: string;
  statusLabel: string;
}

const incidents: Incident[] = [
  { id: "INC-2024-8841", severity: "P2", title: "Regional HL7/FHIR Bridge Sync Delay", description: "Illinois Node B (St. Jude & Mercy Hospital feeds) - queue backed up ~420 records.", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", statusLabel: "Active - Awaiting Ack" },
  { id: "INC-2024-8839", severity: "P3", title: "MedPass NFC Token Cache Replication Blip", description: "East Coast edge Redis replica re-syncing; primary fallback active.", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", statusLabel: "Active - Investigating" },
];

const servicesHealth = [
  { name: "National Card Validation API", status: "healthy" },
  { name: "Provider Identity Auth (Keycloak)", status: "healthy" },
  { name: "Postgres Multi-Region DB Cluster", status: "healthy" },
  { name: "FHIR/HL7 Ingestion Worker Queue", status: "degraded" },
  { name: "MedPass Sync Engine", status: "healthy" },
];

export default function SystemMonitoringContent() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0]);
  const [search, setSearch] = useState<string>("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitoring</h1>
            <p className="text-xs text-slate-500 mt-1">Service health and active incidents.</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Service Availability</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">99.972%</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">+0.04% vs 30d avg</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Active Incidents</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">2</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-200">Awaiting Ack</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Avg Latency</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">42ms</span>
            <span className="text-[11px] text-slate-500">p99: 118ms</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium">Error Rate</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">0.024%</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Normal</span>
          </div>
        </div>
      </section>

      {/* Incident Queue */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-bold text-slate-900">Active Incidents</h3>
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20" placeholder="Search incidents..." type="text" />
          </div>
        </div>
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                inc.id === selectedIncident?.id ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-[11px] bg-white border border-teal-200 px-2 py-0.5 rounded">{inc.id}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${inc.statusClass}`}>{inc.statusLabel}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm">{inc.title}</h4>
              <p className="text-[11px] text-slate-500 mt-1">{inc.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Health */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Services Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {servicesHealth.map((s) => (
            <div key={s.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
              <span className="font-medium text-slate-900 text-xs">{s.name}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                s.status === "healthy" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-300"
              }`}>{s.status === "healthy" ? "Healthy" : "Degraded"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
