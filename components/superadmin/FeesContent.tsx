"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { FEE_STATUS, formatDateTime, formatSantim, titleCase } from "@/lib/format";
import type { FeeEntries, FeeHospitalRow, FeeSummary } from "@/lib/types";
import { Cancelled, useAdmin } from "@/components/superadmin/AdminShell";
import Dialog from "@/components/superadmin/Dialog";
import { ErrorBanner, StatusBadge, SuccessBanner } from "@/components/superadmin/ComingSoon";

/** Entries shown (and settled) at once for one hospital. */
const PAGE = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function query(params: Record<string, string>): string {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== ""));
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Endod's fee books: per hospital, the service fees collected online by Endod,
 * owed by the hospital (the patient paid it the total) and settled. A
 * hospital's owed fees are marked settled, with the reference of its payment
 * to Endod, after a fresh authenticator code.
 */
export default function FeesContent() {
  const { runSensitive } = useAdmin();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hospital, setHospital] = useState<FeeHospitalRow | null>(null);
  const [status, setStatus] = useState("");
  const [entries, setEntries] = useState<FeeEntries | null>(null);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settling, setSettling] = useState(false);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const period = { from: DAY.test(from) ? from : "", to: DAY.test(to) ? to : "" };

  const loadSummary = useCallback(() => {
    apiFetch<FeeSummary>(`fees/summary${query({ from: period.from, to: period.to })}`)
      .then((value) => {
        setSummary(value);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not load the fees."));
  }, [period.from, period.to]);

  const loadEntries = useCallback(() => {
    if (!hospital) return;
    apiFetch<FeeEntries>(
      `fees/entries${query({ hospital_id: hospital.hospital_id, status, from: period.from, to: period.to, limit: String(PAGE) })}`
    )
      .then((value) => {
        setEntries(value);
        setEntriesError(null);
        setSelected(new Set());
      })
      .catch((e: unknown) => setEntriesError(e instanceof ApiError ? e.message : "Could not load the payments."));
  }, [hospital, status, period.from, period.to]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const owedShown = (entries?.items ?? []).filter((e) => e.settlement_status === "owed");
  const selectedAmount = owedShown.filter((e) => selected.has(e.id)).reduce((sum, e) => sum + e.fee, 0);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const settle = async () => {
    if (!hospital) return;
    setBusy(true);
    setSettleError(null);
    setNotice(null);
    try {
      const result = await runSensitive(() =>
        apiFetch<{ settled: number; amount: number; reference: string }>("fees/settle", {
          method: "POST",
          body: { hospital_id: hospital.hospital_id, entry_ids: [...selected], reference: reference.trim() },
        })
      );
      setSettling(false);
      setNotice(
        `${result.settled} payment${result.settled === 1 ? "" : "s"} of ${hospital.hospital_name ?? "the hospital"} settled: ${formatSantim(result.amount)} (reference ${result.reference}).`
      );
      loadSummary();
      loadEntries();
    } catch (e) {
      if (e instanceof Cancelled) setSettling(false);
      else setSettleError(e instanceof ApiError ? e.message : "The settlement failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fees</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Endod&apos;s service fee on every paid hospital service. Paid online, Endod collected it; paid at the
            hospital, the hospital collected it with the bill and owes it to Endod until it is settled.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            From
            <input
              type="date"
              aria-label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
            To
            <input
              type="date"
              aria-label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
            />
          </label>
        </div>
      </section>

      {notice && <SuccessBanner message={notice} />}
      {error && <ErrorBanner message={error} />}

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["Payments", String(summary.totals.payments), "kpi-payments"],
            ["Collected online", formatSantim(summary.totals.fees_collected), "kpi-collected"],
            ["Owed by hospitals", formatSantim(summary.totals.fees_owed), "kpi-owed"],
            ["Settled", formatSantim(summary.totals.fees_settled), "kpi-settled"],
          ].map(([label, value, testId]) => (
            <div key={testId} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
              <p className="text-lg font-bold text-slate-900 mt-1" data-testid={testId}>{value}</p>
            </div>
          ))}
        </section>
      )}

      {summary && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-900 mb-3">By hospital</h3>
          {summary.hospitals.length === 0 ? (
            <p className="text-xs text-slate-500" data-testid="fees-empty">No paid hospital services in this period.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="py-2 font-semibold">Hospital</th>
                  <th className="py-2 font-semibold text-right">Payments</th>
                  <th className="py-2 font-semibold text-right">Collected online</th>
                  <th className="py-2 font-semibold text-right">Owed by hospital</th>
                  <th className="py-2 font-semibold text-right">Settled</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.hospitals.map((row) => (
                  <tr key={row.hospital_id} data-testid="fee-hospital" className={hospital?.hospital_id === row.hospital_id ? "bg-teal-50/50" : ""}>
                    <td className="py-2 font-semibold text-slate-900">{row.hospital_name ?? row.hospital_id}</td>
                    <td className="py-2 text-right text-slate-600">{row.payments}</td>
                    <td className="py-2 text-right text-slate-600">{formatSantim(row.fees_collected)}</td>
                    <td className="py-2 text-right font-semibold text-amber-800" data-testid="hospital-owed">{formatSantim(row.fees_owed)}</td>
                    <td className="py-2 text-right text-slate-600">{formatSantim(row.fees_settled)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setHospital(row);
                          setStatus(row.owed_entries ? "owed" : "");
                          setNotice(null);
                        }}
                        className="px-3 py-1.5 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                      >
                        Payments
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {hospital && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3" data-testid="fee-entries">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">Payments at {hospital.hospital_name ?? hospital.hospital_id}</h3>
            <div className="flex items-center gap-2">
              <select
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-900"
              >
                <option value="">All</option>
                {Object.entries(FEE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => {
                  setReference("");
                  setSettleError(null);
                  setSettling(true);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                Mark settled{selected.size ? ` (${formatSantim(selectedAmount)})` : ""}
              </button>
            </div>
          </div>
          {entriesError && <ErrorBanner message={entriesError} />}
          {entries && entries.items.length === 0 && <p className="text-xs text-slate-500">No payments.</p>}
          {entries && entries.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="py-2">
                      <input
                        type="checkbox"
                        aria-label="Select every owed payment"
                        checked={owedShown.length > 0 && owedShown.every((e) => selected.has(e.id))}
                        onChange={(e) => setSelected(e.target.checked ? new Set(owedShown.map((x) => x.id)) : new Set())}
                        disabled={owedShown.length === 0}
                      />
                    </th>
                    <th className="py-2 font-semibold">Paid</th>
                    <th className="py-2 font-semibold">For</th>
                    <th className="py-2 font-semibold">Method</th>
                    <th className="py-2 font-semibold text-right">Bill</th>
                    <th className="py-2 font-semibold text-right">Fee</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.items.map((entry) => {
                    const badge = FEE_STATUS[entry.settlement_status] ?? FEE_STATUS.owed;
                    return (
                      <tr key={entry.id} data-testid="fee-entry">
                        <td className="py-2">
                          {entry.settlement_status === "owed" && (
                            <input
                              type="checkbox"
                              aria-label={`Select payment ${entry.source_id}`}
                              checked={selected.has(entry.id)}
                              onChange={() => toggle(entry.id)}
                            />
                          )}
                        </td>
                        <td className="py-2 text-slate-600">{formatDateTime(entry.paid_at)}</td>
                        <td className="py-2 text-slate-600">{entry.source_type === "booking" ? "Booking" : "Charge"}</td>
                        <td className="py-2 text-slate-600">{titleCase(entry.method)}{entry.reference ? ` · ${entry.reference}` : ""}</td>
                        <td className="py-2 text-right text-slate-600">{formatSantim(entry.subtotal)}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">{formatSantim(entry.fee)}</td>
                        <td className="py-2">
                          <StatusBadge label={badge.label} className={badge.className} />
                          {entry.settlement_reference && (
                            <span className="ml-2 text-[10px] text-slate-400">{entry.settlement_reference}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {entries.total > entries.items.length && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Showing the latest {entries.items.length} of {entries.total}; narrow the period to see the rest.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {settling && hospital && (
        <Dialog
          testId="settle-dialog"
          title={`Mark ${selected.size} payment${selected.size === 1 ? "" : "s"} settled?`}
          description={`${hospital.hospital_name ?? "The hospital"} paid Endod ${formatSantim(selectedAmount)} in service fees. Give the reference of that payment (a bank transfer or receipt number).`}
          confirmLabel="Mark settled"
          busy={busy}
          confirmDisabled={reference.trim().length < 2}
          error={settleError}
          onConfirm={settle}
          onCancel={() => !busy && setSettling(false)}
        >
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold" htmlFor="settle-reference">
            Payment reference
          </label>
          <input
            id="settle-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            maxLength={100}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </Dialog>
      )}
    </div>
  );
}
