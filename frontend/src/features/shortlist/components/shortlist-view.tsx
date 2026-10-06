"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { ListingCard, ListingCardSkeleton } from "@/features/properties/components/listing-card";
import { useShortlist } from "../hooks";
import { ShortlistButton } from "./shortlist-button";

export function ShortlistView() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error, refetch } = useShortlist(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shortlist</h1>
        <p className="text-sm text-zinc-500">Homes you&apos;ve saved for later.</p>
      </div>
      {isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.content.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved homes yet"
          description="Tap the heart on any listing to keep it here."
          action={
            <Link href="/search" className={buttonVariants({ size: "sm" })}>
              Start exploring
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.content.map((property) => (
              <ListingCard
                key={property.id}
                property={property}
                action={<ShortlistButton propertyId={property.id} shortlisted />}
              />
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
