import { BadgeCheck, Bath, MapPin, Maximize2, Sofa } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import type { PropertySummaryDto } from "@/lib/api/types";
import { bhkLabel, formatArea, formatDistance, formatINR } from "@/lib/format";
import { FURNISHING_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  property: PropertySummaryDto;
  /** Rendered over the image's top-right corner (e.g. a shortlist button). */
  action?: ReactNode;
  highlighted?: boolean;
  onHover?: (id: string | null) => void;
  className?: string;
  priority?: boolean;
}

export function ListingCard({ property, action, highlighted, onHover, className, priority }: ListingCardProps) {
  const title = `${bhkLabel(property.bhk, property.propertyType)} ${PROPERTY_TYPE_LABELS[property.propertyType]} in ${property.locality}`;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-(--radius-card) border bg-white transition-shadow hover:shadow-(--shadow-card)",
        highlighted ? "border-brand-400 shadow-(--shadow-card)" : "border-zinc-200",
        className,
      )}
      onMouseEnter={onHover ? () => onHover(property.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <PropertyImage
          src={property.coverImageUrl}
          alt={property.title}
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
          priority={priority}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {property.ownerVerified && (
            <Badge variant="dark">
              <BadgeCheck aria-hidden /> Verified owner
            </Badge>
          )}
          {property.distanceKm !== null && <Badge variant="dark">{formatDistance(property.distanceKm)}</Badge>}
        </div>
        {action && <div className="absolute top-3 right-3 z-10">{action}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-semibold text-zinc-900">
            {formatINR(property.rent)}
            <span className="text-sm font-normal text-zinc-500">/month</span>
          </p>
          <span className="text-xs text-zinc-500">Deposit {formatINR(property.deposit)}</span>
        </div>
        <h3 className="line-clamp-1 font-medium text-zinc-900">
          <Link href={`/properties/${property.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {title}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-sm text-zinc-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-1">
            {property.locality}, {property.city}
          </span>
        </p>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
          <li className="flex items-center gap-1">
            <Maximize2 className="size-3.5" aria-hidden /> {formatArea(property.areaSqft)}
          </li>
          <li className="flex items-center gap-1">
            <Bath className="size-3.5" aria-hidden /> {property.bathrooms} bath
          </li>
          <li className="flex items-center gap-1">
            <Sofa className="size-3.5" aria-hidden /> {FURNISHING_LABELS[property.furnishing]}
          </li>
        </ul>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-zinc-200">
      <div className="aspect-[4/3] animate-pulse bg-zinc-200/70" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-200/70" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200/70" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200/70" />
      </div>
    </div>
  );
}
