import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import VerificationsContent from "@/components/superadmin/VerificationsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Verifications",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <VerificationsContent />
      </AdminShell>
    </Suspense>
  );
}
