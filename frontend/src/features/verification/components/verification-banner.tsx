"use client";

import { Clock, ShieldAlert, XCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";

/** Shown across the owner dashboard until the owner is VERIFIED (their listings are hidden until then). */
export function VerificationBanner() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user || user.role !== "OWNER" || user.verificationStatus === "VERIFIED") return null;

  const status = user.verificationStatus;
  const config = {
    UNVERIFIED: {
      icon: ShieldAlert,
      tone: "border-amber-200 bg-amber-50 text-amber-900",
      title: "Verify your identity to publish listings",
      body: "Your listings stay hidden from tenants until our team verifies your ID. It only takes a couple of minutes.",
      cta: "Start verification",
    },
    PENDING: {
      icon: Clock,
      tone: "border-sky-200 bg-sky-50 text-sky-900",
      title: "Verification under review",
      body: "We're reviewing your documents. Your listings will go live automatically once you're verified.",
      cta: "View status",
    },
    REJECTED: {
      icon: XCircle,
      tone: "border-red-200 bg-red-50 text-red-900",
      title: "Verification was not approved",
      body: "Your listings are hidden. Review the reason, update your documents and resubmit.",
      cta: "Fix and resubmit",
    },
  }[status];
  const Icon = config.icon;

  return (
    <div
      role="status"
      className={cn("mb-6 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", config.tone)}
    >
      <Icon className="size-6 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">{config.title}</p>
        <p className="text-sm opacity-90">{config.body}</p>
      </div>
      {pathname !== "/dashboard/verification" && (
        <Link href="/dashboard/verification" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          {config.cta}
        </Link>
      )}
    </div>
  );
}
