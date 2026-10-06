"use client";

import { Building2, CalendarDays, Heart, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarLayout, type SidebarNavItem } from "@/components/layout/sidebar-layout";
import { RequireAuth } from "@/lib/auth/require-auth";
import { useAuth } from "@/lib/auth/use-auth";
import { VerificationBanner } from "@/features/verification/components/verification-banner";

const NAV: Record<"TENANT" | "OWNER" | "ADMIN", SidebarNavItem[]> = {
  TENANT: [
    { href: "/dashboard/visits", label: "My visits", icon: CalendarDays },
    { href: "/dashboard/shortlist", label: "Shortlist", icon: Heart },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  OWNER: [
    { href: "/dashboard/listings", label: "My listings", icon: Building2 },
    { href: "/dashboard/visits", label: "Visit requests", icon: CalendarDays },
    { href: "/dashboard/verification", label: "Verification", icon: ShieldCheck },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
  ADMIN: [
    { href: "/admin", label: "Admin console", icon: ShieldCheck },
    { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  ],
};

function Shell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <SidebarLayout title="Dashboard" items={NAV[user.role]} banner={<VerificationBanner />}>
      {children}
    </SidebarLayout>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}
