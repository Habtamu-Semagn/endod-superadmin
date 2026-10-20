"use client";

import { useState } from "react";

interface SettingItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  value?: string;
  type: "toggle" | "select";
  options?: string[];
}

interface SecurityPolicy {
  id: string;
  title: string;
  description: string;
  settings: SettingItem[];
}

const roleMatrix = [
  {
    id: "super-admin",
    name: "Super Admin",
    tier: "Tier-0 (Infra Root)",
    members: 4,
    description: "Full system configuration, global security policy overrides, break-glass protocol activation, and cryptographic trust root management.",
    features: ["FIDO2 WebAuthn Enforced", "Full PHI Sanitization"],
    dualApprovalRequired: true,
    readOnly: true,
  },
  {
    id: "clinical-auditor",
    name: "Clinical Compliance Auditor",
    tier: "Tier-1",
    members: 12,
    description: "Inspects verification queues, state medical license credential validity, and exportable HIPAA compliance reports.",
    features: ["WORM Ledger Audit", "No Credential Issuance"],
    dualApprovalRequired: false,
    readOnly: false,
  },
  {
    id: "facility-manager",
    name: "Facility Operations Manager",
    tier: "Tier-1",
    members: 28,
    description: "Manages hospital and clinic locations, physical department listings, on-call physician directory, and local service profiles.",
    features: ["Department Directory CRUD"],
    dualApprovalRequired: false,
    readOnly: false,
  },
  {
    id: "tech-support",
    name: "Technical Support Engineer",
    tier: "Tier-2",
    members: 19,
    description: "Assists with sync errors, gateway connectivity, and telemetry metrics. Strict zero-access to physician credentials or PHI.",
    features: ["Telemetry Read-Only"],
    dualApprovalRequired: false,
    readOnly: false,
  },
  {
    id: "card-operator",
    name: "Card & Registry Operator",
    tier: "Tier-2",
    members: 8,
    description: "Digital MedPass provisioning, badge re-issuance, NFC token revocation. No medical record access.",
    features: ["NFC Card Provisioning"],
    dualApprovalRequired: false,
    readOnly: false,
  },
];

const authSettings: SettingItem[] = [
  { id: "mfa-hardware", name: "Mandatory Hardware MFA (FIDO2 / YubiKey)", description: "Software OTP and SMS are rejected for administrative tiers.", enabled: true, type: "toggle" },
  { id: "session-timeout", name: "Inactive Admin Session Timeout", description: "Auto-terminate idling sessions to avoid console hijack.", enabled: true, type: "select", options: ["15 min (Strict SOC2)", "30 min (Standard)", "60 min (Permissive)"], value: "15 min" },
  { id: "concurrent-sessions", name: "Max Concurrent Admin Sessions", description: "Disallow simultaneous logins under identical credential.", enabled: false, type: "select", options: ["1 Session", "2 Sessions", "Unlimited"], value: "1 Session" },
  { id: "step-up", name: "Privileged Step-Up Co-Signature", description: "Prompt hardware token before card revoking or CSV audit dump.", enabled: true, type: "toggle" },
];

const notificationSettings: SettingItem[] = [
  { id: "sla-warnings", name: "SLA Breach Warnings (<18h to expiry)", description: "Dispatches high-priority reminder to clinical verification queue leaders.", enabled: true, type: "toggle", value: "compliance-leads@endodhealth.network" },
  { id: "anomaly-alarms", name: "Anomaly & Break-Glass Alarms", description: "Instant Sev-1 paging for emergency privilege elevations.", enabled: true, type: "toggle", value: "PagerDuty SEC-ESCALATION + SMS" },
  { id: "credential-digest", name: "Credential Expiry Weekly Digest", description: "Consolidated briefing of expiring DEA, state board credentials.", enabled: true, type: "toggle" },
];

const platformSettings: SettingItem[] = [
  { id: "nfc-tap", name: "Digital MedPass NFC Tap v2", description: "Contactless credential verification at medical facility entrances.", enabled: true, type: "toggle" },
  { id: "hl7-sync", name: "HL7 / FHIR Real-Time Sync", description: "Bidirectional EHR integration with clinical systems.", enabled: true, type: "toggle" },
  { id: "merkle-proof", name: "Automated Merkle Proofing", description: "SHA-256 based integrity verification of audit logs.", enabled: true, type: "toggle" },
];

