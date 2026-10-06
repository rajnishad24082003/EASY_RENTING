"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { searchApi } from "@/lib/api/search";
import { ListingCard, ListingCardSkeleton } from "@/features/properties/components/listing-card";
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { toResultsQuery } from "../filters";
import { searchKeys } from "../keys";

const FEATURED_QUERY = toResultsQuery({ sort: "NEWEST" }, 8);

export function FeaturedListings() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: searchKeys.results(FEATURED_QUERY),
    queryFn: ({ signal }) => searchApi.properties(FEATURED_QUERY, signal),
  });

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="featured-heading">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Fresh on EasyRenting
          </h2>
          <p className="mt-1 text-zinc-500">The newest homes listed by verified owners.</p>
        </div>
        <Link href="/search?sort=NEWEST" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          View all <ArrowRight aria-hidden />
        </Link>
      </div>
      {isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load listings" />
      ) : data.content.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No listings yet"
          description="Check back soon — new homes are added every day."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.content.map((property) => (
            <ListingCard
              key={property.id}
              property={property}
              action={<ShortlistButton propertyId={property.id} shortlisted={property.shortlisted} />}
            />
          ))}
        </div>
      )}
    </section>
  );
}
