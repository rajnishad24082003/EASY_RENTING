import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { VisitStatus } from "@/lib/api/types";
import { VISIT_STATUS_LABELS } from "@/lib/labels";

const VARIANTS: Record<VisitStatus, BadgeVariant> = {
  REQUESTED: "warning",
  CONFIRMED: "success",
  RESCHEDULE_PROPOSED: "info",
  REJECTED: "danger",
  CANCELLED: "neutral",
  COMPLETED: "brand",
};

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  return <Badge variant={VARIANTS[status]}>{VISIT_STATUS_LABELS[status]}</Badge>;
}
