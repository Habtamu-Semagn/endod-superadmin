"use client";

import { useState } from "react";
import Header from "@/components/superadmin/Header";
import Sidebar from "@/components/superadmin/Sidebar";
import SettingsContent from "@/components/superadmin/SettingsContent";

export default function Page() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "5rem" : "16rem";

  return (
    <div className="flex h-full flex-col bg-[#f8fafc]">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
        <div
          className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc]"
          style={{ paddingLeft: sidebarWidth }}
        >
          <Header />
          <main className="p-6 lg:p-8 space-y-6">
            <SettingsContent />
          </main>
        </div>
      </div>
    </div>
  );
}
