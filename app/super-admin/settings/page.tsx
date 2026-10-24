import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import SettingsContent from "@/components/superadmin/SettingsContent";

export const metadata: Metadata = {
  title: "Endod Admin | Settings",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <SettingsContent />
      </AdminShell>
    </Suspense>
  );
}
