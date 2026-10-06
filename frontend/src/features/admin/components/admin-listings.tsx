"use client";

import { Building2, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select, toOptions } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PROPERTY_STATUSES, type PropertyStatus } from "@/lib/api/types";
import { bhkLabel, formatDate, formatINR } from "@/lib/format";
import { PROPERTY_STATUS_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PROPERTY_STATUS_BADGE } from "@/features/properties/status-badge";
import { useAdminMutations, useAdminProperties } from "../hooks";

export function AdminListings() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<PropertyStatus | undefined>();
  const [page, setPage] = useState(0);
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useAdminProperties(debouncedQ, status, page);
  const { setPropertyStatus } = useAdminMutations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
        <p className="text-sm text-zinc-500">Moderate listings across all owners.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search listings"
            placeholder="Search by title or locality"
            className="pl-9"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          aria-label="Filter by status"
          className="sm:w-44"
          value={status ?? ""}
          placeholder="All statuses"
          options={toOptions(PROPERTY_STATUSES, PROPERTY_STATUS_LABELS)}
          onChange={(e) => {
            setStatus((e.target.value || undefined) as PropertyStatus | undefined);
            setPage(0);
          }}
        />
      </div>

      {isPending ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState icon={Building2} title="No listings found" description="Try a different search or status." />
      ) : (
        <Card className={cn("divide-y divide-zinc-100", isPlaceholderData && "opacity-60")}>
          {data.content.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                <PropertyImage src={p.coverImageUrl} alt="" sizes="96px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                <p className="text-sm text-zinc-500">
                  {bhkLabel(p.bhk, p.propertyType)} · {p.locality}, {p.city} · {formatINR(p.rent)}/mo
                </p>
                <p className="text-xs text-zinc-400">
                  Listed {formatDate(p.createdAt)} · {p.ownerVerified ? "Verified owner" : "Unverified owner"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={PROPERTY_STATUS_BADGE[p.status]} className="hidden md:inline-flex">
                  {PROPERTY_STATUS_LABELS[p.status]}
                </Badge>
                <Select
                  aria-label={`Status of ${p.title}`}
                  className="h-9 w-36"
                  value={p.status}
                  disabled={setPropertyStatus.isPending && setPropertyStatus.variables?.id === p.id}
                  options={toOptions(PROPERTY_STATUSES, PROPERTY_STATUS_LABELS)}
                  onChange={(e) =>
                    setPropertyStatus.mutate(
                      { id: p.id, status: e.target.value as PropertyStatus },
                      { onSuccess: () => toast.success("Listing status updated") },
                    )
                  }
                />
                <Link
                  href={`/properties/${p.id}`}
                  className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                  aria-label={`View ${p.title}`}
                >
                  <ExternalLink aria-hidden />
                </Link>
              </div>
            </div>
          ))}
        </Card>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
