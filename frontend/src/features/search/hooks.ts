"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { searchApi } from "@/lib/api/search";
import type { AiSearchRequest, AiSearchResponse } from "@/lib/api/types";
import { searchKeys } from "./keys";
import {
  parseSearchParams,
  searchHref,
  stateFromAiFilters,
  toMapQuery,
  toResultsQuery,
  type SearchState,
} from "./filters";

export type AiSearchMeta = Pick<AiSearchResponse, "explanation" | "parser" | "filters">;

/** Search state backed by the URL query string (shareable, back/forward friendly). */
export function useSearchState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const state = useMemo(() => parseSearchParams(searchParams), [searchParams]);
  const aiQuery = searchParams.get("ai") ?? undefined;

  const setState = useCallback(
    (next: SearchState | ((prev: SearchState) => SearchState), options: { keepAi?: boolean } = {}) => {
      const resolved = typeof next === "function" ? next(state) : next;
      const keepAi = options.keepAi ?? true;
      const href = searchHref(resolved, keepAi && aiQuery ? { ai: aiQuery } : undefined);
      router.replace(href, { scroll: false });
    },
    [state, aiQuery, router],
  );

  /** Merge a patch into the current filters and reset to the first page. */
  const updateFilters = useCallback(
    (patch: Partial<SearchState>) => setState((prev) => ({ ...prev, ...patch, page: undefined })),
    [setState],
  );

  return { state, aiQuery, setState, updateFilters };
}

export function useSearchResults(state: SearchState) {
  const query = toResultsQuery(state);
  return useQuery({
    queryKey: searchKeys.results(query),
    queryFn: ({ signal }) => searchApi.properties(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMapPins(state: SearchState, enabled = true) {
  const query = toMapQuery(state);
  return useQuery({
    queryKey: searchKeys.map(query),
    queryFn: ({ signal }) => searchApi.map(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useLocalities(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: searchKeys.localities(term.toLowerCase()),
    queryFn: ({ signal }) => searchApi.localities(term, signal),
    enabled: term.length >= 2,
    staleTime: 5 * 60_000,
  });
}

/** AI metadata (explanation/parser) for a query that was run in this session, if any. */
export function useAiSearchMeta(query: string | undefined) {
  return useQuery<AiSearchMeta>({
    queryKey: searchKeys.ai(query ?? ""),
    queryFn: () => Promise.reject(new Error("AI search results are only available after running a search")),
    enabled: false,
    staleTime: Infinity,
  });
}

/** Runs the natural-language search and navigates to /search with the extracted filters applied. */
export function useAiSearch() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  return useMutation({
    mutationFn: (request: AiSearchRequest) => searchApi.ai(request),
    onSuccess: (response, request) => {
      const query = request.query.trim();
      const meta: AiSearchMeta = {
        explanation: response.explanation,
        parser: response.parser,
        filters: response.filters,
      };
      queryClient.setQueryData(searchKeys.ai(query), meta);
      const href = searchHref(stateFromAiFilters(response.filters), { ai: query });
      if (pathname === "/search") router.replace(href, { scroll: false });
      else router.push(href);
    },
  });
}
