import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import AuditLogsContent from "@/components/superadmin/AuditLogsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Audit Logs",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <AuditLogsContent />
      </AdminShell>
    </Suspense>
  );
}
