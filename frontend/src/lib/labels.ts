import type {
  Amenity,
  DocumentType,
  Furnishing,
  PropertyStatus,
  PropertyType,
  Role,
  SortBy,
  TenantPreference,
  VerificationStatus,
  VisitStatus,
} from "@/lib/api/types";

export const ROLE_LABELS: Record<Role, string> = { TENANT: "Tenant", OWNER: "Owner", ADMIN: "Admin" };

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Apartment",
  INDEPENDENT_HOUSE: "Independent house",
  VILLA: "Villa",
  PG: "PG / Co-living",
  STUDIO: "Studio",
};

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  UNFURNISHED: "Unfurnished",
  SEMI_FURNISHED: "Semi-furnished",
  FULLY_FURNISHED: "Fully furnished",
};

export const TENANT_PREFERENCE_LABELS: Record<TenantPreference, string> = {
  ANY: "Anyone",
  FAMILY: "Family",
  BACHELOR_MALE: "Bachelor (male)",
  BACHELOR_FEMALE: "Bachelor (female)",
  COMPANY: "Company lease",
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  RENTED: "Rented",
  INACTIVE: "Inactive",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  PARKING: "Parking",
  LIFT: "Lift",
  POWER_BACKUP: "Power backup",
  GYM: "Gym",
  SWIMMING_POOL: "Swimming pool",
  SECURITY: "24x7 security",
  WIFI: "Wi-Fi",
  AC: "Air conditioning",
  GAS_PIPELINE: "Gas pipeline",
  CLUB_HOUSE: "Club house",
  PLAY_AREA: "Play area",
  PET_FRIENDLY: "Pet friendly",
  WASHING_MACHINE: "Washing machine",
  FRIDGE: "Fridge",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Not verified",
  PENDING: "Under review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  AADHAAR: "Aadhaar card",
  PAN: "PAN card",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving licence",
  PROPERTY_PROOF: "Property proof",
};

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  RESCHEDULE_PROPOSED: "New time proposed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

export const SORT_LABELS: Record<SortBy, string> = {
  RELEVANCE: "Relevance",
  DISTANCE: "Distance",
  RENT_ASC: "Rent: low to high",
  RENT_DESC: "Rent: high to low",
  NEWEST: "Newest first",
};
