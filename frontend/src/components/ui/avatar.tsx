"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-800 select-none",
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" />}
      <AvatarPrimitive.Fallback delayMs={src ? 300 : 0}>{initials(name) || "?"}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
