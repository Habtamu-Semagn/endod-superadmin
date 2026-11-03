"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { feeOn, formatDateTime, formatPercent, formatSantim } from "@/lib/format";
import type { FeeSettings } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, Field, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";

/** A birr amount typed by the admin: digits with at most two decimals. */
const BIRR = /^\d{1,4}(\.\d{1,2})?$/;
const PERCENT = /^\d{1,2}(\.\d{1,2})?$/;
const EXAMPLE = 20000; // 200 ETB, in santim

/** Text with at most two decimals as hundredths (santim, basis points), without float error. */
function hundredths(text: string): number {
  const [whole, fraction = ""] = text.trim().split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

/**
 * Endod's service fee: what the patient pays Endod on every payment for a
 * hospital service (a booking, a lab test, imaging...). The patient platform
 * keeps it; changing it needs a fresh authenticator code and a reason.
 */
export default function ServiceFeeContent() {
  const { runSensitive } = useAdmin();
  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [flat, setFlat] = useState("");
  const [percent, setPercent] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fill = (value: FeeSettings) => {
    setSettings(value);
    setEnabled(value.enabled);
    setFlat((value.flat_santim / 100).toFixed(2));
    setPercent((value.percent_bp / 100).toString());
  };

  const load = useCallback(() => {
    apiFetch<FeeSettings>("fees")
      .then((value) => {
        fill(value);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof ApiError ? e.message : "Could not load the service fee."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flatValid = BIRR.test(flat.trim()) && hundredths(flat) <= 100000;
  const percentValid = percent.trim() === "" || (PERCENT.test(percent.trim()) && hundredths(percent) <= 2000);
  const flatSantim = flatValid ? hundredths(flat) : 0;
  const percentBp = percentValid && percent.trim() !== "" ? hundredths(percent) : 0;
  const emptyFee = enabled && flatSantim === 0 && percentBp === 0;
  const valid = flatValid && percentValid && !emptyFee;
  const changed =
    settings !== null &&
    (enabled !== settings.enabled || flatSantim !== settings.flat_santim || percentBp !== settings.percent_bp);
  const exampleFee = feeOn(EXAMPLE, enabled, flatSantim, percentBp);

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    setNotice(null);
    try {
      const updated = await runSensitive(() =>
        apiFetch<FeeSettings>("fees", {
          method: "POST",
          body: {
            enabled,
            flat: (flatSantim / 100).toFixed(2),
            percent: (percentBp / 100).toFixed(2),
            reason: reason.trim(),
          },
        })
      );
      fill(updated);
      setConfirming(false);
      setNotice(
        updated.enabled
          ? `The service fee is now ${formatSantim(updated.flat_santim)}${updated.percent_bp ? ` + ${formatPercent(updated.percent_bp)}` : ""} per payment. Hospitals get it within moments.`
          : "The service fee is switched off: patients pay no Endod fee from now on."
      );
    } catch (e) {
      if (e instanceof Cancelled) setConfirming(false);
      else setSaveError(e instanceof ApiError ? e.message : "The change failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service fee</h1>
        </section>
        <ErrorBanner message={loadError} />
      </div>
    );
  }
  if (!settings) return <p className="text-xs text-slate-500">Loading the service fee…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Service fee</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">
          Endod covers the cost of SMS and charges the patient a service fee on every payment for a hospital service:
          bookings, lab tests, imaging, procedures and any other charge. One fee per payment; never charged to the
          hospital; none on a free visit.
        </p>
      </section>

      {notice && <SuccessBanner message={notice} />}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Fee settings</h3>
            <StatusBadge
              label={settings.enabled ? "On" : "Off"}
              className={settings.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              data-testid="fee-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-teal-700"
            />
            Charge the service fee
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fee-flat" className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Flat fee per payment (ETB)
              </label>
              <input
                id="fee-flat"
                inputMode="decimal"
                value={flat}
                onChange={(e) => setFlat(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              {!flatValid && <p className="mt-1 text-[11px] text-rose-600">0 to 1,000 birr, at most two decimals.</p>}
            </div>
            <div>
              <label htmlFor="fee-percent" className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Plus a percentage of the bill (optional, %)
              </label>
              <input
                id="fee-percent"
                inputMode="decimal"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              {!percentValid && <p className="mt-1 text-[11px] text-rose-600">0 to 20%, at most two decimals.</p>}
            </div>
          </div>
          {emptyFee && (
            <p className="text-[11px] text-rose-600">An enabled fee needs a flat amount or a percentage (or switch it off).</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => fill(settings)}
              disabled={!changed}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              Undo changes
            </button>
            <button
              type="button"
              onClick={() => {
                setReason("");
                setSaveError(null);
                setConfirming(true);
              }}
              disabled={!changed || !valid}
              className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              Save fee
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3" data-testid="fee-example">
          <h3 className="text-sm font-bold text-slate-900">What a 200 ETB bill becomes</h3>
          <div className="flex justify-between text-xs text-slate-600"><span>Hospital bill</span><span>{formatSantim(EXAMPLE)}</span></div>
          <div className="flex justify-between text-xs text-slate-600">
            <span>Endod service fee</span><span data-testid="example-fee">{formatSantim(exampleFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-100 pt-2">
            <span>The patient pays</span><span data-testid="example-total">{formatSantim(EXAMPLE + exampleFee)}</span>
          </div>
          <p className="text-[11px] text-slate-400">A second test or service is a second payment: the fee again.</p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">In force now</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Field label="Flat"><span data-testid="current-flat">{formatSantim(settings.flat_santim)}</span></Field>
          <Field label="Percentage">{formatPercent(settings.percent_bp)}</Field>
          <Field label="Version">{settings.version}</Field>
          <Field label="Last changed">
            {settings.updated_at ? `${formatDateTime(settings.updated_at)}${settings.updated_by ? ` by ${settings.updated_by}` : ""}` : "Never (the default)"}
          </Field>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Changes</h3>
        {settings.history.length === 0 ? (
          <p className="text-xs text-slate-500">No changes yet.</p>
        ) : (
          <table className="w-full text-xs" data-testid="fee-history">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="py-2 font-semibold">When</th>
                <th className="py-2 font-semibold">By</th>
                <th className="py-2 font-semibold">From</th>
                <th className="py-2 font-semibold">To</th>
                <th className="py-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {settings.history.map((change) => (
                <tr key={change.version}>
                  <td className="py-2 text-slate-600">{formatDateTime(change.changed_at)}</td>
                  <td className="py-2 text-slate-600">{change.actor_email}</td>
                  <td className="py-2 text-slate-600">
                    {change.before.enabled ? `${formatSantim(change.before.flat_santim)} + ${formatPercent(change.before.percent_bp)}` : "Off"}
                  </td>
                  <td className="py-2 text-slate-900 font-semibold">
                    {change.after.enabled ? `${formatSantim(change.after.flat_santim)} + ${formatPercent(change.after.percent_bp)}` : "Off"}
                  </td>
                  <td className="py-2 text-slate-600">{change.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {confirming && (
        <Dialog
          testId="fee-dialog"
          title="Change the service fee?"
          description={
            enabled
              ? `From now on patients pay ${formatSantim(flatSantim)}${percentBp ? ` + ${formatPercent(percentBp)} of the bill` : ""} on every payment for a hospital service (a 200 ETB bill becomes ${formatSantim(EXAMPLE + exampleFee)}). Payments already made keep their fee.`
              : "Patients will pay no Endod service fee from now on. Payments already made keep their fee."
          }
          confirmLabel="Save fee"
          busy={busy}
          confirmDisabled={reason.trim().length < 3}
          error={saveError}
          onConfirm={save}
          onCancel={() => !busy && setConfirming(false)}
        >
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold" htmlFor="fee-reason">
            Reason (kept in the audit log)
          </label>
          <textarea
            id="fee-reason"
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
