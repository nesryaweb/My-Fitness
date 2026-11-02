
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Dumbbell,
  House,
  Library,
  Settings,
  Sparkles,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { signOut } from "next-auth/react";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: House },
      { name: "Weekly Plan", href: "/plan", icon: CalendarDays },
    ],
  },
  {
    title: "TRAINING",
    items: [
      { name: "Workouts", href: "/workouts", icon: Dumbbell },
      { name: "Exercise Library", href: "/library", icon: Library },
    ],
  },
  {
    title: "YOUR JOURNEY",
    items: [
      {
        name: "Progress",
        href: "/progress",
        icon: ChartNoAxesCombined,
      },
      { name: "Workout Log", href: "/log", icon: ClipboardList },
    ],
  },
];

export default function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-x-hidden overflow-y-auto border-r border-border bg-card p-4 transition-all duration-300 ease-in-out ${
  mobileOpen
    ? "translate-x-0"
    : "-translate-x-full lg:translate-x-0"
} ${
  collapsed ? "lg:w-20" : "lg:w-64"
}`}
    >
      {/* Brand and controls */}
      <div
        className={`mb-10 flex items-center ${
          collapsed ? "flex-col gap-4" : "justify-between gap-2"
        }`}
      >
        <Link
          href="/"
          title="Fitness Tracker"
          onClick={onMobileClose}
          className={`flex min-w-0 items-center gap-3 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Activity size={22} />
          </div>

         {(!collapsed || mobileOpen) && (
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-lg font-bold tracking-tight text-foreground">
                Fitness Tracker
              </h1>

              <p className="whitespace-nowrap text-xs text-muted-foreground">
                Your fitness journey
              </p>
            </div>
          )}
        </Link>

        {/* Desktop collapse button */}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground lg:flex"
        >
          {collapsed ? (
            <PanelLeftOpen size={19} />
          ) : (
            <PanelLeftClose size={19} />
          )}
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-8">
        {navigation.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.15em] text-muted-foreground">
                {group.title}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={collapsed ? item.name : undefined}
                    aria-label={item.name}
                    className={`flex items-center rounded-xl py-2.5 text-sm transition-all ${
                     collapsed && !mobileOpen
  ? "justify-center px-2"
  : "gap-3 px-3"
                    } ${
                      active
                        ? "bg-secondary font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />

                   {(!collapsed || mobileOpen) && (
                      <span className="whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <Link
          href="/settings"
          onClick={onMobileClose}
          title={collapsed ? "Settings" : undefined}
          aria-label="Settings"
          className={`flex items-center rounded-xl py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <Settings size={19} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/login" })}
          title={collapsed ? "Log out" : undefined}
          aria-label="Log out"
          className={`flex w-full items-center rounded-xl py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <LogOut size={19} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        {!collapsed && (
          <div className="rounded-xl bg-secondary p-3">
            <Sparkles size={18} className="mb-2 text-primary" />

            <p className="text-sm font-semibold text-foreground">
              Small steps, big progress.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Your journey, your pace.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
