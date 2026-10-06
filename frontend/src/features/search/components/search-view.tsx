"use client";

import { List, Map as MapIcon, SearchX, SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SORT_OPTIONS, type SortBy } from "@/lib/api/types";
import { SORT_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ListingCard, ListingCardSkeleton } from "@/features/properties/components/listing-card";
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { activeFilterChips, DEFAULT_RADIUS_KM, serializeSearchState, type SearchState } from "../filters";
import { useAiSearch, useAiSearchMeta, useMapPins, useSearchResults, useSearchState } from "../hooks";
import { AiSearchBar } from "./ai-search-bar";
import { AiSearchSummary } from "./ai-search-summary";
import { FilterPanel } from "./filter-panel";

const SearchMap = dynamic(() => import("./search-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

export function SearchView() {
  const { state, aiQuery, setState, updateFilters } = useSearchState();
  const results = useSearchResults(state);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const showMap = isDesktop || mobileView === "map";
  const pins = useMapPins(state, showMap);
  const ai = useAiSearch();
  const aiMeta = useAiSearchMeta(aiQuery);
  const { locate, locating } = useGeolocation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Remount local filter-panel state whenever the URL-backed state changes.
  const stateKey = serializeSearchState(state).toString();
  const geo =
    state.lat !== undefined && state.lng !== undefined
      ? { lat: state.lat, lng: state.lng, radiusKm: state.radiusKm ?? DEFAULT_RADIUS_KM }
      : null;
  const reset = () => setState({}, { keepAi: false });
  const activeCount = activeFilterChips(state).length;

  const runAi = (query: string) => ai.mutate({ query, lat: state.lat, lng: state.lng });

  const searchNearMe = async () => {
    const coords = await locate();
    if (!coords) return;
    updateFilters({
      ...coords,
      radiusKm: state.radiusKm ?? DEFAULT_RADIUS_KM,
      near: "your location",
      city: undefined,
      locality: undefined,
      sort: "DISTANCE",
    });
  };

  const filterPanel = <FilterPanel key={stateKey} state={state} onChange={updateFilters} onReset={reset} />;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-3 sm:px-6">
          <AiSearchBar
            key={aiQuery ?? ""}
            defaultQuery={aiQuery}
            onSearch={runAi}
            onUseLocation={searchNearMe}
            loading={ai.isPending}
            locating={locating}
          />
          <AiSearchSummary
            state={state}
            onChange={(next) => setState(next)}
            explanation={aiMeta.data?.explanation}
            parser={aiMeta.data?.parser}
            onClearAll={reset}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 xl:block" aria-label="Search filters">
          <div className="sticky top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto p-5">{filterPanel}</div>
        </aside>

        <section
          className={cn("min-w-0 flex-1 px-4 py-5 sm:px-6", !isDesktop && mobileView === "map" && "hidden")}
          aria-label="Search results"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="xl:hidden">
                    <SlidersHorizontal aria-hidden /> Filters
                    {activeCount > 0 && (
                      <span className="rounded-full bg-zinc-900 px-1.5 text-[11px] text-white">{activeCount}</span>
                    )}
                  </Button>
                </DialogTrigger>
                <SheetContent title="Filters" side="left">
                  <div className="p-5">{filterPanel}</div>
                </SheetContent>
              </Dialog>
              <p className="text-sm text-zinc-600" aria-live="polite">
                {results.data ? (
                  <>
                    <span className="font-semibold text-zinc-900">
                      {results.data.totalElements.toLocaleString("en-IN")}
                    </span>{" "}
                    {results.data.totalElements === 1 ? "home" : "homes"} found
                  </>
                ) : (
                  "Searching…"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-zinc-500">
                Sort
              </label>
              <Select
                id="sort"
                className="h-9 w-44"
                value={state.sort ?? "RELEVANCE"}
                options={SORT_OPTIONS.filter((s) => s !== "DISTANCE" || geo).map((s) => ({
                  value: s,
                  label: SORT_LABELS[s],
                }))}
                onChange={(e) =>
                  updateFilters({ sort: e.target.value === "RELEVANCE" ? undefined : (e.target.value as SortBy) })
                }
              />
            </div>
          </div>

          <ResultsList
            state={state}
            results={results}
            hoveredId={hoveredId}
            onHover={isDesktop ? setHoveredId : undefined}
            onReset={reset}
            onPageChange={(page) => {
              setState({ ...state, page });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </section>

        {showMap && (
          <aside
            className={cn(
              "relative",
              isDesktop
                ? "sticky top-16 h-[calc(100dvh-4rem)] w-[42%] max-w-[720px] shrink-0 border-l border-zinc-200"
                : "h-[calc(100dvh-12rem)] min-h-[420px] w-full",
            )}
            aria-label="Map"
          >
            <SearchMap
              pins={pins.data ?? []}
              geo={geo}
              city={state.city}
              activeId={hoveredId}
              onSearchArea={(area) =>
                updateFilters({ ...area, near: "this area", city: undefined, locality: undefined })
              }
            />
          </aside>
        )}
      </div>

      {!isDesktop && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center">
          <Button
            variant="secondary"
            className="rounded-full px-5 shadow-lg"
            onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}
          >
            {mobileView === "list" ? (
              <>
                <MapIcon aria-hidden /> Map
              </>
            ) : (
              <>
                <List aria-hidden /> List
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function ResultsList({
  state,
  results,
  hoveredId,
  onHover,
  onReset,
  onPageChange,
}: {
  state: SearchState;
  results: ReturnType<typeof useSearchResults>;
  hoveredId: string | null;
  onHover?: (id: string | null) => void;
  onReset: () => void;
  onPageChange: (page: number) => void;
}) {
  const { data, isPending, isError, error, refetch, isPlaceholderData } = results;

  if (isPending) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Search failed" />;
  if (data.content.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No homes match these filters"
        description={
          activeFilterChips(state).length > 0
            ? "Try widening the rent range, removing a few amenities, or increasing the search radius."
            : "There are no listings available right now. Check back soon."
        }
        action={
          activeFilterChips(state).length > 0 && (
            <Button variant="outline" size="sm" onClick={onReset}>
              Clear all filters
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {data.content.map((property, index) => (
          <ListingCard
            key={property.id}
            property={property}
            priority={index < 2}
            highlighted={hoveredId === property.id}
            onHover={onHover}
            action={<ShortlistButton propertyId={property.id} shortlisted={property.shortlisted} />}
          />
        ))}
      </div>
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
        className="mt-8 pb-16 lg:pb-0"
      />
    </div>
  );
}
