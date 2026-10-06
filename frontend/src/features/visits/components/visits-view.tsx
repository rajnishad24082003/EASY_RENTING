"use client";

import { CalendarX2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Role, VisitListParams } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/use-auth";
import { useVisits } from "../hooks";
import { VisitCard } from "./visit-card";

type TabId = "upcoming" | "pending" | "past";

const TABS: Record<TabId, { label: string; params: (role: Role) => VisitListParams; empty: string }> = {
  upcoming: {
    label: "Upcoming",
    // Owners also see past confirmed visits here so they can mark them completed.
    params: (role) => (role === "OWNER" ? { status: ["CONFIRMED"] } : { status: ["CONFIRMED"], upcoming: true }),
    empty: "No confirmed visits coming up.",
  },
  pending: {
    label: "Pending",
    params: () => ({ status: ["REQUESTED", "RESCHEDULE_PROPOSED"] }),
    empty: "No visit requests awaiting a response.",
  },
  past: {
    label: "Past",
    params: () => ({ status: ["COMPLETED", "CANCELLED", "REJECTED"] }),
    empty: "Completed, cancelled and declined visits show up here.",
  },
};

export function VisitsView() {
  const { user } = useAuth();
  const role = user?.role ?? "TENANT";
  const [tab, setTab] = useState<TabId>(role === "OWNER" ? "pending" : "upcoming");
  const [page, setPage] = useState(0);
  const params = { ...TABS[tab].params(role), page, size: 10 };
  const { data, isPending, isError, error, refetch, dataUpdatedAt } = useVisits(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visits</h1>
        <p className="text-sm text-zinc-500">
          {role === "OWNER" ? "Respond to visit requests for your listings." : "Track the homes you've asked to visit."}
        </p>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as TabId);
          setPage(0);
        }}
      >
        <TabsList>
          {(Object.keys(TABS) as TabId[]).map((id) => (
            <TabsTrigger key={id} value={id}>
              {TABS[id].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Nothing here yet"
          description={TABS[tab].empty}
          action={
            role === "TENANT" && (
              <Link href="/search" className={buttonVariants({ size: "sm" })}>
                Find homes to visit
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {data.content.map((visit) => (
            <VisitCard key={visit.id} visit={visit} viewerRole={role} now={dataUpdatedAt} />
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} className="pt-2" />
        </div>
      )}
    </div>
  );
}
