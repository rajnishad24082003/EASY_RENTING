import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "danger";
}

export function EmptyState({ icon: Icon, title, description, action, className, tone = "neutral" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-zinc-300 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          tone === "danger" ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
        {description && <p className="mx-auto max-w-sm text-sm text-zinc-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
