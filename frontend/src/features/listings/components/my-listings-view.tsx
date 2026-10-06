"use client";

import { Building2, ExternalLink, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Select, toOptions } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PROPERTY_STATUSES, type PropertyStatus, type PropertySummaryDto } from "@/lib/api/types";
import { bhkLabel, formatDate, formatINR } from "@/lib/format";
import { PROPERTY_STATUS_LABELS } from "@/lib/labels";
import { PROPERTY_STATUS_BADGE } from "@/features/properties/status-badge";
import { useDeleteProperty, useMyListings, useSetPropertyStatus } from "@/features/properties/hooks";

function ListingRow({ listing, onDelete }: { listing: PropertySummaryDto; onDelete: () => void }) {
  const setStatus = useSetPropertyStatus();
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-36">
        <PropertyImage src={listing.coverImageUrl} alt={listing.title} sizes="144px" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={PROPERTY_STATUS_BADGE[listing.status]}>{PROPERTY_STATUS_LABELS[listing.status]}</Badge>
          {!listing.coverImageUrl && (
            <Badge variant="warning">
              <ImageOff aria-hidden /> No photos
            </Badge>
          )}
        </div>
        <p className="line-clamp-1 font-semibold">{listing.title}</p>
        <p className="text-sm text-zinc-500">
          {bhkLabel(listing.bhk, listing.propertyType)} · {listing.locality}, {listing.city} ·{" "}
          <span className="font-medium text-zinc-900">{formatINR(listing.rent)}</span>/mo
        </p>
        <p className="text-xs text-zinc-400">Listed {formatDate(listing.createdAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
        <label className="sr-only" htmlFor={`status-${listing.id}`}>
          Listing status
        </label>
        <Select
          id={`status-${listing.id}`}
          className="h-9 w-36"
          value={listing.status}
          disabled={setStatus.isPending}
          options={toOptions(PROPERTY_STATUSES, PROPERTY_STATUS_LABELS)}
          onChange={(e) =>
            setStatus.mutate(
              { id: listing.id, status: e.target.value as PropertyStatus },
              { onSuccess: () => toast.success("Status updated") },
            )
          }
        />
        <div className="flex gap-1">
          <Link
            href={`/dashboard/listings/${listing.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            aria-label="Edit listing"
            title="Edit"
          >
            <Pencil aria-hidden />
          </Link>
          <Link
            href={`/properties/${listing.id}`}
            className={buttonVariants({ variant: "outline", size: "icon-sm" })}
            aria-label="View listing"
            title="View"
          >
            <ExternalLink aria-hidden />
          </Link>
          <Button variant="outline" size="icon-sm" onClick={onDelete} aria-label="Delete listing" title="Delete">
            <Trash2 className="text-red-600" aria-hidden />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function MyListingsView() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error, refetch } = useMyListings(page);
  const remove = useDeleteProperty();
  const [toDelete, setToDelete] = useState<PropertySummaryDto | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <p className="text-sm text-zinc-500">Manage your properties, photos and availability.</p>
        </div>
        <Link href="/dashboard/listings/new" className={buttonVariants()}>
          <Plus aria-hidden /> New listing
        </Link>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="You haven't listed anything yet"
          description="Create your first listing — it takes about five minutes."
          action={
            <Link href="/dashboard/listings/new" className={buttonVariants({ size: "sm" })}>
              <Plus aria-hidden /> Create listing
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.content.map((listing) => (
            <ListingRow key={listing.id} listing={listing} onDelete={() => setToDelete(listing)} />
          ))}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} className="pt-2" />
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Delete this listing?"
        description={`"${toDelete?.title ?? ""}" will be removed and tenants will no longer be able to see it.`}
        confirmLabel="Delete listing"
        destructive
        loading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              toast.success("Listing deleted");
              setToDelete(null);
            },
          })
        }
      />
    </div>
  );
}
