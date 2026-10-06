import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from "date-fns";
import type { PropertyType } from "@/lib/api/types";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** `25000` → `₹25,000`; `1000000` → `₹10,00,000` (Indian digit grouping). */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

function trimDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/** Compact Indian notation: `₹950`, `₹25K`, `₹1.2L`, `₹3.5Cr`. */
export function formatINRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${trimDecimal(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${trimDecimal(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trimDecimal(abs / 1_000)}K`;
  return `${sign}₹${abs}`;
}

/** `0` → "1 RK" (or "Studio" for studio properties); otherwise "2 BHK". */
export function bhkLabel(bhk: number, propertyType?: PropertyType): string {
  if (bhk === 0) return propertyType === "STUDIO" ? "Studio" : "1 RK";
  return `${bhk} BHK`;
}

export function formatArea(sqft: number): string {
  return `${new Intl.NumberFormat("en-IN").format(sqft)} sq.ft`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${trimDecimal(km)} km away`;
}

const toDate = (value: string | Date) => (typeof value === "string" ? parseISO(value) : value);

export function formatDate(value: string | Date): string {
  return format(toDate(value), "d MMM yyyy");
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "EEE, d MMM yyyy · h:mm a");
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), "h:mm a");
}

export function formatRelative(value: string | Date): string {
  return formatDistanceToNowStrict(toDate(value), { addSuffix: true });
}

/** Label for chat day separators: "Today", "Yesterday" or "12 Mar 2026". */
export function formatDayLabel(value: string | Date): string {
  const date = toDate(value);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM yyyy");
}

/** Short timestamp for conversation lists: time today, weekday/date otherwise. */
export function formatShortTimestamp(value: string | Date): string {
  const date = toDate(value);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "d MMM");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
