"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { formatDateTime, formatTime } from "@/lib/format";
import type { PlatformReport, ServiceHealth, SystemHealth } from "@/lib/types";
import { ErrorBanner } from "@/components/superadmin/ComingSoon";

/** How often the page checks again. */
const REFRESH_MS = 30_000;

function Dot({ ok }: { ok: boolean | null | undefined }) {
  const colour = ok === true ? "bg-emerald-500" : ok === false ? "bg-rose-500" : "bg-slate-300";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${colour}`} aria-hidden="true" />;
}

function Check({ label, ok, value }: { label: string; ok?: boolean | null; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="flex items-center gap-2 text-xs text-slate-600">
        {ok !== undefined && <Dot ok={ok} />}
        {label}
      </span>
      <span className="text-xs font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function PlatformDetails({ report }: { report: PlatformReport }) {
  if (!report.available) {
    return <p className="text-[11px] text-slate-500 mt-3">{report.detail ?? "Its admin report is not available."}</p>;
  }
  const count = (n: number | null | undefined) => (typeof n === "number" ? n.toLocaleString("en-US") : "—");
  return (
    <div className="mt-3" data-testid="platform-report">
      <Check label="Database" ok={report.database_ok} value={report.database_ok ? "OK" : "Failing"} />
      <Check
        label="Redis (events)"
        ok={report.redis_configured ? report.redis_ok : null}
        value={!report.redis_configured ? "Not configured" : report.redis_ok ? "OK" : "Failing"}
      />
      <Check
        label="Events worker"
        ok={report.worker_ok}
        value={report.worker_last_heartbeat ? `Last seen ${formatDateTime(report.worker_last_heartbeat)}` : "No heartbeat"}
      />
      <Check label="Dead letters" ok={report.dead_letters === null || report.dead_letters === undefined ? null : report.dead_letters === 0} value={count(report.dead_letters)} />
      <Check
        label="Outbox backlog"
        value={`${count(report.outbox_backlog)}${report.outbox_oldest_at ? ` (oldest ${formatDateTime(report.outbox_oldest_at)})` : ""}`}
      />
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`service-${service.id}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Dot ok={service.ok} />
          {service.name}
        </h3>
        <span
          data-testid={`service-${service.id}-status`}
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
            service.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {service.ok ? "Up" : "Down"}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1">
        {service.detail ?? (service.latency_ms !== null ? `Answered in ${service.latency_ms} ms` : "")}
      </p>
      <p className="text-[11px] text-slate-400 mt-0.5">Last checked {formatTime(service.checked_at)}</p>
      {service.report && <PlatformDetails report={service.report} />}
    </div>
  );
}

/** The status of each Endod service, checked by the admin API every 30 seconds. */
export default function SystemMonitoringContent() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch<SystemHealth>("system/health")
      .then((value) => {
        setData(value);
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not check the services."));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Monitoring</h1>
            <p className="text-xs text-slate-500 mt-1">Health of the Endod services, checked every 30 seconds.</p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-[11px] text-slate-500" data-testid="last-checked">
                Last checked {formatTime(data.checked_at)}
              </span>
            )}
            <button
              type="button"
              onClick={load}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
            >
              Check now
            </button>
          </div>
        </div>
      </section>

      {error && <ErrorBanner message={error} />}
      {!data && !error && <p className="text-xs text-slate-500">Checking the services…</p>}

      {data && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </section>
      )}
    </div>
  );
}
