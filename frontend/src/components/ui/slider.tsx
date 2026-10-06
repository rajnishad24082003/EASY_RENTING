"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  thumbLabels,
  ...props
}: ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { thumbLabels: string[] }) {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-5 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-zinc-200">
        <SliderPrimitive.Range className="absolute h-full bg-brand-600" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels[i]}
          className="block size-5 rounded-full border-2 border-brand-600 bg-white shadow focus-visible:ring-4 focus-visible:ring-brand-500/20 focus-visible:outline-none"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
