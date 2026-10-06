import type { QueryParams } from "@/lib/api/client";

export const searchKeys = {
  all: ["search"] as const,
  results: (query: QueryParams) => [...searchKeys.all, "results", query] as const,
  map: (query: QueryParams) => [...searchKeys.all, "map", query] as const,
  localities: (q: string) => [...searchKeys.all, "localities", q] as const,
  ai: (query: string) => [...searchKeys.all, "ai", query] as const,
};
