import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import DigitalCardsContent from "@/components/superadmin/DigitalCardsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Digital Cards",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <DigitalCardsContent />
      </AdminShell>
    </Suspense>
  );
}
