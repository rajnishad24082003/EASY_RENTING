"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/notifications";
import type { CountResponse, NotificationDto, Page } from "@/lib/api/types";
import { notificationKeys } from "./keys";

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () => notificationsApi.list({ page: 0, size: 15 }),
    enabled,
  });
}

export function useNotificationUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: notificationsApi.unreadCount,
    enabled,
    select: (data) => data.count,
  });
}

function patchRead(queryClient: ReturnType<typeof useQueryClient>, predicate: (n: NotificationDto) => boolean) {
  queryClient.setQueryData<Page<NotificationDto>>(notificationKeys.list(), (page) =>
    page ? { ...page, content: page.content.map((n) => (predicate(n) ? { ...n, read: true } : n)) } : page,
  );
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => {
      patchRead(queryClient, (n) => n.id === id);
      queryClient.setQueryData<CountResponse>(notificationKeys.unreadCount(), (data) =>
        data ? { count: Math.max(0, data.count - 1) } : data,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () => {
      patchRead(queryClient, () => true);
      queryClient.setQueryData<CountResponse>(notificationKeys.unreadCount(), { count: 0 });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
