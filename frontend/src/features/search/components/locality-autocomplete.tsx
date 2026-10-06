"use client";

import { MapPin } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { LocalityDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useLocalities } from "../hooks";

interface LocalityAutocompleteProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (locality: LocalityDto) => void;
  /** Called on Enter without picking a suggestion. */
  onCommit?: (value: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

/** Accessible combobox backed by `GET /search/localities`. */
export function LocalityAutocomplete({
  id,
  value,
  onValueChange,
  onSelect,
  onCommit,
  placeholder = "Search a locality, e.g. Koramangala",
  ...aria
}: LocalityAutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebouncedValue(value, 250);
  const { data = [], isFetching } = useLocalities(debounced);
  const showList = open && value.trim().length >= 2 && (data.length > 0 || isFetching);

  const choose = (locality: LocalityDto) => {
    onSelect(locality);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, data.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (showList && activeIndex >= 0 && data[activeIndex]) choose(data[activeIndex]);
      else {
        setOpen(false);
        onCommit?.(value.trim());
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        {...aria}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-(--shadow-pop)"
        >
          {data.length === 0 ? (
            <li className="flex justify-center p-3">
              <Spinner className="size-4" />
            </li>
          ) : (
            data.map((locality, index) => (
              <li
                key={`${locality.name}-${locality.city}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(locality)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  index === activeIndex ? "bg-zinc-100" : "hover:bg-zinc-50",
                )}
              >
                <MapPin className="size-4 shrink-0 text-zinc-400" aria-hidden />
                <span className="font-medium text-zinc-900">{locality.name}</span>
                <span className="text-zinc-500">{locality.city}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
