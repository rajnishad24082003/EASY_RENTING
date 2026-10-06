import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/spinner";
import { SearchView } from "@/features/search/components/search-view";

export const metadata: Metadata = {
  title: "Search rentals",
  description: "Search rental homes by locality, budget, BHK and amenities — or just describe what you want.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SearchView />
    </Suspense>
  );
}
