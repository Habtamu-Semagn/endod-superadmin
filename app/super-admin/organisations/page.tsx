import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import OrganisationsContent from "@/components/superadmin/OrganisationsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Organisations",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <OrganisationsContent />
      </AdminShell>
    </Suspense>
  );
}
