"use client";

import { useState } from "react";
import { Suspense } from "react";
import Header from "@/components/superadmin/Header";
import Sidebar from "@/components/superadmin/Sidebar";
import OrganisationDetailContent from "@/components/superadmin/OrganisationDetailContent";

export default function OrganisationDetailPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "5rem" : "16rem";

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((prev) => !prev)}
          />
        </Suspense>
        <div
          className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]"
          style={{ paddingLeft: sidebarWidth }}
        >
          <Header />
          <main className="p-6 lg:p-8 space-y-6">
            <Suspense fallback={<div className="text-xs text-slate-500">Loading...</div>}>
              <OrganisationDetailContent />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
