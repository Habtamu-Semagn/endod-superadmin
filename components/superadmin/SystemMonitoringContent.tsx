"use client";

import { useState } from "react";

interface Incident {
  id: string;
  severity: "P1" | "P2" | "P3";
  status: "active" | "awaiting_ack" | "resolved";
  title: string;
  description: string;
  impact: string;
  timeline: Array<{ time: string; actor: string; action: string; resolved: boolean }>;
  tags: string[];
}

const incidents: Incident[] = [
  {
    id: "INC-2024-8841",
    severity: "P2",
    status: "active",
    title: "Regional HL7 v2 / FHIR Bridge Telemetry Sync Delay",
    description: "Affecting Illinois Node B (St. Jude & Mercy Hospital feeds)",
    impact: "Hospital patient demographic sync queue backed up ~420 records. Clinical card gateway unaffected.",
    timeline: [
      { time: "14:40 UTC", actor: "Liam Vance (Staff SRE)", action: "Identified throttle limit hit. Re-routing through failover pool-midwest-aux-03", resolved: false },
      { time: "14:26 UTC", actor: "Liam Vance (Staff SRE)", action: "Incident acknowledged. Investigating queue backpressure.", resolved: false },
      { time: "14:22 UTC", actor: "System Auto-Alert", action: "Queue depth exceeded 300 messages (Actual: 420)", resolved: false }
    ],
    tags: ["Integration Bridge", "Latency: +840ms", "Assigned: Liam Vance (SRE)"]
  },
  {
    id: "INC-2024-8839",
    severity: "P3",
    status: "active",
    title: "Digital MedPass NFC Token Cache Replication Blip",
    description: "East Coast Edge Redis replica re-syncing; primary fallback active.",
    impact: "Cache replication minor delay, no patient data affected",
    timeline: [
      { time: "13:15 UTC", actor: "System Auto-Alert", action: "Redis replication lag detected", resolved: false }
    ],
    tags: ["Card Gateway", "Unassigned"]
  },
  {
    id: "INC-2024-8812",
    severity: "P1",
    status: "resolved",
    title: "State Credential Clearinghouse Webhook Timeout",
    description: "State registry downstream maintenance window exceeded SLA.",
    impact: "Downtime: 8 mins",
    timeline: [
      { time: "Yesterday 03:15 UTC", actor: "Liam Vance", action: "Incident resolved. RCA published.", resolved: true }
    ],
    tags: ["Resolved", "RCA Published"]
  }
];

const servicesHealth = [
  { name: "National Card Validation API", uptime: "99.99%", latency: "38ms", status: "healthy" as const },
  { name: "Provider Identity Auth (Keycloak)", uptime: "100%", latency: "54ms", status: "healthy" as const },
  { name: "Postgres Multi-Region DB Cluster", uptime: "100%", latency: "12ms", status: "healthy" as const },
  { name: "FHIR / HL7 Ingestion Worker Queue", uptime: "98.42%", latency: "840ms", status: "degraded" as const },
  { name: "MedOS Regional Exchange Bridge", uptime: "99.97%", latency: "42ms", status: "healthy" as const },
  { name: "Digital MedPass Sync Engine", uptime: "100%", latency: "14ms", status: "healthy" as const },
  { name: "Incident Management API", uptime: "100%", latency: "8ms", status: "healthy" as const },
  { name: "Telemetry Dashboard Service", uptime: "99.98%", latency: "22ms", status: "healthy" as const },
  { name: "Audit Log Processor", uptime: "100%", latency: "11ms", status: "healthy" as const },
  { name: "User Notification Service", uptime: "99.99%", latency: "18ms", status: "healthy" as const },
  { name: "Geo-Fencing Engine", uptime: "99.96%", latency: "31ms", status: "healthy" as const },
  { name: "Backup & Recovery Orchestrator", uptime: "100%", latency: "6ms", status: "healthy" as const },
];

const kpis = [
  { label: "Core API Gateway Availability", value: "99.972%", badge: "+0.04% vs 30d avg", sub: "Avg Response: 42ms (p99: 118ms)", icon: "api" },
  { label: "Auth & Smart Card Verification", value: "100% Operational", badge: "Normal Latency", sub: "48,210 token validations/hr", icon: "auth" },
  { label: "DB Clusters & Job Worker Queue", value: "Healthy", badge: "(38 workers active)", sub: "Latency: 140ms (DB repl lag: 18ms)", icon: "db" },
  { label: "Failed Requests & Error Rate", value: "0.024%", badge: "1 Active Warning", sub: "14 retry alerts in 24h", icon: "warning" },
];

