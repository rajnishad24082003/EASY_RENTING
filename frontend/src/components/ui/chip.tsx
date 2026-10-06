import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Toggleable pill used for multi-select filters. */
export function ToggleChip({
  selected,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors [&_svg]:size-4",
        selected
          ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400",
        className,
      )}
      {...props}
    />
  );
}

/** Pill with a remove button, for active filters. */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-zinc-900 pr-1 pl-3 text-xs font-medium text-white">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="rounded-full p-0.5 hover:bg-white/20"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}
