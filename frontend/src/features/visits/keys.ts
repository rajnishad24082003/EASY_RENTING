import type { VisitListParams } from "@/lib/api/types";

export const visitKeys = {
  all: ["visits"] as const,
  list: (params: VisitListParams) => [...visitKeys.all, "list", params] as const,
};
