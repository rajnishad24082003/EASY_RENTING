"use client";

import { Crosshair } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { ToggleChip } from "@/components/ui/chip";
import { fieldA11y, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, toOptions } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AMENITIES, FURNISHINGS, PROPERTY_TYPES, TENANT_PREFERENCES } from "@/lib/api/types";
import { findCity } from "@/lib/constants";
import { AMENITY_LABELS, FURNISHING_LABELS, PROPERTY_TYPE_LABELS, TENANT_PREFERENCE_LABELS } from "@/lib/labels";
import { AMENITY_ICONS } from "@/features/properties/components/amenity-icon";
import { LocalityAutocomplete } from "@/features/search/components/locality-autocomplete";
import { toOptionalNumber, type ListingValues } from "../schema";

const LocationPicker = dynamic(() => import("@/components/map/location-picker"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const FACINGS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];

export interface StepProps {
  register: UseFormRegister<ListingValues>;
  control: Control<ListingValues>;
  errors: FieldErrors<ListingValues>;
  setValue: UseFormSetValue<ListingValues>;
}

const num = { setValueAs: toOptionalNumber };

export function BasicsStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField
        label="Listing title"
        htmlFor="title"
        error={errors.title?.message}
        required
        className="sm:col-span-2"
        hint="e.g. Sunny 2 BHK near Sony Signal with balcony"
      >
        <Input {...fieldA11y("title", errors.title?.message)} maxLength={120} {...register("title")} />
      </FormField>
      <FormField
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
        required
        className="sm:col-span-2"
        hint="At least 30 characters. Mention nearby landmarks, water supply, parking rules…"
      >
        <Textarea
          rows={6}
          maxLength={5000}
          {...fieldA11y("description", errors.description?.message)}
          {...register("description")}
        />
      </FormField>
      <FormField label="Property type" htmlFor="propertyType" error={errors.propertyType?.message} required>
        <Select
          options={toOptions(PROPERTY_TYPES, PROPERTY_TYPE_LABELS)}
          {...fieldA11y("propertyType", errors.propertyType?.message)}
          {...register("propertyType")}
        />
      </FormField>
      <FormField label="BHK" htmlFor="bhk" error={errors.bhk?.message} required hint="Use 0 for a studio / 1 RK">
        <Input
          type="number"
          min={0}
          max={10}
          inputMode="numeric"
          {...fieldA11y("bhk", errors.bhk?.message)}
          {...register("bhk", num)}
        />
      </FormField>
      <FormField label="Bathrooms" htmlFor="bathrooms" error={errors.bathrooms?.message} required>
        <Input
          type="number"
          min={1}
          max={10}
          inputMode="numeric"
          {...fieldA11y("bathrooms", errors.bathrooms?.message)}
          {...register("bathrooms", num)}
        />
      </FormField>
      <FormField label="Built-up area (sq.ft)" htmlFor="areaSqft" error={errors.areaSqft?.message} required>
        <Input
          type="number"
          min={100}
          max={20000}
          inputMode="numeric"
          {...fieldA11y("areaSqft", errors.areaSqft?.message)}
          {...register("areaSqft", num)}
        />
      </FormField>
    </div>
  );
}

