import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "../../auth.js";
import DashboardShell from "../../components/layout/dashboard-shell";

function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">
        Loading your dashboard...
      </p>
    </div>
  );
}

async function ProtectedDashboard({ children }) {
  await connection();

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <ProtectedDashboard>
        {children}
      </ProtectedDashboard>
    </Suspense>
  );
}