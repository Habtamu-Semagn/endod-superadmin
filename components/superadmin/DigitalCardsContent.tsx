"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ApiError, apiFetch } from "@/lib/api";
import { PATIENT_STATUS, formatDate, parseCardInput } from "@/lib/format";
import type { CardCheck } from "@/lib/types";
import { ErrorBanner, Field, StatusBadge } from "@/components/superadmin/ComingSoon";

const VALID = { label: "Valid", className: "bg-emerald-100 text-emerald-800 border border-emerald-200" };
const NOT_VALID = { label: "Not valid", className: "bg-rose-100 text-rose-800 border border-rose-300" };

/** Look up a Digital Health Card by Endod ID (or its QR link): valid or not, when it
 * was issued, and the account's status. No health data. */
export default function DigitalCardsContent() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CardCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCardInput(input);
    setResult(null);
    if (!parsed) {
      setError("Enter an Endod ID (DE and six digits) or the link from the card's QR code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const query = parsed.signature ? `?s=${encodeURIComponent(parsed.signature)}` : "";
      setResult(await apiFetch<CardCheck>(`cards/${parsed.dedanId}${query}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not check the card.");
    } finally {
      setBusy(false);
    }
  };

  const verdict = result?.valid ? VALID : NOT_VALID;
  const account = result ? PATIENT_STATUS[result.account_status] ?? PATIENT_STATUS.active : null;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Digital Cards</h1>
            <p className="text-xs text-slate-500 mt-1">
              Check a patient&apos;s Digital Health Card: whether it is valid, when it was issued and the account&apos;s status.
            </p>
          </div>
        </div>
      </section>

      <section>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2 max-w-xl">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Endod ID or card link"
            maxLength={300}
            className="flex-1 min-w-[240px] px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="DE123456, or the card's QR link"
            type="text"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check card"}
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-2">
          With the QR link, the card&apos;s signature is checked too; with the ID alone, only the account behind it.
        </p>
      </section>

      {error && <ErrorBanner message={error} />}

      {result && account && (
        <section className="bg-white rounded-xl border border-slate-200 p-5" data-testid="card-result">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Card <span className="font-mono">{result.dedan_id}</span>
            </h3>
            <span data-testid="card-verdict">
              <StatusBadge label={verdict.label} className={verdict.className} />
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Issued">{formatDate(result.issued_at)}</Field>
            <Field label="Account status">
              <span data-testid="card-account-status">{account.label}</span>
            </Field>
            <Field label="Signature">
              <span data-testid="card-signature">
                {!result.signing_available
                  ? "Cards cannot be signed on the platform right now"
                  : !result.signature_checked
                    ? "Not checked (no QR link given)"
                    : result.signature_valid
                      ? "Genuine: signed by Endod"
                      : "Not Endod's signature: the card is forged or altered"}
              </span>
            </Field>
            <Field label="Account">
              <Link href={`/super-admin/users/${result.dedan_id}`} className="text-teal-700 hover:underline text-xs">
                Open the account
              </Link>
            </Field>
          </div>
        </section>
      )}
    </div>
  );
}
