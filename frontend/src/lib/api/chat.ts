import { apiRequest } from "./client";
import type { ConversationDto, CountResponse, MessageDto, Page, PageParams } from "./types";

export const chatApi = {
  start: (propertyId: string, message: string) =>
    apiRequest<ConversationDto>("/conversations", { method: "POST", body: { propertyId, message } }),
  list: (params: PageParams = {}) => apiRequest<Page<ConversationDto>>("/conversations", { query: { ...params } }),
  get: (id: string) => apiRequest<ConversationDto>(`/conversations/${id}`),
  messages: (id: string, params: { before?: string; size?: number } = {}) =>
    apiRequest<MessageDto[]>(`/conversations/${id}/messages`, { query: { ...params } }),
  send: (id: string, content: string) =>
    apiRequest<MessageDto>(`/conversations/${id}/messages`, { method: "POST", body: { content } }),
  markRead: (id: string) => apiRequest<void>(`/conversations/${id}/read`, { method: "POST" }),
  unreadCount: () => apiRequest<CountResponse>("/conversations/unread-count"),
};
