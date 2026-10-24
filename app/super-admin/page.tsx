import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import DashboardContent from "@/components/superadmin/DashboardContent";

export const metadata: Metadata = {
  title: "Endod Admin | Dashboard",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <DashboardContent />
      </AdminShell>
    </Suspense>
  );
}
