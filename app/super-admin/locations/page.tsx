import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import LocationsContent from "@/components/superadmin/LocationsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Locations & Services",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <LocationsContent />
      </AdminShell>
    </Suspense>
  );
}
