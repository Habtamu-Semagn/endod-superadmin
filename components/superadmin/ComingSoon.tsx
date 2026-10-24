interface ComingSoonProps {
  title: string;
  description: string;
  /** What this screen will do, shown under "Coming soon". */
  plan: string;
}

/** A screen that arrives in a later step: its heading, and nothing made up. */
export default function ComingSoon({ title, description, plan }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </div>
        </div>
      </section>
      <ComingSoonCard plan={plan} />
    </div>
  );
}

export function ComingSoonCard({ plan, compact = false }: { plan: string; compact?: boolean }) {
  return (
    <section
      data-testid="coming-soon"
      className={`bg-white rounded-xl border border-dashed border-slate-300 text-center ${compact ? "p-6" : "p-10"}`}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-[#0d5c52]">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth="2" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
      <p className="text-sm font-bold text-slate-900">Coming soon</p>
      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{plan}</p>
    </section>
  );
}

/** An error from the admin API or the hospital service, shown as it was given. */
export function ErrorBanner({ message, testId = "error-banner" }: { message: string; testId?: string }) {
  return (
    <p role="alert" data-testid={testId} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
      {message}
    </p>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <p role="status" data-testid="success-banner" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
      {message}
    </p>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</p>
      <div className="text-sm text-slate-900 mt-0.5 break-words">{children}</div>
    </div>
  );
}

export function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span data-testid="status-badge" className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${className}`}>
      {label}
    </span>
  );
}
