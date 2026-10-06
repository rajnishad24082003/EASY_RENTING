"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useProperty } from "@/features/properties/hooks";
import { valuesFromProperty } from "../schema";
import { ListingWizard } from "./listing-wizard";

export function EditListing({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useProperty(id);
  if (isPending) return <Skeleton className="mx-auto h-96 max-w-4xl rounded-2xl" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load this listing" />;
  return <ListingWizard propertyId={id} initialValues={valuesFromProperty(data)} initialStatus={data.status} />;
}
