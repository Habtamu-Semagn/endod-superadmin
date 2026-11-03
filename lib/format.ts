/** Times are shown in Addis Ababa time, as the hospitals and demos use it. */
export const TIMEZONE = "Africa/Addis_Ababa";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : `${dateTime.format(date)} EAT`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateOnly.format(date);
}

/**
 * A price from the hospital service (birr as text, e.g. "150.00") as
 * "ETB 150.00"; "ETB 0.00 (free)" for 0; "Not given" when it is missing
 * (older applications) or not a number.
 */
export function formatPrice(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") return "Not given";
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "Not given";
  const text = `ETB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount === 0 ? `${text} (free)` : text;
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** A link to the location on OpenStreetMap. */
export function mapLink(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const lat = latitude.toFixed(6);
  const lon = longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
}

export const APPLICATION_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 border border-slate-200" },
  submitted: { label: "Submitted", className: "bg-amber-100 text-amber-900 border border-amber-300" },
  rejected: { label: "Sent back", className: "bg-rose-50 text-rose-800 border border-rose-200" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-rose-100 text-rose-800 border border-rose-300" },
  closed: { label: "Closed", className: "bg-slate-200 text-slate-800 border border-slate-300" },
};

export const HOSPITAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-rose-50 text-rose-800 border border-rose-200" },
};

export const COMPANY_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-rose-50 text-rose-800 border border-rose-200" },
};

/** A file size as "12 KB" or "1.4 MB". */
export function sizeLabel(bytes?: number | null): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const PATIENT_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-rose-50 text-rose-800 border border-rose-200" },
  deactivated: { label: "Closed", className: "bg-slate-200 text-slate-800 border border-slate-300" },
};

/** An Endod ID ("DE123456") from what was typed: the ID itself, or a card's QR
 * link (`.../card/DE123456?s=...`), with the link's signature when it has one. */
export function parseCardInput(value: string): { dedanId: string; signature: string | null } | null {
  const text = value.trim();
  if (/^de\d{6}$/i.test(text)) return { dedanId: text.toUpperCase(), signature: null };
  const link = /\/card\/(de\d{6})(?:\?([^#]*))?(?:#.*)?$/i.exec(text);
  if (!link) return null;
  const s = new URLSearchParams(link[2] ?? "").get("s");
  return { dedanId: link[1].toUpperCase(), signature: s && /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : null };
}

const timeOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** A time of day with seconds ("14:05:31 EAT"), for "last checked". */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : `${timeOnly.format(date)} EAT`;
}

/** Santim (the platform's money unit) as "ETB 1,234.50". */
export function formatSantim(santim: number | null | undefined): string {
  if (santim === null || santim === undefined || !Number.isFinite(santim)) return "—";
  return `ETB ${(santim / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Basis points as a percent: 150 -> "1.5%". */
export function formatPercent(bp: number): string {
  return `${(bp / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

/** What a bill of `subtotal` santim costs the patient with this fee (the platform's rule). */
export function feeOn(subtotal: number, enabled: boolean, flatSantim: number, percentBp: number): number {
  if (!enabled || subtotal <= 0) return 0;
  return flatSantim + Math.floor((subtotal * percentBp + 5000) / 10000);
}

export const FEE_STATUS: Record<string, { label: string; className: string }> = {
  collected: { label: "Collected online", className: "bg-sky-50 text-sky-700 border-sky-200" },
  owed: { label: "Owed by hospital", className: "bg-amber-50 text-amber-800 border-amber-200" },
  settled: { label: "Settled", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-600 border-slate-200" },
};
