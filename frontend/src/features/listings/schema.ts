import { z } from "zod";
import {
  AMENITIES,
  FURNISHINGS,
  PROPERTY_TYPES,
  TENANT_PREFERENCES,
  type PropertyDetailDto,
  type PropertyRequest,
} from "@/lib/api/types";

function wholeNumber(label: string, min: number, max: number) {
  return z
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min.toLocaleString("en-IN")}`)
    .max(max, `${label} must be at most ${max.toLocaleString("en-IN")}`);
}

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/** Mirrors `PropertyRequest` validation from the API contract. */
export const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(10, "Title must be at least 10 characters")
      .max(120, "Title must be at most 120 characters"),
    description: z
      .string()
      .trim()
      .min(30, "Description must be at least 30 characters")
      .max(5000, "Description must be at most 5000 characters"),
    propertyType: z.enum(PROPERTY_TYPES),
    bhk: wholeNumber("BHK", 0, 10),
    bathrooms: wholeNumber("Bathrooms", 1, 10),
    areaSqft: wholeNumber("Area", 100, 20_000),
    furnishing: z.enum(FURNISHINGS),
    tenantPreference: z.enum(TENANT_PREFERENCES),
    rent: wholeNumber("Rent", 1_000, 10_000_000),
    deposit: wholeNumber("Deposit", 0, 1_000_000_000),
    maintenance: wholeNumber("Maintenance", 0, 10_000_000),
    availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an availability date"),
    floor: z.number().int("Floor must be a whole number").min(-5).max(200).optional(),
    totalFloors: z.number().int("Total floors must be a whole number").min(1).max(200).optional(),
    facing: z.string().trim().max(40, "Too long").optional(),
    addressLine: requiredText("Address"),
    locality: requiredText("Locality", 120),
    city: requiredText("City", 80),
    state: requiredText("State", 80),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    latitude: z.number({ error: "Pick the location on the map" }).min(-90).max(90),
    longitude: z.number({ error: "Pick the location on the map" }).min(-180).max(180),
    amenities: z.array(z.enum(AMENITIES)),
  })
  .refine((v) => v.floor === undefined || v.totalFloors === undefined || v.floor <= v.totalFloors, {
    path: ["floor"],
    message: "Floor can't be higher than total floors",
  });

export type ListingValues = z.infer<typeof listingSchema>;
export type ListingField = keyof ListingValues;

export const STEP_FIELDS = {
  basics: ["title", "description", "propertyType", "bhk", "bathrooms", "areaSqft"],
  location: ["addressLine", "locality", "city", "state", "pincode", "latitude", "longitude"],
  details: ["furnishing", "tenantPreference", "availableFrom", "floor", "totalFloors", "facing", "amenities"],
  pricing: ["rent", "deposit", "maintenance"],
} as const satisfies Record<string, readonly ListingField[]>;

export const ALL_FIELDS = Object.values(STEP_FIELDS).flat() as ListingField[];

/** `setValueAs` for numeric inputs: empty → undefined so optional fields stay optional. */
export const toOptionalNumber = (value: unknown): number | undefined =>
  value === "" || value === null || value === undefined ? undefined : Number(value);

export function emptyListingValues(): Partial<ListingValues> {
  return {
    propertyType: "APARTMENT",
    furnishing: "SEMI_FURNISHED",
    tenantPreference: "ANY",
    bathrooms: 1,
    maintenance: 0,
    amenities: [],
    availableFrom: new Date().toISOString().slice(0, 10),
  };
}

export function valuesFromProperty(p: PropertyDetailDto): ListingValues {
  return {
    title: p.title,
    description: p.description,
    propertyType: p.propertyType,
    bhk: p.bhk,
    bathrooms: p.bathrooms,
    areaSqft: p.areaSqft,
    furnishing: p.furnishing,
    tenantPreference: p.tenantPreference,
    rent: p.rent,
    deposit: p.deposit,
    maintenance: p.maintenance,
    availableFrom: p.availableFrom,
    floor: p.floor ?? undefined,
    totalFloors: p.totalFloors ?? undefined,
    facing: p.facing ?? undefined,
    addressLine: p.addressLine,
    locality: p.locality,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    latitude: p.latitude,
    longitude: p.longitude,
    amenities: p.amenities,
  };
}

export function toPropertyRequest(values: ListingValues, status?: PropertyRequest["status"]): PropertyRequest {
  return { ...values, facing: values.facing || undefined, status };
}
