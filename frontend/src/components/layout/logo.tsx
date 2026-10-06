import { House } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold tracking-tight text-zinc-900", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <House className="size-[18px]" aria-hidden />
      </span>
      <span className="text-lg">
        Easy<span className="text-brand-600">Renting</span>
      </span>
    </Link>
  );
}
