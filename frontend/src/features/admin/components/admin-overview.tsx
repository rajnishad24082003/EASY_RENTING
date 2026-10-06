"use client";

import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock,
  Home,
  KeyRound,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminStatsDto } from "@/lib/api/types";
import { useAdminStats } from "../hooks";

const STATS: { key: keyof AdminStatsDto; label: string; icon: LucideIcon; href?: string }[] = [
  { key: "totalUsers", label: "Total users", icon: Users, href: "/admin/users" },
  { key: "totalTenants", label: "Tenants", icon: KeyRound, href: "/admin/users" },
  { key: "totalOwners", label: "Owners", icon: Home, href: "/admin/users" },
  { key: "verifiedOwners", label: "Verified owners", icon: BadgeCheck },
  { key: "pendingVerifications", label: "Pending verifications", icon: Clock, href: "/admin/verifications" },
  { key: "activeListings", label: "Active listings", icon: Building2, href: "/admin/listings" },
  { key: "totalListings", label: "Total listings", icon: Building2, href: "/admin/listings" },
  { key: "visitsThisWeek", label: "Visits this week", icon: CalendarDays },
  { key: "messagesThisWeek", label: "Messages this week", icon: MessageSquare },
];

export function AdminOverview() {
  const { data, isPending, isError, error, refetch } = useAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500">Platform health at a glance.</p>
      </div>
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {STATS.map(({ key, label, icon: Icon, href }) => {
            const body = (
              <Card className="flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm text-zinc-500">{label}</p>
                  {isPending ? (
                    <Skeleton className="mt-1 h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold tabular-nums">{data[key].toLocaleString("en-IN")}</p>
                  )}
                </div>
              </Card>
            );
            return href ? (
              <Link key={key} href={href} className="rounded-(--radius-card)">
                {body}
              </Link>
            ) : (
              <div key={key}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
