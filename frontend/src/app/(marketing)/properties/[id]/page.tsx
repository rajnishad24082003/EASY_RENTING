import type { Metadata } from "next";
import { apiBaseUrl } from "@/lib/api/client";
import type { PropertyDetailDto } from "@/lib/api/types";
import { bhkLabel, formatINR } from "@/lib/format";
import { PropertyDetailView } from "@/features/properties/components/property-detail-view";

/** Public listing data for SEO; non-public listings (404 for anonymous callers) fall back to a generic title. */
async function fetchPublicProperty(id: string): Promise<PropertyDetailDto | null> {
  try {
    const res = await fetch(`${apiBaseUrl()}/properties/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok ? ((await res.json()) as PropertyDetailDto) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchPublicProperty(id);
  if (!property) return { title: "Rental listing" };
  const description = `${bhkLabel(property.bhk, property.propertyType)} for rent in ${property.locality}, ${property.city} at ${formatINR(property.rent)}/month. Zero brokerage — contact the verified owner directly.`;
  const cover = property.images.find((image) => image.cover) ?? property.images[0];
  return {
    title: property.title,
    description,
    openGraph: {
      title: property.title,
      description,
      images: cover && cover.url.startsWith("http") ? [cover.url] : undefined,
    },
  };
}

export default async function PropertyPage({ params }: PageProps<"/properties/[id]">) {
  const { id } = await params;
  return <PropertyDetailView id={id} />;
}
