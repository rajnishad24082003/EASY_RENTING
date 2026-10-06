import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  parseSearchParams,
  serializeSearchState,
  stateFromAiFilters,
  toMapQuery,
  toResultsQuery,
  type SearchState,
} from "./filters";

const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));

describe("search state (de)serialisation", () => {
  it("round-trips a full state through the URL", () => {
    const state: SearchState = {
      keywords: "balcony",
      city: "Bengaluru",
      lat: 12.9352,
      lng: 77.6245,
      radiusKm: 3,
      near: "Koramangala",
      minRent: 10000,
      maxRent: 35000,
      bhk: [1, 2],
      propertyType: ["APARTMENT", "VILLA"],
      furnishing: ["FULLY_FURNISHED"],
      tenantPreference: "FAMILY",
      amenities: ["GYM", "PARKING"],
      availableBefore: "2026-12-01",
      sort: "RENT_ASC",
      page: 2,
    };
    const qs = serializeSearchState(state).toString();
    expect(qs).toContain("bhk=1&bhk=2");
    expect(parse(qs)).toEqual({ ...state, amenities: ["PARKING", "GYM"] });
  });

  it("produces the same URL for equivalent states (stable ordering)", () => {
    const a = serializeSearchState(parse("bhk=2&bhk=1&city=Pune")).toString();
    const b = serializeSearchState(parse("city=Pune&bhk=1&bhk=2")).toString();
    expect(a).toBe(b);
  });

  it("drops invalid values", () => {
    expect(
      parse(
        "bhk=two&bhk=11&bhk=3&propertyType=CASTLE&furnishing=UNFURNISHED&sort=CHEAPEST&availableBefore=tomorrow&page=-1&minRent=abc",
      ),
    ).toEqual({ bhk: [3], furnishing: ["UNFURNISHED"] });
  });

  it("requires both lat and lng and clamps the radius", () => {
    expect(parse("lat=12.9")).toEqual({});
    expect(parse("lat=12.9&lng=77.6&radiusKm=500")).toMatchObject({ lat: 12.9, lng: 77.6, radiusKm: 50 });
    expect(parse("lat=12.9&lng=77.6")).toMatchObject({ radiusKm: 5 });
    expect(parse("lat=120&lng=77.6")).toEqual({});
  });

  it("swaps an inverted rent range", () => {
    expect(parse("minRent=40000&maxRent=20000")).toMatchObject({ minRent: 20000, maxRent: 40000 });
  });

  it("omits page 0 and empty values from the URL", () => {
    expect(serializeSearchState({ page: 0, city: "", keywords: "  " }).toString()).toBe("");
  });
});

describe("API query mapping", () => {
  it("maps keywords to q and adds paging", () => {
    expect(toResultsQuery({ keywords: "lake view", bhk: [2], page: 1 }, 20)).toEqual({
      q: "lake view",
      bhk: [2],
      page: 1,
      size: 20,
    });
  });

  it("never sends the display-only `near` label and omits paging for the map", () => {
    const query = toMapQuery({ lat: 1, lng: 2, radiusKm: 3, near: "Somewhere", sort: "DISTANCE", page: 3 });
    expect(query).toEqual({ lat: 1, lng: 2, radiusKm: 3 });
  });
});

describe("stateFromAiFilters", () => {
  it("turns a geocoded locality into a display label and sanitises values", () => {
    const state = stateFromAiFilters({
      locality: "Koramangala",
      lat: 12.9352,
      lng: 77.6245,
      radiusKm: 3,
      maxRent: 35000,
      bhk: [2],
      furnishing: ["FULLY_FURNISHED", "SEMI_FURNISHED"],
      tenantPreference: "FAMILY",
      keywords: "",
    });
    expect(state).toEqual({
      lat: 12.9352,
      lng: 77.6245,
      radiusKm: 3,
      near: "Koramangala",
      maxRent: 35000,
      bhk: [2],
      furnishing: ["SEMI_FURNISHED", "FULLY_FURNISHED"],
      tenantPreference: "FAMILY",
    });
  });

  it("keeps a non-geocoded locality as a text filter", () => {
    expect(stateFromAiFilters({ locality: "Whitefield" })).toEqual({ locality: "Whitefield" });
  });
});

describe("activeFilterChips", () => {
  it("creates one removable chip per value", () => {
    const state: SearchState = { bhk: [0, 2], maxRent: 35000, lat: 1, lng: 2, radiusKm: 3, near: "HSR", page: 4 };
    const chips = activeFilterChips(state);
    expect(chips.map((c) => c.label)).toEqual(["Within 3 km of HSR", "Under ₹35K", "1 RK / Studio", "2 BHK"]);

    const withoutStudio = chips.find((c) => c.id === "bhk-0")!.remove(state);
    expect(withoutStudio.bhk).toEqual([2]);
    expect(withoutStudio.page).toBeUndefined();

    const withoutGeo = chips.find((c) => c.id === "geo")!.remove(state);
    expect(withoutGeo).not.toHaveProperty("lat");
    expect(withoutGeo).not.toHaveProperty("near");
  });

  it("removes the key entirely when the last list item is removed", () => {
    const state: SearchState = { amenities: ["GYM"] };
    expect(activeFilterChips(state)[0].remove(state)).toEqual({});
  });
});