export default function SettingsContent() {
  const [activeTab, setActiveTab] = useState("roles");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold tracking-wider uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700"></span>
            Platform Governance & System Controls
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings & Governance</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Manage role-based access, cryptographic security policies, alert routing, data retention, and core platform directory configurations.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            Audit Change History
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
            </svg>
            Save Governance Changes
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Super Admins</span>
            <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">4 Delegated</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">All FIDO2 MFA</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">+1 break-glass standby active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Baseline</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">Strict (Tier-0)</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded-full">15-min Session Timeout</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Privileged Safeguards: Active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WORM Data Retention</span>
            <span className="p-2 rounded-lg bg-cyan-50 text-cyan-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">7 Years Lock</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-full">HIPAA §164.312(b)</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Automated Immutable Ledger Backups</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Gateways</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">100% Online</span>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">0 Dropped</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 truncate">PagerDuty + SES + Webhook Relays</p>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section className="border-b border-slate-200">
        <nav aria-label="Settings Categories" className="flex space-x-6 overflow-x-auto pb-px">
          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "roles" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("roles")}
          >
            <svg className={`w-4 h-4 ${activeTab === "roles" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Roles & Permissions</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">5 Roles</span>
          </button>

          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "security" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("security")}
          >
            <svg className={`w-4 h-4 ${activeTab === "security" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Security</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">FIDO2 Enforced</span>
          </button>

          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "notifications" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            <svg className={`w-4 h-4 ${activeTab === "notifications" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Notifications</span>
          </button>

          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "platform" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("platform")}
          >
            <svg className={`w-4 h-4 ${activeTab === "platform" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Platform Configuration</span>
          </button>

          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "data" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("data")}
          >
            <svg className={`w-4 h-4 ${activeTab === "data" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>Data & Retention</span>
          </button>

          <button
            className={`group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "account" ? "border-teal-700 text-teal-900" : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            onClick={() => setActiveTab("account")}
          >
            <svg className={`w-4 h-4 ${activeTab === "account" ? "text-teal-700" : "text-slate-400 group-hover:text-slate-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span>My Account</span>
          </button>
        </nav>
      </section>

      {/* Security Notice Banner */}
      <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-start gap-3.5 shadow-xs">
        <div className="p-1.5 bg-teal-100 rounded-lg text-teal-800 shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
        </div>
        <div className="text-xs text-slate-700 leading-relaxed">
          <span className="font-bold text-slate-900">Enterprise Security Notice:</span>
          For V1, administrative role modifications and privileged session policies require dual-officer approval and create immutable audit ledger entries. Direct dangerous infrastructure modifications (raw cluster access, master encryption keys) are isolated at the orchestration tier.
        </div>
      </div>

      {/* Content Area - Roles Tab */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Role Matrix */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Administrative Role Matrix & Delegation</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Define platform authorization boundaries, separation of duties, and co-signatures.</p>
                </div>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold transition-colors shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
                  </svg>
                  <span>Create Custom Role</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {roleMatrix.map((role) => (
                  <div key={role.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{role.name}</h3>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 rounded">
                            {role.tier}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded-full">
                            {role.members} Members
                          </span>
                          {role.dualApprovalRequired && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                              Dual-Approval Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 leading-normal">{role.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500">
                          {role.features.map((feature, i) => (
                            <span key={i} className="inline-flex items-center gap-1 font-mono-code">
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {role.readOnly ? (
                          <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg bg-white shadow-xs">
                            View Permissions
                          </button>
                        ) : (
                          <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg bg-white shadow-xs">
                            Configure Policy
                          </button>
                        )}
                        <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Security Policies */}
          <div className="lg:col-span-5 space-y-5">
            {/* Auth Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Authentication & MFA Enforcement</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">MANDATORY</span>
              </div>
              <div className="p-4 space-y-4 text-xs">
                {authSettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{setting.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{setting.description}</p>
                    </div>
                    {setting.type === "toggle" ? (
                      <div className="relative inline-flex h-5 w-9 shrink-0 cursor-not-allowed items-center rounded-full bg-teal-700">
                        <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition translate-x-4"></span>
                      </div>
                    ) : (
                      <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 font-medium text-slate-700 focus:ring-teal-600 focus:border-teal-600">
                        {setting.options?.map((opt, i) => (
                          <option key={i} className="font-mono-code">{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Notification & Alert Routing</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 font-mono-code">v2.1 PIPELINE</span>
              </div>
              <div className="p-4 space-y-3.5 text-xs">
                {notificationSettings.map((setting) => (
                  <div key={setting.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{setting.name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{setting.description}</p>
                      {setting.value && (
                        <span className="inline-block mt-1 text-[10px] font-mono-code bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {setting.value}
                        </span>
                      )}
                    </div>
                    <div className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-teal-700 transition-colors">
                      <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition translate-x-4"></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs */}
      {activeTab === "security" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Security Settings</h3>
          <p className="text-slate-600">Configure authentication, authorization, and security policies.</p>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Notification Settings</h3>
          <p className="text-slate-600">Configure alert routing and notification channels.</p>
        </div>
      )}

      {activeTab === "platform" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Platform Configuration</h3>
          <p className="text-slate-600">Configure platform directory and infrastructure settings.</p>
        </div>
      )}

      {activeTab === "data" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Data & Retention</h3>
          <p className="text-slate-600">Configure data retention policies and compliance settings.</p>
        </div>
      )}

      {activeTab === "account" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">My Account</h3>
          <p className="text-slate-600">Manage your account settings and preferences.</p>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-6 pb-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Endod MedOS Security Orchestrator: <strong className="font-mono-code text-slate-700">v4.19.2-fips</strong></span>
        </div>
        <div className="flex items-center gap-4">
          <a className="hover:text-slate-800 underline underline-offset-2" href="#">Governance Framework Policy</a>
          <span>•</span>
          <a className="hover:text-slate-800 underline underline-offset-2" href="#">HIPAA Compliance Documentation</a>
          <span>•</span>
          <a className="hover:text-slate-800 underline underline-offset-2" href="#">Break-Glass Protocol</a>
        </div>
      </footer>
    </div>
  );
}
