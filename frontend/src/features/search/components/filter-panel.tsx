"use client";

import { LocateFixed } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, toOptions } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useGeolocation } from "@/hooks/use-geolocation";
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES, TENANT_PREFERENCES } from "@/lib/api/types";
import { CITIES } from "@/lib/constants";
import { formatINRCompact } from "@/lib/format";
import { AMENITY_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, TENANT_PREFERENCE_LABELS } from "@/lib/labels";
import { AMENITY_ICONS } from "@/features/properties/components/amenity-icon";
import {
  DEFAULT_RADIUS_KM,
  LOCALITY_RADIUS_KM,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  RENT_SLIDER_MAX,
  type SearchState,
} from "../filters";
import { LocalityAutocomplete } from "./locality-autocomplete";

const BHK_OPTIONS = [
  { value: 0, label: "1 RK / Studio" },
  { value: 1, label: "1 BHK" },
  { value: 2, label: "2 BHK" },
  { value: 3, label: "3 BHK" },
  { value: 4, label: "4 BHK" },
  { value: 5, label: "5 BHK" },
];

function toggle<T>(list: readonly T[] | undefined, item: T): T[] | undefined {
  const next = list?.includes(item) ? list.filter((v) => v !== item) : [...(list ?? []), item];
  return next.length ? next : undefined;
}

function Section({ title, children, htmlFor }: { title: string; children: ReactNode; htmlFor?: string }) {
  return (
    <section className="space-y-2.5 border-b border-zinc-100 py-4 first:pt-0 last:border-0">
      {htmlFor ? (
        <Label htmlFor={htmlFor} className="block">
          {title}
        </Label>
      ) : (
        <h3 className="text-sm font-medium text-zinc-800">{title}</h3>
      )}
      {children}
    </section>
  );
}

interface FilterPanelProps {
  state: SearchState;
  onChange: (patch: Partial<SearchState>) => void;
  onReset: () => void;
}

export function FilterPanel({ state, onChange, onReset }: FilterPanelProps) {
  const { locate, locating } = useGeolocation();
  const [localityText, setLocalityText] = useState(state.near ?? state.locality ?? "");
  const [rent, setRent] = useState<[number, number]>([state.minRent ?? 0, state.maxRent ?? RENT_SLIDER_MAX]);
  const hasGeo = state.lat !== undefined && state.lng !== undefined;

  const useMyLocation = async () => {
    const coords = await locate();
    if (coords) {
      setLocalityText("");
      onChange({
        ...coords,
        radiusKm: state.radiusKm ?? DEFAULT_RADIUS_KM,
        near: "your location",
        city: undefined,
        locality: undefined,
        sort: "DISTANCE",
      });
    }
  };

  return (
    <div className="text-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Filters</h2>
        <Button variant="link" size="sm" onClick={onReset}>
          Reset all
        </Button>
      </div>

      <Section title="City" htmlFor="filter-city">
        <Select
          id="filter-city"
          value={state.city ?? ""}
          placeholder="Any city"
          options={CITIES.map((c) => ({ value: c.name, label: c.name }))}
          onChange={(e) => onChange({ city: e.target.value || undefined })}
        />
      </Section>

      <Section title="Locality" htmlFor="filter-locality">
        <LocalityAutocomplete
          id="filter-locality"
          value={localityText}
          onValueChange={setLocalityText}
          onSelect={(locality) => {
            setLocalityText(locality.name);
            onChange({
              lat: locality.latitude,
              lng: locality.longitude,
              radiusKm: LOCALITY_RADIUS_KM,
              near: locality.name,
              city: locality.city,
              locality: undefined,
            });
          }}
          onCommit={(text) => onChange({ locality: text || undefined })}
        />
        <Button variant="outline" size="sm" className="w-full" onClick={useMyLocation} loading={locating}>
          {!locating && <LocateFixed aria-hidden />} Near me
        </Button>
      </Section>

      {hasGeo && (
        <Section title={`Within ${state.radiusKm ?? DEFAULT_RADIUS_KM} km`}>
          <Slider
            min={RADIUS_MIN_KM}
            max={RADIUS_MAX_KM}
            step={0.5}
            defaultValue={[state.radiusKm ?? DEFAULT_RADIUS_KM]}
            onValueCommit={([radiusKm]) => onChange({ radiusKm })}
            thumbLabels={["Search radius in km"]}
          />
        </Section>
      )}

      <Section title="Monthly rent">
        <Slider
          min={0}
          max={RENT_SLIDER_MAX}
          step={1000}
          minStepsBetweenThumbs={1}
          value={rent}
          onValueChange={(v) => setRent([v[0], v[1]])}
          onValueCommit={([min, max]) =>
            onChange({ minRent: min > 0 ? min : undefined, maxRent: max < RENT_SLIDER_MAX ? max : undefined })
          }
          thumbLabels={["Minimum rent", "Maximum rent"]}
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>{rent[0] > 0 ? formatINRCompact(rent[0]) : "No min"}</span>
          <span>{rent[1] < RENT_SLIDER_MAX ? formatINRCompact(rent[1]) : "No max"}</span>
        </div>
      </Section>

      <Section title="BHK">
        <div className="flex flex-wrap gap-2">
          {BHK_OPTIONS.map(({ value, label }) => (
            <ToggleChip
              key={value}
              selected={!!state.bhk?.includes(value)}
              onClick={() => onChange({ bhk: toggle(state.bhk, value)?.sort((a, b) => a - b) })}
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Property type">
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((type) => (
            <ToggleChip
              key={type}
              selected={!!state.propertyType?.includes(type)}
              onClick={() => onChange({ propertyType: toggle(state.propertyType, type) })}
            >
              {PROPERTY_TYPE_LABELS[type]}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Furnishing">
        <div className="flex flex-wrap gap-2">
          {FURNISHINGS.map((f) => (
            <ToggleChip
              key={f}
              selected={!!state.furnishing?.includes(f)}
              onClick={() => onChange({ furnishing: toggle(state.furnishing, f) })}
            >
              {FURNISHING_LABELS[f]}
            </ToggleChip>
          ))}
        </div>
      </Section>

      <Section title="Preferred tenants" htmlFor="filter-tenant">
        <Select
          id="filter-tenant"
          value={state.tenantPreference ?? ""}
          placeholder="Any"
          options={toOptions(TENANT_PREFERENCES, TENANT_PREFERENCE_LABELS)}
          onChange={(e) =>
            onChange({ tenantPreference: (e.target.value || undefined) as SearchState["tenantPreference"] })
          }
        />
      </Section>

      <Section title="Amenities">
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((amenity) => {
            const Icon = AMENITY_ICONS[amenity];
            return (
              <ToggleChip
                key={amenity}
                selected={!!state.amenities?.includes(amenity)}
                onClick={() => onChange({ amenities: toggle(state.amenities, amenity) })}
              >
                <Icon aria-hidden /> {AMENITY_LABELS[amenity]}
              </ToggleChip>
            );
          })}
        </div>
      </Section>

      <Section title="Available before" htmlFor="filter-available">
        <Input
          id="filter-available"
          type="date"
          value={state.availableBefore ?? ""}
          onChange={(e) => onChange({ availableBefore: e.target.value || undefined })}
        />
      </Section>
    </div>
  );
}
