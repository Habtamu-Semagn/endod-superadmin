"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { APPLICATION_STATUS, formatDate, formatDateTime, sizeLabel, titleCase } from "@/lib/format";
import type { CompanyApplication } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, Field, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";
import { CompanyFlags, NotConnected, isNotConnected } from "@/components/superadmin/KindSwitch";

/** Reject sends it back to be fixed; close is for fake or abusive ones (no resubmitting). */
type Action = "approve" | "reject" | "close" | null;

const DOCUMENT_LABELS: Record<string, string> = {
  trade_license: "Trade license",
  tin_certificate: "TIN certificate",
  authorization_letter: "Authorization letter",
};

const BACK = "/super-admin/verifications?type=companies";

export default function CompanyVerificationDetailContent() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { runSensitive, refreshCounts } = useAdmin();
  const [app, setApp] = useState<CompanyApplication | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [staleOffer, setStaleOffer] = useState(false);
  const [closeConfirmed, setCloseConfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const validId = /^[0-9a-f]{32}$/.test(id);
  const load = useCallback(async () => {
    if (!/^[0-9a-f]{32}$/.test(id)) return;
    await apiFetch<CompanyApplication>(`company-applications/${id}`)
      .then((value) => {
        setApp(value);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (isNotConnected(e)) setNotConnected((e as ApiError).message);
        else setLoadError(e instanceof ApiError ? e.message : "Could not load the application.");
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (next: Exclude<Action, null>) => {
    setCloseConfirmed(false);
    setAction(next);
  };

  const close = () => {
    if (!busy) setAction(null);
  };

  // The error and the button go only once the current version is on screen,
  // so an Approve after Reload always sends the new updated_at.
  const reload = async () => {
    await load();
    setActionError(null);
    setStaleOffer(false);
  };

  const perform = async () => {
    if (!app || !action) return;
    setBusy(true);
    setActionError(null);
    setStaleOffer(false);
    setNotice(null);
    const current = action;
    try {
      if (current === "approve") {
        // Only the version on screen: TenaCare answers 409 if it changed since.
        await runSensitive(() =>
          apiFetch(`company-applications/${app.id}/approve`, {
            method: "POST",
            body: { expected_updated_at: app.updated_at ?? "" },
          })
        );
        setNotice(`${app.legal_name} is approved.`);
      } else {
        const closing = current === "close";
        await runSensitive(() =>
          apiFetch(`company-applications/${app.id}/reject`, {
            method: "POST",
            body: { reason: reason.trim(), close: closing },
          })
        );
        setNotice(
          closing
            ? `The application of ${app.legal_name} is closed; it cannot be resubmitted.`
            : `The application was sent back to ${app.legal_name} with your reason.`
        );
        setReason("");
      }
      refreshCounts();
      void load();
    } catch (e) {
      // TenaCare's own words (for example its 409 when the application is
      // not submitted), shown on the page.
      if (!(e instanceof Cancelled)) {
        setActionError(e instanceof ApiError ? e.message : "The request failed.");
        // A 409: the application changed (or was decided) since this page loaded.
        setStaleOffer(e instanceof ApiError && e.status === 409);
      }
    } finally {
      setAction(null);
      setBusy(false);
    }
  };

  const header = (
    <section>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company application</h1>
    </section>
  );
  const back = (
    <Link href={BACK} className="inline-block px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm">
      Back to Verifications
    </Link>
  );
  if (notConnected) {
    return (
      <div className="space-y-6">
        {header}
        <NotConnected message={notConnected} />
        {back}
      </div>
    );
  }
  const shownError = validId ? loadError : "Application not found.";
  if (shownError) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorBanner message={shownError} />
        {back}
      </div>
    );
  }
  if (!app) return <p className="text-xs text-slate-500">Loading the application…</p>;

  const status = APPLICATION_STATUS[app.status] ?? APPLICATION_STATUS.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">TIN {app.tin}</span>
              <StatusBadge label={status.label} className={status.className} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">{app.legal_name}</h1>
            <div className="mt-2">
              <CompanyFlags duplicateTin={app.duplicate_tin} emailVerified={app.email_verified} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Company on TenaCare · Submitted {formatDateTime(app.submitted_at)}
              {app.reviewed_at ? ` · Reviewed ${formatDateTime(app.reviewed_at)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => open("approve")}
              className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => open("reject")}
              className="px-4 py-2 text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-all shadow-sm"
            >
              Reject (they can fix and resubmit)
            </button>
            <button
              type="button"
              onClick={() => open("close")}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-sm"
            >
              Reject and close (fake or abusive; cannot resubmit)
            </button>
            <Link
              href={BACK}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
            >
              Back to List
            </Link>
          </div>
        </div>
      </section>

      {actionError && <ErrorBanner message={actionError} testId="action-error" />}
      {staleOffer && (
        <button
          type="button"
          onClick={reload}
          className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
        >
          Reload
        </button>
      )}
      {notice && <SuccessBanner message={notice} />}
      {app.rejection_reason && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold">Sent back {formatDateTime(app.reviewed_at)}</p>
          <p className="text-sm text-amber-900 mt-1" data-testid="rejection-reason">{app.rejection_reason}</p>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Company</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Legal name">{app.legal_name}</Field>
            <Field label="Trade name">{app.trade_name ?? "—"}</Field>
            <Field label="TIN"><span className="font-mono" data-testid="company-tin">{app.tin}</span></Field>
            <Field label="Business license number">
              <span className="font-mono" data-testid="business-license">{app.business_license_number ?? "—"}</span>
            </Field>
            <Field label="Sector">{titleCase(app.sector)}</Field>
            <Field label="Employees"><span data-testid="employee-count">{app.employee_count.toLocaleString("en-US")}</span></Field>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Address and company contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="City">{app.city ?? "—"}</Field>
            <Field label="Address">{app.address ?? "—"}</Field>
            <Field label="Phone">
              {app.phone ? <a className="text-teal-700 hover:underline" href={`tel:${app.phone}`}>{app.phone}</a> : "—"}
            </Field>
            <Field label="Email">
              {app.email ? <a className="text-teal-700 hover:underline" href={`mailto:${app.email}`}>{app.email}</a> : "—"}
            </Field>
          </div>
        </div>

        {/* Applicant */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Applicant</h3>
          <p className="text-xs text-slate-500 mb-4">The company&apos;s first TenaCare admin, who signs in with this email.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Name">{app.contact?.full_name ?? "—"}</Field>
            <Field label="Title">{app.contact?.title ?? "—"}</Field>
            <Field label="Mobile">
              {app.contact?.phone ? <a className="text-teal-700 hover:underline" href={`tel:${app.contact.phone}`}>{app.contact.phone}</a> : "—"}
            </Field>
            <Field label="Email">
              {app.contact?.email ? <a className="text-teal-700 hover:underline" href={`mailto:${app.contact.email}`}>{app.contact.email}</a> : "—"}
            </Field>
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Documents</h3>
        <p className="text-xs text-slate-500 mb-4">PDF or image files uploaded by the company. Every view is recorded in the audit log.</p>
        <div className="space-y-3">
          {app.documents.map((doc) => (
            <div key={doc.kind} data-testid={`document-${doc.kind}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{DOCUMENT_LABELS[doc.kind] ?? titleCase(doc.kind)}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  {`${doc.filename || doc.kind} · ${sizeLabel(doc.size)} · ${formatDate(doc.uploaded_at)}`}
                </p>
              </div>
              {DOCUMENT_LABELS[doc.kind] && (
                <div className="flex gap-2 shrink-0">
                  <a
                    href={`/api/company-documents/${app.id}/${doc.kind}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    View
                  </a>
                  <a
                    href={`/api/company-documents/${app.id}/${doc.kind}?download=1`}
                    download
                    className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
          {app.documents.length === 0 && <p className="text-xs text-slate-500">No documents uploaded yet.</p>}
        </div>
      </section>

      {action === "approve" && (
        <Dialog
          testId="approve-dialog"
          title={`Approve ${app.legal_name}?`}
          description="The company's TenaCare account becomes active: its admins can sign in and add employees."
          confirmLabel="Approve"
          busy={busy}
          onConfirm={perform}
          onCancel={close}
        />
      )}
      {(action === "reject" || action === "close") && (
        <Dialog
          testId={action === "close" ? "close-dialog" : "reject-dialog"}
          title={
            action === "close"
              ? `Reject and close the application of ${app.legal_name}?`
              : `Send the application back to ${app.legal_name}?`
          }
          description={
            action === "close"
              ? "For fake or abusive applications only. The company sees your reason and can never resubmit this application."
              : "The company sees your reason on TenaCare, fixes the application and submits it again."
          }
          confirmLabel={action === "close" ? "Reject and close" : "Reject"}
          tone="danger"
          busy={busy}
          confirmDisabled={reason.trim().length < 3 || (action === "close" && !closeConfirmed)}
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
            placeholder="For example: the trade license has expired; upload the renewed one."
          />
          {action === "close" && (
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={closeConfirmed}
                onChange={(e) => setCloseConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span>I am sure: this application is fake or abusive and must not be resubmitted.</span>
            </label>
          )}
        </Dialog>
      )}
    </div>
  );
}
