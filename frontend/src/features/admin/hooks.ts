"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import type { PropertyStatus, Role, VerificationStatus } from "@/lib/api/types";
import { searchKeys } from "@/features/search/keys";
import { adminKeys } from "./keys";

const PAGE_SIZE = 20;

export function useAdminStats() {
  return useQuery({ queryKey: adminKeys.stats(), queryFn: adminApi.stats });
}

export function useAdminVerifications(status: VerificationStatus, page: number) {
  return useQuery({
    queryKey: adminKeys.verifications(status, page),
    queryFn: () => adminApi.verifications({ status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUsers(q: string, role: Role | undefined, page: number) {
  return useQuery({
    queryKey: adminKeys.users(q, role, page),
    queryFn: () => adminApi.users({ q: q || undefined, role, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProperties(q: string, status: PropertyStatus | undefined, page: number) {
  return useQuery({
    queryKey: adminKeys.properties(q, status, page),
    queryFn: () => adminApi.properties({ q: q || undefined, status, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

/** All admin mutations invalidate the admin cache (stats, queues and tables move together). */
export function useAdminMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: adminKeys.all });

  return {
    approve: useMutation({ mutationFn: adminApi.approve, onSuccess: invalidate }),
    reject: useMutation({
      mutationFn: ({ ownerId, reason }: { ownerId: string; reason: string }) => adminApi.reject(ownerId, reason),
      onSuccess: invalidate,
    }),
    setSuspended: useMutation({
      mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
        suspended ? adminApi.suspend(id) : adminApi.unsuspend(id),
      onSuccess: invalidate,
    }),
    setPropertyStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: PropertyStatus }) => adminApi.setPropertyStatus(id, status),
      onSuccess: () => {
        void invalidate();
        void queryClient.invalidateQueries({ queryKey: searchKeys.all });
      },
    }),
  };
}
