import { apiRequest } from "./client";
import type { CountResponse, NotificationDto, Page, PageParams } from "./types";

export const notificationsApi = {
  list: (params: PageParams = {}) => apiRequest<Page<NotificationDto>>("/notifications", { query: { ...params } }),
  unreadCount: () => apiRequest<CountResponse>("/notifications/unread-count"),
  markRead: (id: string) => apiRequest<void>(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => apiRequest<void>("/notifications/read-all", { method: "POST" }),
};
