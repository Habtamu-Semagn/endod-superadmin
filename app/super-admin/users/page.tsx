import { Suspense } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/superadmin/AdminShell";
import UsersStaffContent from "@/components/superadmin/UsersStaffContent";

export const metadata: Metadata = {
  title: "Endod Admin | Users",
};

export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-xs text-slate-500">Loading…</p>}>
      <AdminShell>
        <UsersStaffContent />
      </AdminShell>
    </Suspense>
  );
}
