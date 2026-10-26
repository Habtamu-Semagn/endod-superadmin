import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import CompanyVerificationDetailContent from "@/components/superadmin/CompanyVerificationDetailContent";

export const metadata: Metadata = {
  title: "Endod Admin | Company application",
};

export default function Page() {
  // A dynamic route: the id is only known at request time.
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <CompanyVerificationDetailContent />
      </AdminShell>
    </Suspense>
  );
}
