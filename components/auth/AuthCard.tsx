import type { ReactNode } from "react";

/** The frame of the sign-in, setup and enrolment pages, in the dashboard's colours. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d5c52] text-sm font-bold text-white">H+</div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 leading-tight">Endod Health</p>
            <p className="text-[8px] font-semibold text-teal-600 uppercase tracking-widest">Super Admin</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">admin.endod-health.com · authorised Endod staff only</p>
      </div>
    </div>
  );
}

export const inputClass =
  "mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900";
export const labelClass = "block text-[10px] uppercase tracking-wide text-slate-500 font-semibold";
export const primaryButton =
  "w-full px-4 py-2.5 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50";
export const linkButton = "text-xs font-semibold text-teal-700 hover:underline";

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" data-testid="form-error" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
      {message}
    </p>
  );
}
