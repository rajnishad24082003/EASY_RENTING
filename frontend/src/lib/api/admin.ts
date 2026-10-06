import { apiRequest } from "./client";
import type {
  AdminStatsDto,
  AdminUserDto,
  AdminVerificationDto,
  Page,
  PageParams,
  PropertyStatus,
  PropertySummaryDto,
  Role,
  VerificationStatus,
} from "./types";

export const adminApi = {
  stats: () => apiRequest<AdminStatsDto>("/admin/stats"),
  verifications: (params: PageParams & { status?: VerificationStatus } = {}) =>
    apiRequest<Page<AdminVerificationDto>>("/admin/verifications", { query: { ...params } }),
  approve: (ownerId: string) =>
    apiRequest<AdminVerificationDto>(`/admin/verifications/${ownerId}/approve`, { method: "POST" }),
  reject: (ownerId: string, reason: string) =>
    apiRequest<AdminVerificationDto>(`/admin/verifications/${ownerId}/reject`, { method: "POST", body: { reason } }),
  users: (params: PageParams & { q?: string; role?: Role } = {}) =>
    apiRequest<Page<AdminUserDto>>("/admin/users", { query: { ...params } }),
  suspend: (id: string) => apiRequest<AdminUserDto>(`/admin/users/${id}/suspend`, { method: "POST" }),
  unsuspend: (id: string) => apiRequest<AdminUserDto>(`/admin/users/${id}/unsuspend`, { method: "POST" }),
  properties: (params: PageParams & { q?: string; status?: PropertyStatus } = {}) =>
    apiRequest<Page<PropertySummaryDto>>("/admin/properties", { query: { ...params } }),
  setPropertyStatus: (id: string, status: PropertyStatus) =>
    apiRequest<PropertySummaryDto>(`/admin/properties/${id}/status`, { method: "PATCH", body: { status } }),
};
