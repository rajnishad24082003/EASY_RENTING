import { apiRequest } from "./client";
import type { Page, PageParams, PropertySummaryDto } from "./types";

export const shortlistApi = {
  list: (params: PageParams = {}) => apiRequest<Page<PropertySummaryDto>>("/shortlist", { query: { ...params } }),
  add: (propertyId: string) => apiRequest<void>(`/shortlist/${propertyId}`, { method: "PUT" }),
  remove: (propertyId: string) => apiRequest<void>(`/shortlist/${propertyId}`, { method: "DELETE" }),
};
