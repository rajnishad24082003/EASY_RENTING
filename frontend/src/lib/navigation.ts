import type { Role } from "@/lib/api/types";

/** Only allow same-origin relative paths as post-login redirect targets. */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export function homeForRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "OWNER":
      return "/dashboard/listings";
    default:
      return "/search";
  }
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
