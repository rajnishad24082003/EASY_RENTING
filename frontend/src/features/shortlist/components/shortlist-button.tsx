"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/use-auth";
import { loginHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useToggleShortlist } from "../hooks";

interface ShortlistButtonProps {
  propertyId: string;
  shortlisted: boolean;
  variant?: "overlay" | "inline";
  className?: string;
}

/** Heart toggle. Shown to tenants and anonymous visitors (who are sent to log in). */
export function ShortlistButton({ propertyId, shortlisted, variant = "overlay", className }: ShortlistButtonProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toggle = useToggleShortlist();

  if (status === "loading" || (user && user.role !== "TENANT")) return null;

  const onClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      toast("Log in as a tenant to shortlist homes.");
      router.push(loginHref(pathname));
      return;
    }
    toggle.mutate({ propertyId, shortlisted: !shortlisted });
  };

  const label = shortlisted ? "Remove from shortlist" : "Add to shortlist";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={shortlisted}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-transform active:scale-90",
        variant === "overlay"
          ? "size-9 rounded-full bg-white/90 shadow-sm backdrop-blur hover:bg-white"
          : "h-10 rounded-xl border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-50",
        className,
      )}
    >
      <Heart
        className={cn("size-[18px]", shortlisted ? "fill-brand-600 text-brand-600" : "text-zinc-700")}
        aria-hidden
      />
      {variant === "inline" && (shortlisted ? "Shortlisted" : "Shortlist")}
    </button>
  );
}
