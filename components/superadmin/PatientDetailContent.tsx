"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { PATIENT_STATUS, formatDate, formatDateTime } from "@/lib/format";
import type { PatientAccount } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, Field, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";

type Action = "suspend" | "reactivate" | null;

/** One patient account: account details only (never health data); suspend or reactivate it. */
export default function PatientDetailContent() {
  const params = useParams();
  const raw = typeof params?.id === "string" ? params.id : "";
  const id = raw.toUpperCase();
  const validId = /^DE\d{6}$/.test(id);
  const { runSensitive } = useAdmin();
  const [account, setAccount] = useState<PatientAccount | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!/^DE\d{6}$/.test(id)) return;
    apiFetch<PatientAccount>(`patients/${id}`)
      .then((value) => {
        setAccount(value);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "Could not load the account."));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (next: Action) => {
    setReason("");
    setActionError(null);
    setAction(next);
  };

  const perform = async () => {
    if (!account || !action) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    const current = action;
    try {
      const updated = await runSensitive(() =>
        apiFetch<PatientAccount>(`patients/${account.dedan_id}/${current}`, { method: "POST", body: { reason: reason.trim() } })
      );
      setAccount(updated);
      setNotice(
        current === "suspend"
          ? `${account.name ?? account.dedan_id} is suspended and signed out everywhere.`
          : `${account.name ?? account.dedan_id} can sign in again.`
      );
      setAction(null);
    } catch (e) {
      if (e instanceof Cancelled) setAction(null);
      else setActionError(e instanceof ApiError ? e.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  };

  const shownError = validId ? loadError : "Account not found.";
  if (shownError) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient account</h1>
        </section>
        <ErrorBanner message={shownError} />
        <Link href="/super-admin/users" className="inline-block px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm">
          Back to Users
        </Link>
      </div>
    );
  }
  if (!account) return <p className="text-xs text-slate-500">Loading the account…</p>;

  const status = PATIENT_STATUS[account.status] ?? PATIENT_STATUS.active;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded">{account.dedan_id}</span>
              <StatusBadge label={status.label} className={status.className} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">{account.name ?? "Unnamed account"}</h1>
            <p className="text-xs text-slate-500 mt-1">Account details from the patient platform. Health data is never shown here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {account.status === "active" && (
              <button
                type="button"
                onClick={() => open("suspend")}
                className="px-4 py-2 text-xs font-semibold bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl transition-all shadow-sm"
              >
                Suspend
              </button>
            )}
            {account.status === "suspended" && (
              <button
                type="button"
                onClick={() => open("reactivate")}
                className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
              >
                Reactivate
              </button>
            )}
            <Link
              href="/super-admin/users"
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
            >
              Back to List
            </Link>
          </div>
        </div>
      </section>

      {notice && <SuccessBanner message={notice} />}

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name">{account.name ?? "—"}</Field>
          <Field label="Endod ID"><span className="font-mono">{account.dedan_id}</span></Field>
          <Field label="Phone">{account.phone ?? "—"}</Field>
          <Field label="Email">{account.email ?? "—"}</Field>
          <Field label="Created">{formatDate(account.created_at)}</Field>
          <Field label="Last sign-in">{formatDateTime(account.last_sign_in_at)}</Field>
          <Field label="Status"><span data-testid="patient-status">{status.label}</span></Field>
          <Field label="Linked hospitals"><span data-testid="linked-hospitals">{account.linked_hospitals}</span></Field>
          {account.status === "suspended" && (
            <>
              <Field label="Suspended">{formatDateTime(account.suspended_at)}{account.suspended_by ? ` by ${account.suspended_by}` : ""}</Field>
              <Field label="Reason"><span data-testid="suspension-reason">{account.suspended_reason ?? "—"}</span></Field>
            </>
          )}
        </div>
      </section>

      {action && (
        <Dialog
          testId={`${action}-dialog`}
          title={action === "suspend" ? `Suspend ${account.name ?? account.dedan_id}?` : `Reactivate ${account.name ?? account.dedan_id}?`}
          description={
            action === "suspend"
              ? "Suspending signs the patient out and blocks sign-in and new hospital links; prescriptions and existing hospital links keep working. It lasts until the account is reactivated."
              : "The patient can sign in again. Sessions ended by the suspension stay ended."
          }
          confirmLabel={action === "suspend" ? "Suspend" : "Reactivate"}
          tone={action === "suspend" ? "danger" : "primary"}
          busy={busy}
          confirmDisabled={reason.trim().length < 3}
          error={actionError}
          onConfirm={perform}
          onCancel={() => !busy && setAction(null)}
        >
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold" htmlFor="action-reason">
            Reason (kept in the audit log)
          </label>
          <textarea
            id="action-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </Dialog>
      )}
    </div>
  );
}
