"use client";

import { useRouter } from "next/navigation";
import { useGeolocation } from "@/hooks/use-geolocation";
import { DEFAULT_RADIUS_KM, searchHref } from "../filters";
import { useAiSearch } from "../hooks";
import { AI_EXAMPLES, AiSearchBar } from "./ai-search-bar";

export function HeroSearch() {
  const router = useRouter();
  const ai = useAiSearch();
  const { locate, locating } = useGeolocation();

  const nearMe = async () => {
    const coords = await locate();
    if (coords) {
      router.push(searchHref({ ...coords, radiusKm: DEFAULT_RADIUS_KM, near: "your location", sort: "DISTANCE" }));
    }
  };

  return (
    <AiSearchBar
      size="lg"
      examples={AI_EXAMPLES}
      onSearch={(query) => ai.mutate({ query })}
      onUseLocation={nearMe}
      loading={ai.isPending}
      locating={locating}
    />
  );
}
