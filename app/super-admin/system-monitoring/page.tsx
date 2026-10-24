import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import SystemMonitoringContent from "@/components/superadmin/SystemMonitoringContent";

export const metadata: Metadata = {
  title: "Endod Admin | System Monitoring",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <SystemMonitoringContent />
      </AdminShell>
    </Suspense>
  );
}
