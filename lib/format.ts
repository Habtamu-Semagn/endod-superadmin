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
};

export const HOSPITAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-rose-50 text-rose-800 border border-rose-200" },
};
