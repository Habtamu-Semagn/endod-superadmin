"use client";

import { useState } from "react";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  status: "normal" | "flagged";
  target: string;
  tags: string[];
  details?: string;
}

const auditEvents: AuditEvent[] = [
  {
    id: "LOG-2024-99824",
    timestamp: "2024-10-24T14:18:22.842Z",
    actor: "admin.r.mercer",
    action: "Emergency Break-Glass Role Assignment",
    severity: "SEV-1",
    status: "flagged",
    target: "St. Jude Regional Medical Center",
    tags: ["Privilege Escalation", "After-Hours", "FIDO2 Verified", "VPN Gateway #4"],
    details: "Unusual administrative action outside scheduled maintenance hours.",
  },
  {
    id: "LOG-2024-99819",
    timestamp: "2024-10-24T13:55:04.120Z",
    actor: "sarah.lin",
    action: "Credential Determination Approved",
    severity: "SEV-3",
    status: "normal",
    target: "Dr. Alistair Vance, MD (NPI: 1849204812)",
    tags: ["Credential Review", "Manual Approval"],
  },
  {
    id: "LOG-2024-99805",
    timestamp: "2024-10-24T13:12:40.567Z",
    actor: "admin.super",
    action: "Revoked Compromised Smart Card",
    severity: "SEV-2",
    status: "normal",
    target: "Marcus Vance (Card CRD-44109-IL)",
    tags: ["Security Action", "Token Revocation", "Velocity Replay Anomaly"],
  },
  {
    id: "LOG-2024-99788",
    timestamp: "2024-10-24T11:45:10.889Z",
    actor: "system.gateway-edge",
    action: "Token Verification Burst Blocked",
    severity: "SEV-1",
    status: "flagged",
    target: "Token Route /v2/cards/nfc/verify",
    tags: ["Anomaly Detected", "Rate Limiting", "IP Blocked"],
  },
  {
    id: "LOG-2024-99750",
    timestamp: "2024-10-24T08:00:00.000Z",
    actor: "system.kms-daemon",
    action: "Signing Certificate Rotated",
    severity: "SEV-3",
    status: "normal",
    target: "medos-gateway-prod-key-04",
    tags: ["Key Rotation", "Automated"],
  },
];

function getSeverityColor(s: string) {
  if (s === "SEV-1") return "text-rose-700 bg-rose-100";
  if (s === "SEV-2") return "text-amber-800 bg-amber-100";
  return "text-blue-800 bg-blue-50";
}

export default function AuditLogsContent() {
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(auditEvents[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = auditEvents.filter((event) => {
    const matchesSearch = 
      event.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.action.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-teal-700 mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-700"></span>
            Immutable Compliance Audit Ledger
            <span className="text-slate-400">|</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 font-mono text-slate-700">SEC-TIER-0 & HIPAA</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs & Security Compliance Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Tamper-evident, append-only administrative ledger with strict PII/PHI sanitization.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" x2="12" y1="15" y2="3"></line>
            </svg>
            Export Report / CSV
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            Run Integrity Verification
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Ledger Entries</span>
            <span className="p-1.5 rounded-lg text-teal-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" x2="8" y1="13" y2="13"></line>
                <line x1="16" x2="8" y1="17" y2="17"></line>
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">2,481,904</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Append-Only</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2">+14,290 in 24h • SHA-256 HMAC</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 shadow-xs p-4 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Unusual Admin Actions</span>
            <span className="p-1.5 rounded-lg text-amber-700 bg-amber-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" x2="12" y1="9" y2="13"></line>
                <line x1="12" x2="12.01" y1="17" y2="17"></line>
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900">3 Flagged</span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">2 Review</span>
          </div>
          <p className="text-[11px] text-amber-800 mt-2 border-t border-amber-200/60 pt-2">Automated anomaly detection active</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Immutable Retention Lock</span>
            <span className="p-1.5 rounded-lg text-teal-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect height="11" rx="2" ry="2" width="18" x="3" y="11"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">7 Years</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Locked</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2 truncate">HIPAA / SOC2 legal hold</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sanitized Medical Data</span>
            <span className="p-1.5 rounded-lg text-teal-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">100% Redacted</span>
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-slate-200">HIPAA Compliant</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 border-t border-slate-100 pt-2">No PHI stored</p>
        </div>
      </section>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-teal-900">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="leading-relaxed">
          <strong className="font-bold text-teal-900">Protected Retention & UI Immutability:</strong> Audit events are tamper-evident, generated by backend services, and streamed into write-once storage. UI cannot edit or delete entries.
        </p>
      </div>

      {/* Filter Controls */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 text-white shadow-xs">
            All Audit Events (2,481,904)
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200">
            Privilege Escalation
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200">
            Access & Auth (842)
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <option>All Roles</option>
            <option>Super Admin</option>
            <option>Security Officer</option>
            <option>Gateway Service</option>
          </select>
          <select className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <option>All Severities</option>
            <option>SEV-1 (High Risk)</option>
            <option>SEV-2 (Moderate)</option>
            <option>SEV-3 (Informational)</option>
          </select>
          <div className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Auto-refresh: Live (10s)</span>
          </div>
        </div>
      </section>

      {/* Event Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Audit Event Ledger</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">3 Flagged</span>
            </div>
            <span className="text-[11px] text-slate-500">Updated 4s ago</span>
          </div>

          <div className="relative">
            <input
              className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 placeholder:text-slate-400 focus:ring-1 focus:ring-teal-700"
              placeholder="Filter actor, IP, action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </div>

          {filteredEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`bg-white rounded-xl p-4 shadow-sm border ${
                event.id === (selectedEvent?.id || auditEvents[0].id) ? "border-teal-700" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{event.id}</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${getSeverityColor(event.severity)}`}>
                    <span className="w-1.5 h-1.5 rounded-full"></span>
                    {event.severity}
                  </span>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  event.status === "flagged" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {event.status === "flagged" ? "Flagged" : "Normal"}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mt-2.5">{event.action}</h3>
              <p className="text-xs text-slate-500 mt-1">{event.target}</p>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                {event.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">{tag}</span>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                {event.timestamp.replace("T", " ").replace("Z", " UTC")}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column */}
        {selectedEvent && (
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50/70 to-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">{selectedEvent.id}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${getSeverityColor(selectedEvent.severity)}`}>
                      <span className="w-2 h-2 rounded-full"></span>
                      {selectedEvent.status === "flagged" ? "Flagged" : "Normal"}
                    </span>
                  </div>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-3">{selectedEvent.action}</h2>
                <p className="text-xs text-slate-600 mt-2 space-y-1">
                  <p><strong>Target:</strong> {selectedEvent.target}</p>
                </p>
              </div>

              <div className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Event Context</h4>
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 text-xs">
                  <p><strong>Actor:</strong> {selectedEvent.actor}</p>
                  <p><strong>Severity:</strong> <span className={`font-semibold ${getSeverityColor(selectedEvent.severity).split(" ")[0]}`}>{selectedEvent.severity}</span></p>
                  <p><strong>Tags:</strong> {selectedEvent.tags.join(", ")}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
