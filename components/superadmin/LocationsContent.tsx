"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { HOSPITAL_STATUS, titleCase } from "@/lib/format";
import type { Hospital } from "@/lib/types";
import { ErrorBanner, StatusBadge } from "@/components/superadmin/ComingSoon";
import LocationsMap, { type MapPoint } from "@/components/superadmin/LocationsMap";

const tabs = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
];

function located(h: Hospital): boolean {
  return (
    typeof h.latitude === "number" &&
    typeof h.longitude === "number" &&
    Number.isFinite(h.latitude) &&
    Number.isFinite(h.longitude) &&
    Math.abs(h.latitude) <= 90 &&
    Math.abs(h.longitude) <= 180
  );
}

/** Hospitals and clinics on a map, from the hospital service's list, by status. */
export default function LocationsContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [rows, setRows] = useState<Hospital[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Hospital[]>("organisations")
      .then(setRows)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the facilities."));
  }, []);

  const filtered = (rows ?? []).filter((h) => activeTab === "all" || h.status === activeTab);
  const points: MapPoint[] = filtered.filter(located).map((h) => ({
    id: h.id,
    latitude: h.latitude as number,
    longitude: h.longitude as number,
    label: h.name,
    status: h.status,
  }));
  const unplaced = filtered.length - points.length;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Locations & Services</h1>
            <p className="text-xs text-slate-500 mt-1">Where Endod hospitals and clinics are, from the hospital service.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id ? "border-[#0d5c52] text-[#0d5c52]" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {!rows && !error && <p className="text-xs text-slate-500">Loading facilities…</p>}

      {rows && (
        <section className="space-y-2">
          <LocationsMap points={points} onSelect={(id) => router.push(`/super-admin/organisations/${id}`)} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" /> Approved</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600" /> Pending</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600" /> Suspended</span>
            </span>
            <span data-testid="map-count">
              {points.length} of {filtered.length} on the map
            </span>
          </div>
          {unplaced > 0 && (
            <p className="text-[11px] text-amber-700" data-testid="unplaced-note">
              {unplaced} {unplaced === 1 ? "facility has" : "facilities have"} no location yet and {unplaced === 1 ? "is" : "are"} only in the list below.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        {filtered.map((h) => {
          const status = HOSPITAL_STATUS[h.status] ?? HOSPITAL_STATUS.pending;
          return (
            <Link
              key={h.id}
              href={`/super-admin/organisations/${h.id}`}
              data-testid="location-row"
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{h.name}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {titleCase(h.facility_type)} · {h.city ?? "—"} · {h.address ?? "—"}
                  {h.services.length ? ` · ${h.services.map(titleCase).join(", ")}` : ""}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {!located(h) && <span className="text-[10px] text-amber-700">No location</span>}
                <StatusBadge label={status.label} className={status.className} />
              </div>
            </Link>
          );
        })}
        {rows && filtered.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No facilities found.</p>}
      </section>
    </div>
  );
}
