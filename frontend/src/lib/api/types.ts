// DTOs and enums mirroring docs/API.md (v1). Keep in sync with the contract.

export const ROLES = ["TENANT", "OWNER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = ["APARTMENT", "INDEPENDENT_HOUSE", "VILLA", "PG", "STUDIO"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const FURNISHINGS = ["UNFURNISHED", "SEMI_FURNISHED", "FULLY_FURNISHED"] as const;
export type Furnishing = (typeof FURNISHINGS)[number];

export const TENANT_PREFERENCES = ["ANY", "FAMILY", "BACHELOR_MALE", "BACHELOR_FEMALE", "COMPANY"] as const;
export type TenantPreference = (typeof TENANT_PREFERENCES)[number];

export const PROPERTY_STATUSES = ["DRAFT", "ACTIVE", "RENTED", "INACTIVE"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const AMENITIES = [
  "PARKING",
  "LIFT",
  "POWER_BACKUP",
  "GYM",
  "SWIMMING_POOL",
  "SECURITY",
  "WIFI",
  "AC",
  "GAS_PIPELINE",
  "CLUB_HOUSE",
  "PLAY_AREA",
  "PET_FRIENDLY",
  "WASHING_MACHINE",
  "FRIDGE",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const VERIFICATION_STATUSES = ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_TYPES = ["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE", "PROPERTY_PROOF"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export const IDENTITY_DOCUMENT_TYPES: readonly DocumentType[] = ["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE"];

export const VISIT_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "RESCHEDULE_PROPOSED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const SORT_OPTIONS = ["RELEVANCE", "DISTANCE", "RENT_ASC", "RENT_DESC", "NEWEST"] as const;
export type SortBy = (typeof SORT_OPTIONS)[number];

export const NOTIFICATION_TYPES = [
  "VISIT_REQUESTED",
  "VISIT_CONFIRMED",
  "VISIT_REJECTED",
  "VISIT_RESCHEDULED",
  "VISIT_CANCELLED",
  "VISIT_COMPLETED",
  "VERIFICATION_APPROVED",
  "VERIFICATION_REJECTED",
  "NEW_MESSAGE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "BAD_REQUEST",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** ISO-8601 UTC timestamp. */
export type Instant = string;
/** `YYYY-MM-DD`. */
export type LocalDate = string;
export type Uuid = string;

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  size?: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: ErrorCode | string;
  errors?: FieldError[];
}

// ---- Auth / users ----

export interface UserDto {
  id: Uuid;
  name: string;
  email: string;
  phone: string;
  role: Role;
  verificationStatus: VerificationStatus;
  avatarUrl: string | null;
  createdAt: Instant;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Extract<Role, "TENANT" | "OWNER">;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

// ---- Properties ----

export interface PropertyRequest {
  title: string;
  description: string;
  propertyType: PropertyType;
  bhk: number;
  bathrooms: number;
  areaSqft: number;
  furnishing: Furnishing;
  tenantPreference: TenantPreference;
  rent: number;
  deposit: number;
  maintenance: number;
  availableFrom: LocalDate;
  floor?: number;
  totalFloors?: number;
  facing?: string;
  addressLine: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  amenities: Amenity[];
  status?: Extract<PropertyStatus, "DRAFT" | "ACTIVE">;
}

export interface PropertyImageDto {
  id: Uuid;
  url: string;
  cover: boolean;
  sortOrder: number;
}

export interface OwnerSummaryDto {
  id: Uuid;
  name: string;
  verified: boolean;
  memberSince: Instant;
}

export interface PropertySummaryDto {
  id: Uuid;
  title: string;
  propertyType: PropertyType;
  bhk: number;
  bathrooms: number;
  areaSqft: number;
  furnishing: Furnishing;
  tenantPreference: TenantPreference;
  rent: number;
  deposit: number;
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  coverImageUrl: string | null;
  amenities: Amenity[];
  status: PropertyStatus;
  availableFrom: LocalDate;
  createdAt: Instant;
  distanceKm: number | null;
  ownerVerified: boolean;
  shortlisted: boolean;
}

export interface PropertyDetailDto extends PropertySummaryDto {
  description: string;
  maintenance: number;
  floor: number | null;
  totalFloors: number | null;
  facing: string | null;
  addressLine: string;
  state: string;
  pincode: string;
  images: PropertyImageDto[];
  owner: OwnerSummaryDto;
  viewCount: number;
  updatedAt: Instant;
}

// ---- Search ----

export interface SearchFilters {
  city?: string;
  locality?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minRent?: number;
  maxRent?: number;
  bhk?: number[];
  propertyType?: PropertyType[];
  furnishing?: Furnishing[];
  tenantPreference?: TenantPreference;
  amenities?: Amenity[];
  availableBefore?: LocalDate;
  keywords?: string;
  sort?: SortBy;
}

export interface MapPinDto {
  id: Uuid;
  latitude: number;
  longitude: number;
  rent: number;
  bhk: number;
  title: string;
}

export interface AiSearchRequest {
  query: string;
  lat?: number;
  lng?: number;
}

export type AiParser = "AI" | "RULES";

export interface AiSearchResponse {
  filters: SearchFilters;
  explanation: string;
  parser: AiParser;
  results: Page<PropertySummaryDto>;
}

export interface LocalityDto {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

// ---- Visits ----

export interface VisitPartyDto {
  id: Uuid;
  name: string;
  phone: string | null;
}

export interface VisitPropertyDto {
  id: Uuid;
  title: string;
  locality: string;
  city: string;
  coverImageUrl: string | null;
}

export interface VisitDto {
  id: Uuid;
  property: VisitPropertyDto;
  tenant: VisitPartyDto;
  owner: VisitPartyDto;
  status: VisitStatus;
  scheduledAt: Instant;
  proposedAt: Instant | null;
  note: string | null;
  responseNote: string | null;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface CreateVisitRequest {
  propertyId: Uuid;
  scheduledAt: Instant;
  note?: string;
}

export interface VisitListParams extends PageParams {
  status?: VisitStatus[];
  upcoming?: boolean;
}

// ---- Chat ----

export interface MessageDto {
  id: Uuid;
  conversationId: Uuid;
  senderId: Uuid;
  content: string;
  createdAt: Instant;
  readAt: Instant | null;
}

export interface ConversationDto {
  id: Uuid;
  property: { id: Uuid; title: string; coverImageUrl: string | null; rent: number };
  counterpart: { id: Uuid; name: string; role: Role };
  lastMessage: MessageDto | null;
  unreadCount: number;
  createdAt: Instant;
}

export interface CountResponse {
  count: number;
}

export interface TypingEvent {
  conversationId: Uuid;
  userId: Uuid;
  typing: boolean;
}

export interface ReadReceiptEvent {
  conversationId: Uuid;
  readerId: Uuid;
  readAt: Instant;
}

export interface WsErrorEvent {
  code: string;
  message: string;
}

// ---- Notifications ----

export interface NotificationDto {
  id: Uuid;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: Instant;
}

// ---- Verification ----

export interface VerificationDocumentDto {
  id: Uuid;
  documentType: DocumentType;
  fileName: string;
  url: string;
  uploadedAt: Instant;
}

export interface VerificationDto {
  status: VerificationStatus;
  submittedAt: Instant | null;
  reviewedAt: Instant | null;
  rejectionReason: string | null;
  documents: VerificationDocumentDto[];
}

// ---- Admin ----

export interface AdminStatsDto {
  totalUsers: number;
  totalOwners: number;
  totalTenants: number;
  verifiedOwners: number;
  pendingVerifications: number;
  activeListings: number;
  totalListings: number;
  visitsThisWeek: number;
  messagesThisWeek: number;
}

export interface AdminVerificationDto {
  owner: UserDto;
  verification: VerificationDto;
  listingCount: number;
}

export interface AdminUserDto extends UserDto {
  suspended: boolean;
  listingCount: number;
}
