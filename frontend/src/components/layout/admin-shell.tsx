"use client";

import { Building2, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarLayout, type SidebarNavItem } from "@/components/layout/sidebar-layout";
import { RequireAuth } from "@/lib/auth/require-auth";

const NAV: SidebarNavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: Building2 },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <SidebarLayout title="Admin" items={NAV}>
        {children}
      </SidebarLayout>
    </RequireAuth>
  );
}