const filterTabs = [
  { label: "All Services & Systems", count: "12", active: true },
  { label: "Active Incidents", count: "2", warning: true },
  { label: "Core Gateways", count: "4" },
  { label: "Database & Queues", count: "3" },
  { label: "Integration Bridges", count: "3" },
  { label: "Resolved History", count: "98" },
];

const severityFilters = [
  { label: "All Severities" },
  { label: "P1 - Critical Outage", warning: true },
  { label: "P2 - High / Degraded", warning: true },
  { label: "P3 - Moderate" },
];

const envFilters = [
  { label: "Production (US-Central/East)" },
  { label: "Staging (US-East)" },
];

function KPIIcon({ icon }: { icon: string }) {
  const icons: Record<string, React.ReactNode> = {
    api: <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>,
    auth: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path><path d="m9 12 2 2 4-4"></path></>,
    db: <><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></>,
    warning: <><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line></>,
  };
  return <>{icons[icon] || null}</>;
}

export default function SystemMonitoringContent() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0]);

  const getSeverityColor = (s: string) => {
    if (s === "P1") return "text-amber-900 bg-amber-100";
    if (s === "P2") return "text-amber-900 bg-amber-100";
    return "text-blue-800 bg-blue-50";
  };

  const getStatusColor = (s: string) => {
    if (s === "healthy") return "text-emerald-700 bg-emerald-50";
    return "text-slate-600 bg-slate-100";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-700"></span>
            Operational Telemetry & Service Health
            <span className="text-slate-400">|</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono text-slate-700">SEC-TIER-0</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Monitoring & Infrastructure Health</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Real-time telemetry, service availability, background job queues, cryptographic card-gateway latencies, and operational incident response triage.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            Export Incident Report / CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 shadow-sm transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <line x1="12" x2="12" y1="5" y2="19"></line>
              <line x1="5" x2="19" y1="12" y2="12"></line>
            </svg>
            Declare Operational Incident
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
              <span className="p-1.5 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <KPIIcon icon={kpi.icon} />
                </svg>
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">{kpi.badge}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>{kpi.sub}</span>
            </p>
          </div>
        ))}
      </section>

      {/* Filter Controls */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {filterTabs.map((tab, i) => (
            <button
              key={i}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                tab.active ? "bg-teal-700 text-white shadow-xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              } ${tab.warning ? "gap-1.5" : ""}`}
            >
              {tab.label}
              {tab.count && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  tab.warning ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-700">
            {severityFilters.map((f, i) => (
              <option key={i}>{f.label}</option>
            ))}
          </select>
          <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:ring-1 focus:ring-teal-700">
            {envFilters.map((f, i) => (
              <option key={i}>{f.label}</option>
            ))}
          </select>
          <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Auto-refresh: 30s</span>
          </div>
        </div>
      </section>

      {/* Master-Detail Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column - Incident Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Operational Triage Queue</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">2 Active</span>
            </div>
            <span className="text-[11px] text-slate-500">Updated 12s ago</span>
          </div>

          <div className="relative">
            <input className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-700" placeholder="Search active incidents or services..." />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>

          {incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => setSelectedIncident(inc)}
              className={`bg-white rounded-xl p-4 shadow-sm transition-all cursor-pointer border ${
                inc.status === "active" && inc.id === (selectedIncident?.id || incidents[0].id) ? "border-teal-700" : "border-slate-200 hover:border-slate-300"
              } ${inc.status === "resolved" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{inc.id}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${getSeverityColor(inc.severity)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {inc.severity} {inc.severity === "P2" && "High"} {inc.severity === "P1" && "Critical"}
                  </span>
                </div>
                {inc.status === "active" && inc.id === (selectedIncident?.id || incidents[0].id) ? (
                  <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">In Investigation</span>
                ) : inc.status === "active" ? (
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Awaiting Ack</span>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Resolved</span>
                )}
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">{inc.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{inc.description}</p>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                {inc.tags.map((tag, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded font-medium ${
                    tag.includes("Latency") ? "bg-rose-50 text-rose-700 border border-rose-200" :
                    tag.includes("Assigned") ? "bg-slate-100 text-slate-600" :
                    tag.includes("Resolved") ? "bg-emerald-50 text-emerald-800" :
                    "bg-slate-100 text-slate-600"
                  }`}>{tag}</span>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {inc.timeline[inc.timeline.length - 1].time.split(" ")[0]} {inc.timeline[inc.timeline.length - 1].time.split(" ").slice(1).join(" ")}
                </span>
                <span className={inc.severity === "P1" ? "font-medium text-amber-800" : "text-slate-400"}>
                  {inc.severity === "P1" ? "SLA Timer: 32m remaining" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Detail Panel */}
        {selectedIncident && (
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header Panel */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50/70 to-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">{selectedIncident.id}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${getSeverityColor(selectedIncident.severity)}`}>
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {selectedIncident.severity} - {selectedIncident.severity === "P1" ? "Critical" : selectedIncident.severity === "P2" ? "Elevated Latency" : "Moderate"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Initial Trigger: <strong className="text-slate-800">{selectedIncident.timeline[0].time} UTC</strong>
                  </div>
                </div>

                <h2 className="text-lg font-bold text-slate-900 mt-3">{selectedIncident.title}</h2>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <p><strong className="text-slate-800">Service Affected:</strong> MedOS Regional Exchange Bridge (US-Midwest Node 2)</p>
                  <p><strong className="text-slate-800">Impact Scope:</strong> {selectedIncident.impact}</p>
                </div>

                {/* Commander Box */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Incident Commander / Assignee</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-900">Liam Vance (Staff SRE / Platform Lead)</span>
                      <button className="text-xs text-teal-700 font-semibold hover:underline">[ Reassign ]</button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Originating Source</span>
                    <div className="mt-1 font-semibold text-slate-800">
                      Datadog synthetic check <span className="font-mono text-slate-600">#SYN-994</span>
                    </div>
                  </div>
                </div>

                {/* Notice Banner */}
                <div className="mt-3 flex items-start gap-2.5 p-3 rounded-lg bg-teal-50/60 border border-teal-100 text-[11px] text-teal-900">
                  <svg className="w-4 h-4 text-teal-900 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                    <line x1="12" x2="12" y1="8" y2="12"></line>
                  </svg>
                  <p className="leading-relaxed">
                    <strong className="font-semibold">Operational Infrastructure Monitoring Notice:</strong> This dashboard tracks platform infrastructure and communication pipelines. Dedicated clinical alarms and safety telemetry remain governed by local hospital EHR protocol.
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default" disabled>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Acknowledged at 14:26 UTC</span>
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-xs transition-colors">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    </svg>
                    <span>Assign Responder ▾</span>
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-xs transition-colors">
                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <line x1="12" x2="12" y1="5" y2="19"></line>
                      <line x1="5" x2="19" y1="12" y2="12"></line>
                    </svg>
                    <span>Add Note</span>
                  </button>
                </div>
                <button className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Mark Incident Resolved</span>
                </button>
              </div>

              {/* Timeline */}
              <div className="p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Investigation Timeline & Mitigations</h4>
                <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4 text-xs">
                  {selectedIncident.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full ${item.resolved ? "bg-emerald-500 ring-4 ring-white" : "bg-teal-900 ring-4 ring-white"}`}></div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.time}</span>
                        <span className={`font-semibold ${item.actor.includes("Vance") ? "text-teal-900" : item.resolved ? "text-emerald-800" : "text-slate-800"}`}>{item.actor}</span>
                      </div>
                      <p className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.action}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Note Input */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <textarea className="w-full text-xs rounded-lg border-slate-200 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 placeholder:text-slate-400" placeholder="Add operational triage note, mitigation step, or root cause hypothesis..." rows={2}></textarea>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded">
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                        </svg>
                        <span>Attach Log Snippet</span>
                      </button>
                      <span className="text-[10px] text-slate-400">Markdown supported</span>
                    </div>
                    <button className="px-3.5 py-1 text-xs font-semibold text-white bg-teal-900 hover:bg-teal-800 rounded-lg shadow-xs transition-colors">Post Update</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Health Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Core Services Real-Time Latency & Health Matrix</h4>
                <span className="text-[11px] text-slate-400">Probing 12 edge endpoints</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {servicesHealth.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{s.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Uptime: {s.uptime} • Avg: {s.latency}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(s.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === "healthy" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                      {s.status === "healthy" ? "Healthy" : s.status === "degraded" ? "Degraded" : "Healthy"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
