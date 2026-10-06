import { apiRequest, type QueryParams } from "./client";
import type { AiSearchRequest, AiSearchResponse, LocalityDto, MapPinDto, Page, PropertySummaryDto } from "./types";

export const searchApi = {
  properties: (query: QueryParams, signal?: AbortSignal) =>
    apiRequest<Page<PropertySummaryDto>>("/search/properties", { query, signal }),
  map: (query: QueryParams, signal?: AbortSignal) =>
    apiRequest<MapPinDto[]>("/search/properties/map", { query, signal }),
  ai: (body: AiSearchRequest) => apiRequest<AiSearchResponse>("/search/ai", { method: "POST", body }),
  localities: (q: string, signal?: AbortSignal) =>
    apiRequest<LocalityDto[]>("/search/localities", { query: { q }, signal }),
};
