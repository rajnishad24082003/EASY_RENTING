"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { shortlistApi } from "@/lib/api/shortlist";
import type { Page, PropertyDetailDto, PropertySummaryDto } from "@/lib/api/types";
import { propertyKeys } from "@/features/properties/keys";
import { searchKeys } from "@/features/search/keys";
import { shortlistKeys } from "./keys";

export function useShortlist(page: number, enabled = true) {
  return useQuery({
    queryKey: shortlistKeys.list(page),
    queryFn: () => shortlistApi.list({ page, size: 12 }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Adds/removes a property from the tenant's shortlist, optimistically flipping `shortlisted` everywhere. */
export function useToggleShortlist() {
  const queryClient = useQueryClient();

  const patch = (propertyId: string, shortlisted: boolean) => {
    const patchPage = (page: Page<PropertySummaryDto> | undefined) =>
      page && {
        ...page,
        content: page.content.map((p) => (p.id === propertyId ? { ...p, shortlisted } : p)),
      };
    queryClient.setQueriesData<Page<PropertySummaryDto>>({ queryKey: [...searchKeys.all, "results"] }, patchPage);
    queryClient.setQueryData<PropertyDetailDto>(
      propertyKeys.detail(propertyId),
      (detail) => detail && { ...detail, shortlisted },
    );
  };

  return useMutation({
    mutationFn: ({ propertyId, shortlisted }: { propertyId: string; shortlisted: boolean }) =>
      shortlisted ? shortlistApi.add(propertyId) : shortlistApi.remove(propertyId),
    onMutate: ({ propertyId, shortlisted }) => patch(propertyId, shortlisted),
    onError: (_error, { propertyId, shortlisted }) => patch(propertyId, !shortlisted),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shortlistKeys.all }),
  });
}
