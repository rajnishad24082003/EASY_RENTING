import type { QueryParams } from "@/lib/api/client";
import {
  AMENITIES,
  FURNISHINGS,
  PROPERTY_TYPES,
  SORT_OPTIONS,
  TENANT_PREFERENCES,
  type SearchFilters,
} from "@/lib/api/types";
import { bhkLabel, formatDate, formatINRCompact } from "@/lib/format";
import { AMENITY_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, TENANT_PREFERENCE_LABELS } from "@/lib/labels";

/** Search UI state. Mirrors `SearchFilters`, plus paging and a display-only label for the geo centre. */
export interface SearchState extends SearchFilters {
  /** Display label for the geo centre (e.g. a locality picked from autocomplete). Never sent to the API. */
  near?: string;
  /** 0-based page index. */
  page?: number;
}

export const RADIUS_MIN_KM = 0.5;
export const RADIUS_MAX_KM = 50;
export const DEFAULT_RADIUS_KM = 5;
export const LOCALITY_RADIUS_KM = 3;
export const RENT_SLIDER_MAX = 200_000;
export const SEARCH_PAGE_SIZE = 20;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function toNumber(raw: string | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function toEnum<T extends string>(raw: string | null, allowed: readonly T[]): T | undefined {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

function toEnumList<T extends string>(raw: string[], allowed: readonly T[]): T[] | undefined {
  const list = [...new Set(raw)].filter((v): v is T => (allowed as readonly string[]).includes(v));
  return list.length ? allowed.filter((v) => list.includes(v)) : undefined;
}

function toText(raw: string | null): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

interface ReadableParams {
  get(name: string): string | null;
  getAll(name: string): string[];
}

/** Parses (and sanitises) search state from URL query params. Invalid values are dropped. */
export function parseSearchParams(params: ReadableParams): SearchState {
  const state: SearchState = {};

  state.keywords = toText(params.get("q"));
  state.city = toText(params.get("city"));
  state.locality = toText(params.get("locality"));

  const lat = toNumber(params.get("lat"));
  const lng = toNumber(params.get("lng"));
  if (lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    state.lat = lat;
    state.lng = lng;
    const radius = toNumber(params.get("radiusKm"));
    state.radiusKm = clamp(radius ?? DEFAULT_RADIUS_KM, RADIUS_MIN_KM, RADIUS_MAX_KM);
    state.near = toText(params.get("near"));
  }

  const minRent = toNumber(params.get("minRent"));
  const maxRent = toNumber(params.get("maxRent"));
  if (minRent !== undefined && minRent > 0) state.minRent = Math.round(minRent);
  if (maxRent !== undefined && maxRent > 0) state.maxRent = Math.round(maxRent);
  if (state.minRent !== undefined && state.maxRent !== undefined && state.minRent > state.maxRent) {
    [state.minRent, state.maxRent] = [state.maxRent, state.minRent];
  }

  const bhk = [
    ...new Set(
      params
        .getAll("bhk")
        .map((v) => toNumber(v))
        .filter((v): v is number => v !== undefined && Number.isInteger(v) && v >= 0 && v <= 10),
    ),
  ].sort((a, b) => a - b);
  if (bhk.length) state.bhk = bhk;

  state.propertyType = toEnumList(params.getAll("propertyType"), PROPERTY_TYPES);
  state.furnishing = toEnumList(params.getAll("furnishing"), FURNISHINGS);
  state.tenantPreference = toEnum(params.get("tenantPreference"), TENANT_PREFERENCES);
  state.amenities = toEnumList(params.getAll("amenities"), AMENITIES);

  const availableBefore = params.get("availableBefore");
  if (availableBefore && DATE_RE.test(availableBefore)) state.availableBefore = availableBefore;

  state.sort = toEnum(params.get("sort"), SORT_OPTIONS);

  const page = toNumber(params.get("page"));
  if (page !== undefined && Number.isInteger(page) && page > 0) state.page = page;

  return prune(state);
}

function prune<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

const roundCoord = (value: number) => Math.round(value * 1e5) / 1e5;

/** Serialises state to URL params in a stable order (so equal states produce equal URLs). */
export function serializeSearchState(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };
  const append = (key: string, values: readonly (string | number)[] | undefined) =>
    values?.forEach((v) => params.append(key, String(v)));

  set("q", state.keywords?.trim());
  set("city", state.city);
  set("locality", state.locality);
  if (state.lat !== undefined && state.lng !== undefined) {
    set("lat", roundCoord(state.lat));
    set("lng", roundCoord(state.lng));
    set("radiusKm", state.radiusKm);
    set("near", state.near);
  }
  set("minRent", state.minRent);
  set("maxRent", state.maxRent);
  append("bhk", state.bhk);
  append("propertyType", state.propertyType);
  append("furnishing", state.furnishing);
  set("tenantPreference", state.tenantPreference);
  append("amenities", state.amenities);
  set("availableBefore", state.availableBefore);
  set("sort", state.sort);
  if (state.page && state.page > 0) set("page", state.page);
  return params;
}

export function searchHref(state: SearchState, extra?: Record<string, string>): string {
  const params = serializeSearchState(state);
  if (extra) for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

function filterQuery(state: SearchState): QueryParams {
  return {
    q: state.keywords,
    city: state.city,
    locality: state.locality,
    lat: state.lat,
    lng: state.lng,
    radiusKm: state.lat !== undefined ? state.radiusKm : undefined,
    minRent: state.minRent,
    maxRent: state.maxRent,
    bhk: state.bhk,
    propertyType: state.propertyType,
    furnishing: state.furnishing,
    tenantPreference: state.tenantPreference,
    amenities: state.amenities,
    availableBefore: state.availableBefore,
  };
}

/** Query params for `GET /search/properties`. */
export function toResultsQuery(state: SearchState, size = SEARCH_PAGE_SIZE): QueryParams {
  return prune({ ...filterQuery(state), sort: state.sort, page: state.page ?? 0, size });
}

/** Query params for `GET /search/properties/map` (same filters, no paging/sort). */
export function toMapQuery(state: SearchState): QueryParams {
  return prune(filterQuery(state));
}

/**
 * Converts AI-extracted filters into sanitised UI state. When the backend geocoded a locality
 * (lat/lng present), the locality name becomes the display label instead of an extra text filter.
 */
export function stateFromAiFilters(filters: SearchFilters): SearchState {
  const draft: SearchState = { ...filters };
  if (filters.lat !== undefined && filters.lng !== undefined && filters.locality) {
    draft.near = filters.locality;
    delete draft.locality;
  }
  return parseSearchParams(serializeSearchState(draft));
}

export interface FilterChip {
  id: string;
  label: string;
  remove: (state: SearchState) => SearchState;
}

function without<K extends keyof SearchState>(...keys: K[]) {
  return (state: SearchState): SearchState => {
    const next = { ...state };
    for (const key of keys) delete next[key];
    delete next.page;
    return next;
  };
}

function withoutItem<K extends "bhk" | "propertyType" | "furnishing" | "amenities">(
  key: K,
  item: NonNullable<SearchState[K]>[number],
) {
  return (state: SearchState): SearchState => {
    const list = (state[key] as readonly unknown[] | undefined)?.filter((v) => v !== item) ?? [];
    const next: SearchState = { ...state, [key]: list.length ? list : undefined };
    delete next.page;
    return prune(next);
  };
}

/** Human-readable, individually removable chips for every active filter. */
export function activeFilterChips(state: SearchState): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.keywords) chips.push({ id: "q", label: `“${state.keywords}”`, remove: without("keywords") });
  if (state.city) chips.push({ id: "city", label: state.city, remove: without("city") });
  if (state.locality) chips.push({ id: "locality", label: state.locality, remove: without("locality") });
  if (state.lat !== undefined && state.lng !== undefined) {
    const label = `Within ${state.radiusKm ?? DEFAULT_RADIUS_KM} km${state.near ? ` of ${state.near}` : ""}`;
    chips.push({ id: "geo", label, remove: without("lat", "lng", "radiusKm", "near") });
  }
  if (state.minRent !== undefined || state.maxRent !== undefined) {
    const label =
      state.minRent !== undefined && state.maxRent !== undefined
        ? `${formatINRCompact(state.minRent)} – ${formatINRCompact(state.maxRent)}`
        : state.maxRent !== undefined
          ? `Under ${formatINRCompact(state.maxRent)}`
          : `Above ${formatINRCompact(state.minRent!)}`;
    chips.push({ id: "rent", label, remove: without("minRent", "maxRent") });
  }
  state.bhk?.forEach((bhk) =>
    chips.push({
      id: `bhk-${bhk}`,
      label: bhk === 0 ? "1 RK / Studio" : bhkLabel(bhk),
      remove: withoutItem("bhk", bhk),
    }),
  );
  state.propertyType?.forEach((type) =>
    chips.push({ id: `type-${type}`, label: PROPERTY_TYPE_LABELS[type], remove: withoutItem("propertyType", type) }),
  );
  state.furnishing?.forEach((f) =>
    chips.push({ id: `furnishing-${f}`, label: FURNISHING_LABELS[f], remove: withoutItem("furnishing", f) }),
  );
  if (state.tenantPreference) {
    chips.push({
      id: "tenant",
      label: `For ${TENANT_PREFERENCE_LABELS[state.tenantPreference].toLowerCase()}`,
      remove: without("tenantPreference"),
    });
  }
  state.amenities?.forEach((a) =>
    chips.push({ id: `amenity-${a}`, label: AMENITY_LABELS[a], remove: withoutItem("amenities", a) }),
  );
  if (state.availableBefore) {
    chips.push({
      id: "available",
      label: `Available by ${formatDate(state.availableBefore)}`,
      remove: without("availableBefore"),
    });
  }
  return chips;
}

export function hasActiveFilters(state: SearchState): boolean {
  return activeFilterChips(state).length > 0;
}
