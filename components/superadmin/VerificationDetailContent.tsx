"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { APPLICATION_STATUS, formatDate, formatDateTime, mapLink, titleCase } from "@/lib/format";
import type { Application } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, Field, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";

type Action = "approve" | "reject" | "delete" | null;

function sizeLabel(bytes?: number): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function VerificationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const { runSensitive, refreshCounts } = useAdmin();
  const [app, setApp] = useState<Application | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validId = /^[0-9a-f]{32}$/.test(id);
  const load = useCallback(() => {
    if (!/^[0-9a-f]{32}$/.test(id)) return;
    apiFetch<Application>(`applications/${id}`)
      .then((value) => {
        setApp(value);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "Could not load the application."));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => {
    if (busy) return;
    setAction(null);
    setDialogError(null);
  };

  const perform = async () => {
    if (!app || !action) return;
    setBusy(true);
    setDialogError(null);
    setActionError(null);
    setNotice(null);
    const current = action;
    try {
      if (current === "approve") {
        await runSensitive(() => apiFetch(`applications/${app.hospital_id}/approve`, { method: "POST" }));
        setNotice(`${app.name} is approved.`);
      } else if (current === "reject") {
        await runSensitive(() =>
          apiFetch(`applications/${app.hospital_id}/reject`, { method: "POST", body: { reason: reason.trim() } })
        );
        setNotice(`The application was sent back to ${app.name} with your reason.`);
        setReason("");
      } else {
        await runSensitive(() => apiFetch(`organisations/${app.hospital_id}`, { method: "DELETE" }));
        refreshCounts();
        router.push("/super-admin/verifications");
        return;
      }
      setAction(null);
      refreshCounts();
      load();
    } catch (e) {
      if (e instanceof Cancelled) {
        setAction(null);
      } else {
        // The hospital service's own words (for example its 409 when the
        // application is not submitted yet), shown on the page.
        setAction(null);
        setActionError(e instanceof ApiError ? e.message : "The request failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const shownError = validId ? loadError : "Application not found.";
  if (shownError) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application</h1>
        </section>
        <ErrorBanner message={shownError} />
        <Link href="/super-admin/verifications" className="inline-block px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm">
          Back to Verifications
        </Link>
      </div>
    );
  }
  if (!app) return <p className="text-xs text-slate-500">Loading the application…</p>;

  const status = APPLICATION_STATUS[app.status] ?? APPLICATION_STATUS.draft;
  const map = mapLink(app.location.latitude, app.location.longitude);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{app.code}</span>
              <StatusBadge label={status.label} className={status.className} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">{app.facility.name || app.name}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Applied {formatDate(app.created_at)} · Submitted {formatDateTime(app.submitted_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAction("approve")}
              className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setAction("reject")}
              className="px-4 py-2 text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-all shadow-sm"
            >
              Reject
            </button>
            {app.hospital_status === "pending" && (
              <button
                type="button"
                onClick={() => setAction("delete")}
                className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
              >
                Delete sign-up
              </button>
            )}
            <Link
              href="/super-admin/verifications"
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
            >
              Back to List
            </Link>
          </div>
        </div>
      </section>

      {actionError && <ErrorBanner message={actionError} testId="action-error" />}
      {notice && <SuccessBanner message={notice} />}
      {app.rejection_reason && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Sent back {formatDateTime(app.rejected_at)}</p>
          <p className="text-sm text-amber-900 mt-1" data-testid="rejection-reason">{app.rejection_reason}</p>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facility */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Facility</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">{app.facility.name}{app.facility.name_am ? ` (${app.facility.name_am})` : ""}</Field>
            <Field label="Type">{titleCase(app.facility.facility_type)} · {titleCase(app.facility.ownership)}</Field>
            <Field label="City">{app.facility.city ?? "—"}</Field>
            <Field label="Phone">{app.facility.phone ?? "—"}</Field>
            <Field label="Opening hours">{app.facility.open_hours ?? "—"}</Field>
            <Field label="Services">{app.facility.services.length ? app.facility.services.map(titleCase).join(", ") : "—"}</Field>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Address">{app.location.address ?? "—"}</Field>
            <Field label="Coordinates">
              {app.location.latitude !== null && app.location.longitude !== null
                ? `${app.location.latitude.toFixed(5)}, ${app.location.longitude.toFixed(5)}`
                : "—"}
            </Field>
          </div>
          {map && (
            <a
              href={map}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="map-link"
              className="mt-4 inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Open in map ↗
            </a>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Contact person</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">{app.contact.full_name ?? "—"}</Field>
            <Field label="Role">{app.contact.title ?? "—"}</Field>
            <Field label="Mobile">
              {app.contact.phone ? <a className="text-teal-700 hover:underline" href={`tel:${app.contact.phone}`}>{app.contact.phone}</a> : "—"}
            </Field>
            <Field label="Email">
              {app.contact.email ? <a className="text-teal-700 hover:underline" href={`mailto:${app.contact.email}`}>{app.contact.email}</a> : "—"}
            </Field>
          </div>
        </div>

        {/* Licence and demo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Licence and demo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="License number"><span className="font-mono" data-testid="license-number">{app.documents.license_number ?? "—"}</span></Field>
            <Field label="Demo (EAT)"><span data-testid="demo-time">{formatDateTime(app.demo?.demo_at)}</span></Field>
            <Field label="Hospital status">{titleCase(app.hospital_status)}</Field>
            <Field label="Application complete">{app.complete ? "Yes" : "No"}</Field>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Documents</h3>
        <p className="text-xs text-slate-500 mb-4">PDF or image files uploaded by the facility. Every view is recorded in the audit log.</p>
        <div className="space-y-3">
          {app.documents.items.map((doc) => (
            <div key={doc.kind} data-testid={`document-${doc.kind}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{doc.label}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  {doc.uploaded ? `${doc.filename ?? doc.kind} · ${sizeLabel(doc.size)} · ${formatDate(doc.uploaded_at)}` : "Not uploaded"}
                </p>
              </div>
              {doc.uploaded && (
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`/api/documents/${app.hospital_id}/${doc.kind}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    View
                  </a>
                  <a
                    href={`/api/documents/${app.hospital_id}/${doc.kind}?download=1`}
                    download
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {action === "approve" && (
        <Dialog
          testId="approve-dialog"
          title={`Approve ${app.name}?`}
          description="The facility becomes an approved Endod hospital and is listed for patients once its listing is complete."
          confirmLabel="Approve"
          busy={busy}
          error={dialogError}
          onConfirm={perform}
          onCancel={close}
        />
      )}
      {action === "reject" && (
        <Dialog
          testId="reject-dialog"
          title={`Send the application back to ${app.name}?`}
          description="The facility sees your reason, fixes the application and submits it again."
          confirmLabel="Reject"
          tone="danger"
          busy={busy}
          confirmDisabled={reason.trim().length < 3}
          error={dialogError}
          onConfirm={perform}
          onCancel={close}
        >
          <label htmlFor="reject-reason" className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            Reason (required)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 1000))}
            rows={4}
            className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="For example: the TIN certificate is unreadable; upload a clearer scan."
          />
        </Dialog>
      )}
      {action === "delete" && (
        <Dialog
          testId="delete-dialog"
          title={`Delete the sign-up of ${app.name}?`}
          description="The pending sign-up, its accounts and documents are deleted from the hospital service. This cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          busy={busy}
          error={dialogError}
          onConfirm={perform}
          onCancel={close}
        />
      )}
    </div>
  );
}
