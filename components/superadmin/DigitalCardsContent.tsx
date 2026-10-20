"use client";

import { useState } from "react";

interface Card {
  id: string;
  holder: string;
  status: "active" | "suspended" | "revoked";
  statusLabel: string;
  statusClass: string;
  account: string;
  description: string;
  tail: string;
  expiry: string;
}

const cards: Card[] = [
  { id: "CRD-88219-US", holder: "David K. Miller", status: "active", statusLabel: "Active & Synced", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", account: "US-MED-9402851", description: "Universal Prescription & Dispensation Pass", tail: "88219", expiry: "03/28" },
  { id: "CRD-77402-TX", holder: "Elena Rostova, RN", status: "active", statusLabel: "Active", statusClass: "bg-emerald-50 text-emerald-800 border border-emerald-200", account: "US-MED-1092847", description: "Staff Direct Authentication & Med Access Card", tail: "77402", expiry: "01/27" },
  { id: "CRD-44109-IL", holder: "Marcus Vance", status: "suspended", statusLabel: "Suspended (Velocity Alert)", statusClass: "bg-amber-100 text-amber-900 border border-amber-300", account: "US-MED-6610293", description: "Universal Prescription & Dispensation Pass", tail: "44109", expiry: "11/26" },
  { id: "CRD-12093-FL", holder: "Robert Brown", status: "revoked", statusLabel: "Revoked (Lost)", statusClass: "bg-slate-100 text-slate-600 border border-slate-300", account: "US-MED-3301928", description: "Universal Prescription & Dispensation Pass", tail: "12093", expiry: "08/26" },
];

const tabs = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "revoked", label: "Revoked" },
];

export default function DigitalCardsContent() {
  const [selectedId, setSelectedId] = useState<string>("CRD-88219-US");
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredCards = cards.filter((card) => {
    const matchesTab = activeTab === "all" || card.status === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      card.id.toLowerCase().includes(q) ||
      card.holder.toLowerCase().includes(q) ||
      card.account.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Digital Cards</h1>
            <p className="text-xs text-slate-500 mt-1">Manage patient medication and access cards.</p>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total Cards</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{cards.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Active</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{cards.filter((c) => c.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Suspended</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{cards.filter((c) => c.status === "suspended").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Revoked</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{cards.filter((c) => c.status === "revoked").length}</p>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#0d5c52] text-[#0d5c52]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Search */}
      <section>
        <div className="relative max-w-md">
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth="2" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900" placeholder="Search cards by ID, holder, or account..." type="text" />
        </div>
      </section>

      {/* Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
          <div key={card.id}
            onClick={() => setSelectedId(card.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              card.id === selectedId ? "border-[#0d5c52] bg-teal-50/30" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{card.id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${card.statusClass}`}>{card.statusLabel}</span>
            </div>
            <h3 className="font-bold text-slate-900 mt-3 text-sm">{card.holder}</h3>
            <p className="text-[11px] text-slate-500">{card.description}</p>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span>Account: {card.account}</span>
              <span>•</span>
              <span className="font-mono">••••{card.tail}</span>
              <span>–</span>
              <span className="font-mono">{card.expiry}</span>
            </div>
          </div>
        ))}
        {filteredCards.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">No cards found.</p>
        )}
      </section>

      <p className="text-[11px] text-slate-500 text-right">
        Showing {filteredCards.length} of {cards.length} cards • Search filters apply
      </p>
    </div>
  );
}
