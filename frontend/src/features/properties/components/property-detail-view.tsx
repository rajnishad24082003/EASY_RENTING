"use client";

import {
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Compass,
  Layers,
  MapPin,
  Maximize2,
  Sofa,
  Users,
  HomeIcon,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api/errors";
import type { PropertyDetailDto } from "@/lib/api/types";
import { bhkLabel, formatArea, formatDate } from "@/lib/format";
import {
  AMENITY_LABELS,
  FURNISHING_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TENANT_PREFERENCE_LABELS,
} from "@/lib/labels";
import { useProperty } from "../hooks";
import { AMENITY_ICONS } from "./amenity-icon";
import { PropertyActionPanel } from "./property-action-panel";
import { PropertyGallery } from "./property-gallery";

const LocationMap = dynamic(() => import("@/components/map/location-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-zinc-500" aria-hidden />
      <div>
        <dt className="text-xs text-zinc-500">{label}</dt>
        <dd className="text-sm font-medium text-zinc-900">{value}</dd>
      </div>
    </div>
  );
}

function floorLabel(p: PropertyDetailDto): string | null {
  if (p.floor === null || p.floor === undefined) return null;
  const floor = p.floor === 0 ? "Ground" : `${p.floor}`;
  return p.totalFloors ? `${floor} of ${p.totalFloors}` : floor;
}

export function PropertyDetailView({ id }: { id: string }) {
  const { data: property, isPending, isError, error, refetch } = useProperty(id);

  if (isPending) return <DetailSkeleton />;
  if (isError) {
    if (isApiError(error) && error.status === 404) {
      return (
        <div className="mx-auto w-full max-w-lg px-4 py-20">
          <EmptyState
            icon={HomeIcon}
            title="This listing isn't available"
            description="It may have been rented out, taken down, or is awaiting owner verification."
            action={
              <Link href="/search" className={buttonVariants({ size: "sm" })}>
                Browse other homes
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-20">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const facts: { icon: LucideIcon; label: string; value: string | null }[] = [
    { icon: BedDouble, label: "Configuration", value: bhkLabel(property.bhk, property.propertyType) },
    { icon: Bath, label: "Bathrooms", value: String(property.bathrooms) },
    { icon: Maximize2, label: "Built-up area", value: formatArea(property.areaSqft) },
    { icon: Sofa, label: "Furnishing", value: FURNISHING_LABELS[property.furnishing] },
    { icon: Users, label: "Preferred tenants", value: TENANT_PREFERENCE_LABELS[property.tenantPreference] },
    { icon: CalendarDays, label: "Available from", value: formatDate(property.availableFrom) },
    { icon: Layers, label: "Floor", value: floorLabel(property) },
    { icon: Compass, label: "Facing", value: property.facing },
    { icon: Building2, label: "Property type", value: PROPERTY_TYPE_LABELS[property.propertyType] },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/search" className="hover:text-zinc-900">
          Search
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/search?city=${encodeURIComponent(property.city)}`} className="hover:text-zinc-900">
          {property.city}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-700">{property.locality}</span>
      </nav>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{property.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-zinc-600">
            <MapPin className="size-4" aria-hidden /> {property.addressLine}, {property.locality}, {property.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {property.ownerVerified && (
            <Badge variant="success">
              <BadgeCheck aria-hidden /> Verified owner
            </Badge>
          )}
          {property.status !== "ACTIVE" && <Badge variant="warning">{PROPERTY_STATUS_LABELS[property.status]}</Badge>}
        </div>
      </div>

      <PropertyGallery images={property.images} title={property.title} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="mb-4 text-lg font-semibold">
              Key facts
            </h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {facts
                .filter((f): f is { icon: LucideIcon; label: string; value: string } => !!f.value)
                .map((fact) => (
                  <Fact key={fact.label} {...fact} />
                ))}
            </dl>
          </section>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="mb-3 text-lg font-semibold">
              About this home
            </h2>
            <p className="leading-relaxed whitespace-pre-line text-zinc-700">{property.description}</p>
          </section>

          {property.amenities.length > 0 && (
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="mb-4 text-lg font-semibold">
                Amenities
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.amenities.map((amenity) => {
                  const Icon = AMENITY_ICONS[amenity];
                  return (
                    <li key={amenity} className="flex items-center gap-2.5 text-sm text-zinc-700">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {AMENITY_LABELS[amenity]}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="location-heading">
            <h2 id="location-heading" className="mb-1 text-lg font-semibold">
              Location
            </h2>
            <p className="mb-4 text-sm text-zinc-500">
              {property.locality}, {property.city}, {property.state} {property.pincode}
            </p>
            <div className="h-72 overflow-hidden rounded-2xl border border-zinc-200">
              <LocationMap latitude={property.latitude} longitude={property.longitude} />
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <PropertyActionPanel property={property} />
          <Card className="flex items-center gap-3 p-4">
            <Avatar name={property.owner.name} className="size-11" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium">
                {property.owner.name}
                {property.owner.verified && <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" />}
              </p>
              <p className="text-xs text-zinc-500">Owner · Member since {formatDate(property.owner.memberSince)}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-64 w-full rounded-2xl sm:h-[26rem]" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
