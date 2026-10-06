"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api/properties";
import type { PropertyDetailDto, PropertyRequest, PropertyStatus } from "@/lib/api/types";
import { searchKeys } from "@/features/search/keys";
import { propertyKeys } from "./keys";

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: propertyKeys.detail(id ?? ""),
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  });
}

export function useMyListings(page: number) {
  return useQuery({
    queryKey: propertyKeys.mine(page),
    queryFn: () => propertiesApi.mine({ page, size: 12 }),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateListings() {
  const queryClient = useQueryClient();
  return (detail?: PropertyDetailDto) => {
    if (detail) queryClient.setQueryData(propertyKeys.detail(detail.id), detail);
    void queryClient.invalidateQueries({ queryKey: propertyKeys.mineAll() });
    void queryClient.invalidateQueries({ queryKey: searchKeys.all });
  };
}

export function useSaveProperty() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: PropertyRequest }) =>
      id ? propertiesApi.update(id, body) : propertiesApi.create(body),
    onSuccess: (detail) => invalidate(detail),
    meta: { skipGlobalError: true },
  });
}

export function useSetPropertyStatus() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PropertyStatus }) => propertiesApi.setStatus(id, status),
    onSuccess: (detail) => invalidate(detail),
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (id: string) => propertiesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: propertyKeys.detail(id) });
      invalidate();
    },
  });
}

export function usePropertyImages(propertyId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateListings();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
    invalidate();
  };

  const upload = useMutation({
    mutationFn: (files: File[]) => propertiesApi.uploadImages(propertyId, files),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (imageId: string) => propertiesApi.deleteImage(propertyId, imageId),
    onSuccess: refresh,
  });
  const setCover = useMutation({
    mutationFn: (imageId: string) => propertiesApi.setCover(propertyId, imageId),
    onSuccess: refresh,
  });
  return { upload, remove, setCover };
}
