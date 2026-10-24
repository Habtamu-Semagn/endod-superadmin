"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/format";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  admin: { name: string; email: string } | null;
  /** Submitted applications waiting for review; null while unknown. */
  pendingCount: number | null;
  onSignOut: () => void;
}

export default function Sidebar({ collapsed, onToggle, admin, pendingCount, onSignOut }: SidebarProps) {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/super-admin";
  const isOrganisationsActive = pathname.startsWith("/super-admin/organisations");
  const isUsersActive = pathname.startsWith("/super-admin/users");
  const isDigitalCardsActive = pathname.startsWith("/super-admin/digital-cards");
  const isVerificationsActive = pathname.startsWith("/super-admin/verifications");
  const isLocationsActive = pathname.startsWith("/super-admin/locations");
  const isSystemMonitoringActive = pathname.startsWith("/super-admin/system-monitoring");
  const isAuditLogsActive = pathname.startsWith("/super-admin/audit-logs");
  const isSettingsActive = pathname.startsWith("/super-admin/settings");

  return (
    <aside
      className={`fixed top-0 left-0 flex h-full flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 overflow-hidden p-4 ${collapsed ? "w-20" : "w-64"}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex items-center justify-center rounded-xl text-white shrink-0 transition-all ${collapsed ? "w-6 h-6" : "w-9 h-9"}`}>
              <>H+</>
            </div>
            <div className={`${collapsed ? "hidden" : ""} text-left truncate`}>
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">Endod Health</p>
              <p className="text-[8px] font-semibold text-teal-600 uppercase tracking-widest truncate">MedOS Network</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`flex items-center justify-center rounded-lg p-1 transition shrink-0 ${collapsed ? "bg-teal-700 text-white hover:bg-teal-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"}`}
            title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
          >
            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 6l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </button>
        </div>

                <nav aria-label="Main Navigation" className="flex-1 space-y-1.5 overflow-y-auto">
          <Link
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isDashboardActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className={collapsed ? "hidden" : ""}>Dashboard</span>
          </Link>

          <Link
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isOrganisationsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/organisations"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 6h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 10h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 14h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M10 18h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span className={collapsed ? "hidden" : ""}>Organisations</span>
            </div>
          </Link>

          <Link
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isUsersActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/users"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"></circle>
              </svg>
              <span className={collapsed ? "hidden" : ""}>Users & Staff</span>
            </div>
          </Link>

          <Link
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isDigitalCardsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/digital-cards"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect height="14" rx="2" width="20" x="2" y="5"></rect>
                <line x1="2" x2="22" y1="10" y2="10"></line>
              </svg>
              <span className={collapsed ? "hidden" : ""}>Digital Cards</span>
            </div>
          </Link>

          <Link
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isVerificationsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/verifications"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="m9 12 2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              <span className={collapsed ? "hidden" : ""}>Verifications</span>
            </div>
            {pendingCount !== null && pendingCount > 0 && (
              <span data-testid="pending-badge" className={`${collapsed ? "hidden" : ""} text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200`}>{pendingCount}</span>
            )}
          </Link>

          <Link
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isLocationsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/locations"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span className={collapsed ? "hidden" : ""}>Locations & Services</span>
            </div>
          </Link>

          <Link
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isSystemMonitoringActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/system-monitoring"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className={collapsed ? "hidden" : ""}>System Monitoring</span>
          </Link>

          <Link
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isAuditLogsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/audit-logs"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" x2="8" y1="13" y2="13"></line>
              <line x1="16" x2="8" y1="17" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span className={collapsed ? "hidden" : ""}>Audit Logs</span>
          </Link>

          <Link
            className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
              isSettingsActive
                ? "bg-teal-700 text-white shadow-md shadow-teal-700/25"
                : "text-slate-600 hover:text-teal-800 hover:bg-slate-50"
            }`}
            href="/super-admin/settings"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0.73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span className={collapsed ? "hidden" : ""}>Settings</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-slate-200/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center rounded-lg text-teal-200 shrink-0 ${collapsed ? "w-7 h-7" : "w-8 h-8"}`}>
            {admin ? initials(admin.name) : ""}
          </div>
          <div className={`${collapsed ? "hidden" : ""} text-left truncate`}>
            <p className="text-xs font-bold text-slate-800 truncate" data-testid="signed-in-name">{admin?.name ?? ""}</p>
            <p className="text-[8px] text-slate-400 truncate" data-testid="signed-in-email">{admin?.email ?? ""}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="w-full flex items-center justify-center gap-2 py-1.5 px-3 border border-rose-200 hover:border-rose-300 bg-rose-50/50 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold transition">
          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <span className={collapsed ? "hidden" : ""}>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