export function LocationStep({ register, control, errors, setValue }: StepProps) {
  const [latitude, longitude, locality] = useWatch({ control, name: ["latitude", "longitude", "locality"] });
  const [localityText, setLocalityText] = useState(locality ?? "");
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const position = latitude !== undefined && longitude !== undefined ? { lat: latitude, lng: longitude } : null;
  const opts = { shouldValidate: true, shouldDirty: true } as const;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <FormField
          label="Locality"
          htmlFor="locality"
          error={errors.locality?.message}
          required
          hint="Pick a suggestion to centre the map"
        >
          <LocalityAutocomplete
            id="locality"
            value={localityText}
            aria-invalid={!!errors.locality}
            onValueChange={(text) => {
              setLocalityText(text);
              setValue("locality", text, opts);
            }}
            onSelect={(l) => {
              setLocalityText(l.name);
              setValue("locality", l.name, opts);
              setValue("city", l.city, opts);
              const city = findCity(l.city);
              if (city) setValue("state", city.state, opts);
              setValue("latitude", l.latitude, opts);
              setValue("longitude", l.longitude, opts);
              setFocus({ lat: l.latitude, lng: l.longitude, zoom: 15 });
            }}
          />
        </FormField>
        <FormField label="Street address" htmlFor="addressLine" error={errors.addressLine?.message} required>
          <Input
            autoComplete="street-address"
            {...fieldA11y("addressLine", errors.addressLine?.message)}
            {...register("addressLine")}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="City" htmlFor="city" error={errors.city?.message} required>
            <Input autoComplete="address-level2" {...fieldA11y("city", errors.city?.message)} {...register("city")} />
          </FormField>
          <FormField label="State" htmlFor="state" error={errors.state?.message} required>
            <Input
              autoComplete="address-level1"
              {...fieldA11y("state", errors.state?.message)}
              {...register("state")}
            />
          </FormField>
        </div>
        <FormField label="Pincode" htmlFor="pincode" error={errors.pincode?.message} required>
          <Input
            inputMode="numeric"
            maxLength={6}
            autoComplete="postal-code"
            {...fieldA11y("pincode", errors.pincode?.message)}
            {...register("pincode")}
          />
        </FormField>
      </div>
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
          <Crosshair className="size-4" aria-hidden /> Pin the exact location
        </p>
        <div className="h-80 overflow-hidden rounded-2xl border border-zinc-200 lg:h-[26rem]">
          <LocationPicker
            value={position}
            focus={focus}
            onChange={({ lat, lng }) => {
              setValue("latitude", lat, opts);
              setValue("longitude", lng, opts);
            }}
          />
        </div>
        <p
          className={errors.latitude || errors.longitude ? "text-xs text-red-600" : "text-xs text-zinc-500"}
          role={errors.latitude ? "alert" : undefined}
        >
          {errors.latitude?.message ??
            errors.longitude?.message ??
            (position
              ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} — drag the pin to adjust`
              : "Click on the map to drop a pin")}
        </p>
      </div>
    </div>
  );
}

export function DetailsStep({ register, control, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField label="Furnishing" htmlFor="furnishing" error={errors.furnishing?.message} required>
        <Select
          options={toOptions(FURNISHINGS, FURNISHING_LABELS)}
          {...fieldA11y("furnishing", errors.furnishing?.message)}
          {...register("furnishing")}
        />
      </FormField>
      <FormField label="Preferred tenants" htmlFor="tenantPreference" error={errors.tenantPreference?.message} required>
        <Select
          options={toOptions(TENANT_PREFERENCES, TENANT_PREFERENCE_LABELS)}
          {...fieldA11y("tenantPreference", errors.tenantPreference?.message)}
          {...register("tenantPreference")}
        />
      </FormField>
      <FormField label="Available from" htmlFor="availableFrom" error={errors.availableFrom?.message} required>
        <Input
          type="date"
          {...fieldA11y("availableFrom", errors.availableFrom?.message)}
          {...register("availableFrom")}
        />
      </FormField>
      <FormField label="Facing" htmlFor="facing" error={errors.facing?.message}>
        <Select
          placeholder="Not specified"
          options={FACINGS.map((f) => ({ value: f, label: f }))}
          {...fieldA11y("facing", errors.facing?.message)}
          {...register("facing", { setValueAs: (v: string) => v || undefined })}
        />
      </FormField>
      <FormField label="Floor" htmlFor="floor" error={errors.floor?.message} hint="0 for ground floor">
        <Input
          type="number"
          inputMode="numeric"
          {...fieldA11y("floor", errors.floor?.message)}
          {...register("floor", num)}
        />
      </FormField>
      <FormField label="Total floors" htmlFor="totalFloors" error={errors.totalFloors?.message}>
        <Input
          type="number"
          min={1}
          inputMode="numeric"
          {...fieldA11y("totalFloors", errors.totalFloors?.message)}
          {...register("totalFloors", num)}
        />
      </FormField>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-zinc-800">Amenities</legend>
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((amenity) => {
                const Icon = AMENITY_ICONS[amenity];
                const selected = field.value.includes(amenity);
                return (
                  <ToggleChip
                    key={amenity}
                    selected={selected}
                    onClick={() =>
                      field.onChange(selected ? field.value.filter((a) => a !== amenity) : [...field.value, amenity])
                    }
                  >
                    <Icon aria-hidden /> {AMENITY_LABELS[amenity]}
                  </ToggleChip>
                );
              })}
            </div>
          )}
        />
      </fieldset>
    </div>
  );
}

export function PricingStep({ register, errors }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <FormField label="Monthly rent (₹)" htmlFor="rent" error={errors.rent?.message} required>
        <Input
          type="number"
          min={1000}
          step={500}
          inputMode="numeric"
          {...fieldA11y("rent", errors.rent?.message)}
          {...register("rent", num)}
        />
      </FormField>
      <FormField label="Security deposit (₹)" htmlFor="deposit" error={errors.deposit?.message} required>
        <Input
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          {...fieldA11y("deposit", errors.deposit?.message)}
          {...register("deposit", num)}
        />
      </FormField>
      <FormField
        label="Maintenance / month (₹)"
        htmlFor="maintenance"
        error={errors.maintenance?.message}
        required
        hint="0 if included in rent"
      >
        <Input
          type="number"
          min={0}
          step={100}
          inputMode="numeric"
          {...fieldA11y("maintenance", errors.maintenance?.message)}
          {...register("maintenance", num)}
        />
      </FormField>
    </div>
  );
}
