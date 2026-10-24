"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Header from "@/components/superadmin/Header";
import Sidebar from "@/components/superadmin/Sidebar";
import Dialog from "@/components/superadmin/Dialog";
import { ApiError, apiFetch, goToLogin } from "@/lib/api";
import { hardNavigate } from "@/lib/navigation";
import type { Dashboard, Me } from "@/lib/types";

type AdminContextValue = {
  me: Me;
  /** The number of submitted applications waiting for review (the sidebar badge). */
  pendingCount: number | null;
  refreshCounts: () => void;
  /**
   * Runs an approve / reject / suspend / delete call. If the API asks for a
   * fresh TOTP first, prompts for one, then runs the call again.
   */
  runSensitive: <T>(call: () => Promise<T>) => Promise<T>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin outside AdminShell");
  return value;
}

export class Cancelled extends Error {
  constructor() {
    super("Cancelled.");
  }
}

type Pending = { resolve: () => void; reject: (error: Error) => void };

export default function AdminShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "5rem" : "16rem";
  const [me, setMe] = useState<Me | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [code, setCode] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthBusy, setReauthBusy] = useState(false);
  const pending = useRef<Pending | null>(null);

  useEffect(() => {
    let alive = true;
    apiFetch<Me>("auth/me")
      .then((value) => {
        if (!alive) return;
        if (value.stage !== "full") goToLogin();
        else setMe(value);
      })
      .catch((error: unknown) => {
        if (alive && error instanceof ApiError && error.status !== 401) setLoadError(error.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const refreshCounts = useCallback(() => {
    apiFetch<Dashboard>("dashboard")
      .then((value) => setPendingCount(value.pending_applications))
      .catch(() => setPendingCount(null));
  }, []);

  useEffect(() => {
    if (me) refreshCounts();
  }, [me, refreshCounts]);

  const askForCode = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        pending.current = { resolve, reject };
        setCode("");
        setReauthError(null);
        setReauthOpen(true);
      }),
    []
  );

  const runSensitive = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        if (error instanceof ApiError && error.code === "REAUTH_REQUIRED") {
          await askForCode();
          return await call();
        }
        throw error;
      }
    },
    [askForCode]
  );

  const cancelReauth = useCallback(() => {
    setReauthOpen(false);
    pending.current?.reject(new Cancelled());
    pending.current = null;
  }, []);

  const confirmReauth = async () => {
    setReauthBusy(true);
    setReauthError(null);
    try {
      await apiFetch("auth/reauth", { method: "POST", body: { code } });
      setReauthOpen(false);
      pending.current?.resolve();
      pending.current = null;
    } catch (error) {
      setReauthError(error instanceof ApiError ? error.message : "Could not check the code.");
      setCode("");
    } finally {
      setReauthBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await apiFetch("auth/logout", { method: "POST", redirectOn401: false });
    } catch {
      // Signed out on this side either way: the cookie is cleared by the BFF.
    }
    hardNavigate("/login");
  };

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
          admin={me?.admin ?? null}
          pendingCount={pendingCount}
          onSignOut={signOut}
        />
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]" style={{ paddingLeft: sidebarWidth }}>
          <Header adminName={me?.admin.name ?? null} />
          <main className="p-6 lg:p-8 space-y-6">
            {me ? (
              <AdminContext.Provider value={{ me, pendingCount, refreshCounts, runSensitive }}>
                {children}
              </AdminContext.Provider>
            ) : loadError ? (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
                {loadError}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Loading…</p>
            )}
          </main>
        </div>
      </div>
      {reauthOpen && (
        <Dialog
          testId="reauth-dialog"
          title="Confirm it is you"
          description="Enter the 6-digit code from your authenticator app. It stays valid for 10 minutes of approvals and changes."
          confirmLabel="Confirm"
          busy={reauthBusy}
          confirmDisabled={code.replace(/\s/g, "").length !== 6}
          error={reauthError}
          onConfirm={confirmReauth}
          onCancel={cancelReauth}
        >
          <label className="block text-[10px] uppercase tracking-wide text-slate-400 font-semibold" htmlFor="reauth-code">
            Authenticator code
          </label>
          <input
            id="reauth-code"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, "").slice(0, 7))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && code.replace(/\s/g, "").length === 6) void confirmReauth();
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-1 w-full px-3 py-2 text-sm tracking-[0.3em] font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            placeholder="123456"
          />
        </Dialog>
      )}
    </div>
  );
}
