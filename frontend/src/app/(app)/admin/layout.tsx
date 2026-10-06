import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageSpinner } from "@/components/ui/spinner";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · EasyRenting" } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
