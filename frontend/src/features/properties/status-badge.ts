import type { BadgeVariant } from "@/components/ui/badge";
import type { PropertyStatus } from "@/lib/api/types";

export const PROPERTY_STATUS_BADGE: Record<PropertyStatus, BadgeVariant> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  RENTED: "info",
  INACTIVE: "warning",
};
