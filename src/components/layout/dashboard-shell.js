
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "./app-sidebar";

export default function DashboardShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <main
        className={`min-h-screen w-full min-w-0 transition-[margin] duration-300 ease-in-out ${
          collapsed ? "lg:ml-20 lg:w-[calc(100%-5rem)]" : "lg:ml-64 lg:w-[calc(100%-16rem)]"
        }`}
      >
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Menu size={22} />
          </button>

          <span className="ml-3 text-sm font-bold">
            Fitness Tracker
          </span>
        </div>

        {children}
      </main>
    </div>
  );
}
