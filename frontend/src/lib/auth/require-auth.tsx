"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import type { Role } from "@/lib/api/types";
import { loginHref } from "@/lib/navigation";
import { useAuth } from "./use-auth";

interface RequireAuthProps {
  roles?: Role[];
  children: ReactNode;
}

/** Client-side route guard: redirects anonymous users to /login?next=… and blocks wrong roles. */
export function RequireAuth({ roles, children }: RequireAuthProps) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "anonymous") {
      const query = searchParams.toString();
      router.replace(loginHref(query ? `${pathname}?${query}` : pathname));
    }
  }, [status, router, pathname, searchParams]);

  if (status !== "authenticated" || !user) return <PageSpinner />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this page"
          description="This area is only available to a different type of account."
          action={
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Go home
            </Link>
          }
        />
      </div>
    );
  }

  return children;
}
