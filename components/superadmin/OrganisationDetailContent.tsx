"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { HOSPITAL_STATUS, formatDate, mapLink, titleCase } from "@/lib/format";
import type { Hospital } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, Field, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";

type Action = "suspend" | "approve" | null;

export default function OrganisationDetailContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { runSensitive, refreshCounts } = useAdmin();
  const [org, setOrg] = useState<Hospital | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validId = /^[0-9a-f]{32}$/.test(id);
  const load = useCallback(() => {
    if (!/^[0-9a-f]{32}$/.test(id)) return;
    apiFetch<Hospital>(`organisations/${id}`)
      .then((value) => {
        setOrg(value);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "Could not load the organisation."));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const perform = async () => {
    if (!org || !action) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    const current = action;
    try {
      await runSensitive(() => apiFetch(`organisations/${org.id}/${current}`, { method: "POST" }));
      setNotice(current === "suspend" ? `${org.name} is suspended.` : `${org.name} is approved again.`);
      refreshCounts();
      load();
    } catch (e) {
      if (!(e instanceof Cancelled)) setActionError(e instanceof ApiError ? e.message : "The request failed.");
    } finally {
      setAction(null);
      setBusy(false);
    }
  };

  const shownError = validId ? loadError : "Organisation not found.";
  if (shownError) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisation</h1>
        </section>
        <ErrorBanner message={shownError} />
        <Link href="/super-admin/organisations" className="inline-block px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm">
          Back to Organisations
        </Link>
      </div>
    );
  }
  if (!org) return <p className="text-xs text-slate-500">Loading the organisation…</p>;

  const status = HOSPITAL_STATUS[org.status] ?? HOSPITAL_STATUS.pending;
  const map = mapLink(org.latitude, org.longitude);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{org.code}</span>
              <StatusBadge label={status.label} className={status.className} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">{org.name}</h1>
            <p className="text-xs text-slate-500 mt-1">Organisation details from the hospital service.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {org.status !== "suspended" && (
              <button
                type="button"
                onClick={() => setAction("suspend")}
                className="px-4 py-2 text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-all shadow-sm"
              >
                Suspend
              </button>
            )}
            {org.status === "suspended" && (
              <button
                type="button"
                onClick={() => setAction("approve")}
                className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
              >
                Re-approve
              </button>
            )}
            {org.status === "pending" && (
              <Link
                href={`/super-admin/verifications/${org.id}`}
                className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
              >
                Review application
              </Link>
            )}
            <Link
              href="/super-admin/organisations"
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
            >
              Back to List
            </Link>
          </div>
        </div>
      </section>

      {actionError && <ErrorBanner message={actionError} testId="action-error" />}
      {notice && <SuccessBanner message={notice} />}

      {/* Details */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Organisation Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Organisation Name">{org.name}{org.name_am ? ` (${org.name_am})` : ""}</Field>
          <Field label="Type">{titleCase(org.facility_type)} · {titleCase(org.kind)}</Field>
          <Field label="Phone Number">{org.phone ?? "—"}</Field>
          <Field label="City">{org.city ?? "—"}</Field>
          <Field label="Address">
            {org.address ?? "—"}
            {map && (
              <>
                {" "}
                <a href={map} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline text-xs" data-testid="map-link">
                  map ↗
                </a>
              </>
            )}
          </Field>
          <Field label="Status"><span data-testid="organisation-status">{status.label}</span></Field>
          <Field label="Listed for patients">
            {org.listed ? "Yes" : org.missing_for_listing.length ? `No (missing ${org.missing_for_listing.map(titleCase).join(", ")})` : "No"}
          </Field>
          <Field label="Services">{org.services.length ? org.services.map(titleCase).join(", ") : "—"}</Field>
          <Field label="Opening hours">{org.open_hours ?? "—"}</Field>
          <Field label="Registered">{formatDate(org.created_at)}</Field>
          <Field label="Contact">
            {org.contact ? `${org.contact.name} · ${org.contact.email}${org.contact.phone ? ` · ${org.contact.phone}` : ""}` : "—"}
          </Field>
        </div>
      </section>

      {action && (
        <Dialog
          testId={`${action}-dialog`}
          title={action === "suspend" ? `Suspend ${org.name}?` : `Re-approve ${org.name}?`}
          description={
            action === "suspend"
              ? "The facility is taken off the Endod app and cannot take bookings until it is approved again."
              : "The facility is listed in the Endod app again once its listing is complete."
          }
          confirmLabel={action === "suspend" ? "Suspend" : "Re-approve"}
          tone={action === "suspend" ? "danger" : "primary"}
          busy={busy}
          onConfirm={perform}
          onCancel={() => !busy && setAction(null)}
        />
      )}
    </div>
  );
}
