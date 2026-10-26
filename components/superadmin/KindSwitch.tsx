"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api";

export type Kind = "hospitals" | "companies";

/** `?type=companies` shows companies; anything else, hospitals. */
export function kindOf(value: string | null): Kind {
  return value === "companies" ? "companies" : "hospitals";
}

/** The Hospitals | Companies switch at the top of Verifications and Organisations. */
export default function KindSwitch({ basePath, active }: { basePath: string; active: Kind }) {
  const options: { id: Kind; label: string; href: string }[] = [
    { id: "hospitals", label: "Hospitals", href: basePath },
    { id: "companies", label: "Companies", href: `${basePath}?type=companies` },
  ];
  return (
    <nav aria-label="Hospitals or companies" data-testid="kind-switch" className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
      {options.map((option) => (
        <Link
          key={option.id}
          href={option.href}
          aria-current={active === option.id ? "page" : undefined}
          className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
            active === option.id ? "bg-[#0d5c52] text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

/** True when the admin API says TenaCare is not connected here (no platform key). */
export function isNotConnected(error: unknown): boolean {
  return error instanceof ApiError && error.code === "COMPANIES_NOT_CONNECTED";
}

/** Shown instead of company data while TenaCare is not connected. */
export function NotConnected({ message }: { message: string }) {
  return (
    <section data-testid="companies-not-connected" className="rounded-xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-sm font-bold text-slate-900">Companies are not connected yet</p>
      <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">{message}</p>
      <p className="text-[11px] text-slate-400 mt-3">Hospitals work as usual.</p>
    </section>
  );
}
