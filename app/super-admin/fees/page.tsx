import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import FeesContent from "@/components/superadmin/FeesContent";

export const metadata: Metadata = {
  title: "Endod Admin | Fees",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <FeesContent />
      </AdminShell>
    </Suspense>
  );
}
