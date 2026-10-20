"use client";

import { useState } from "react";

interface SettingItem {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: "toggle";
}

const settings: SettingItem[] = [
  { id: "mfa-hardware", name: "Mandatory Hardware MFA (FIDO2 / YubiKey)", description: "Software OTP and SMS are rejected for administrative tiers.", enabled: true, type: "toggle" },
  { id: "session-timeout", name: "Inactive Admin Session Timeout", description: "Auto-terminate idling sessions to avoid console hijack.", enabled: true, type: "toggle" },
  { id: "step-up", name: "Privileged Step-Up Co-Signature", description: "Prompt hardware token before card revoking or CSV audit dump.", enabled: true, type: "toggle" },
  { id: "sla-warnings", name: "SLA Breach Warnings (<18h to expiry)", description: "Dispatches high-priority reminder to clinical verification queue leaders.", enabled: true, type: "toggle" },
  { id: "nfc-tap", name: "Digital MedPass NFC Tap v2", description: "Contactless credential verification at medical facility entrances.", enabled: true, type: "toggle" },
  { id: "hl7-sync", name: "HL7 / FHIR Real-Time Sync", description: "Bidirectional EHR integration with clinical systems.", enabled: true, type: "toggle" },
];

export default function SettingsContent() {
  const [activeSection, setActiveSection] = useState<string>("general");
  const [saved, setSaved] = useState(false);

  const sections = [
    { id: "general", label: "General" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" },
    { id: "platform", label: "Platform" },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <section className="text-center sm:text-left">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage platform preferences and controls for first launch.</p>
      </section>

      {/* Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((setting) => (
          <div key={setting.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">{setting.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{setting.description}</p>
              </div>
              <button
                onClick={() => {}}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                  setting.enabled ? "bg-[#0d5c52]" : "bg-slate-300"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${setting.enabled ? "translate-x-4" : ""}`} />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Save button */}
      <div className="text-center">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
        >
          {saved ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
