import { apiRequest } from "./client";
import type { CreateVisitRequest, Page, VisitDto, VisitListParams } from "./types";

export const visitsApi = {
  create: (body: CreateVisitRequest) => apiRequest<VisitDto>("/visits", { method: "POST", body }),
  list: ({ status, upcoming, page, size }: VisitListParams = {}) =>
    apiRequest<Page<VisitDto>>("/visits", { query: { status, upcoming, page, size } }),
  get: (id: string) => apiRequest<VisitDto>(`/visits/${id}`),
  confirm: (id: string) => apiRequest<VisitDto>(`/visits/${id}/confirm`, { method: "POST" }),
  reject: (id: string, reason?: string) =>
    apiRequest<VisitDto>(`/visits/${id}/reject`, { method: "POST", body: { reason } }),
  reschedule: (id: string, proposedAt: string, note?: string) =>
    apiRequest<VisitDto>(`/visits/${id}/reschedule`, { method: "POST", body: { proposedAt, note } }),
  acceptReschedule: (id: string) => apiRequest<VisitDto>(`/visits/${id}/accept-reschedule`, { method: "POST" }),
  cancel: (id: string, reason?: string) =>
    apiRequest<VisitDto>(`/visits/${id}/cancel`, { method: "POST", body: { reason } }),
  complete: (id: string) => apiRequest<VisitDto>(`/visits/${id}/complete`, { method: "POST" }),
};
