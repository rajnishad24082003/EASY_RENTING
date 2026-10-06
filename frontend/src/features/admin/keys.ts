import type { PropertyStatus, Role, VerificationStatus } from "@/lib/api/types";

export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  verifications: (status: VerificationStatus, page: number) =>
    [...adminKeys.all, "verifications", status, page] as const,
  users: (q: string, role: Role | undefined, page: number) => [...adminKeys.all, "users", { q, role, page }] as const,
  properties: (q: string, status: PropertyStatus | undefined, page: number) =>
    [...adminKeys.all, "properties", { q, status, page }] as const,
};
