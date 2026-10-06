"use client";

import { Loader2, LocateFixed, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AI_EXAMPLES = [
  "2 BHK furnished near Koramangala under 35k for family",
  "Studio in Powai under 25k",
  "3 BHK with gym and swimming pool in Baner",
  "PG for women near HSR Layout",
];

export const AI_PLACEHOLDER = "Try: 2 BHK furnished near Koramangala under 35k for family";

interface AiSearchBarProps {
  defaultQuery?: string;
  onSearch: (query: string) => void;
  onUseLocation?: () => void;
  loading?: boolean;
  locating?: boolean;
  examples?: readonly string[];
  size?: "md" | "lg";
  className?: string;
}

/** Natural-language search input with optional example chips and a "use my location" action. */
export function AiSearchBar({
  defaultQuery = "",
  onSearch,
  onUseLocation,
  loading,
  locating,
  examples,
  size = "md",
  className,
}: AiSearchBarProps) {
  const [query, setQuery] = useState(defaultQuery);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      toast.error("Describe what you're looking for in a few more words.");
      return;
    }
    onSearch(trimmed.slice(0, 300));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(query);
  };

  const large = size === "lg";
  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={onSubmit}
        role="search"
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white shadow-(--shadow-card) transition-shadow focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-500/10",
          large ? "p-2 pl-4" : "p-1.5 pl-3",
        )}
      >
        <Sparkles className={cn("shrink-0 text-brand-600", large ? "size-5" : "size-4")} aria-hidden />
        <label htmlFor="ai-search" className="sr-only">
          Describe the home you want
        </label>
        <input
          id="ai-search"
          type="search"
          value={query}
          maxLength={300}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={AI_PLACEHOLDER}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none",
            large ? "h-11 text-base" : "h-9 text-sm",
          )}
        />
        {onUseLocation && (
          <Button
            type="button"
            variant="ghost"
            size={large ? "icon" : "icon-sm"}
            onClick={onUseLocation}
            disabled={locating}
            aria-label="Use my location"
            title="Use my location"
          >
            {locating ? <Loader2 className="animate-spin" aria-hidden /> : <LocateFixed aria-hidden />}
          </Button>
        )}
        <Button type="submit" size={large ? "lg" : "sm"} loading={loading} className={large ? "px-5" : undefined}>
          {!loading && <Search aria-hidden />}
          <span className={cn(!large && "sr-only sm:not-sr-only")}>Search</span>
        </Button>
      </form>

      {examples && examples.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Try:</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                submit(example);
              }}
              className="rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs text-zinc-700 transition-colors hover:border-brand-300 hover:text-brand-700"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
