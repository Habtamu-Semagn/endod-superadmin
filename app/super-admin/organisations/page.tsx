"use client";

import { useState } from "react";
import Header from "@/components/superadmin/Header";
import Sidebar from "@/components/superadmin/Sidebar";
import OrganisationsContent from "@/components/superadmin/OrganisationsContent";

export default function OrganisationsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "5rem" : "16rem";

  return (
    <div className="flex h-full flex-col overflow-x-hidden bg-[#f8fafc]">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ paddingLeft: sidebarWidth }}
        >
          <Header />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            <OrganisationsContent />
          </main>
        </div>
      </div>
    </div>
  );
}
