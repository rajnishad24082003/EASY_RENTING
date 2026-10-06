import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageSpinner } from "@/components/ui/spinner";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
