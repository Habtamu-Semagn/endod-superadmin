import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import PatientDetailContent from "@/components/superadmin/PatientDetailContent";

export const metadata: Metadata = {
  title: "Endod Admin | Patient account",
};

export default function Page() {
  // A dynamic route: the Endod ID is only known at request time.
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <PatientDetailContent />
      </AdminShell>
    </Suspense>
  );
}
