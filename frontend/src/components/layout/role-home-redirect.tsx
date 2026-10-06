"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageSpinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/use-auth";
import { homeForRole } from "@/lib/navigation";

/** Sends signed-in users to the landing page for their role. */
export function RoleHomeRedirect() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    router.replace(user.role === "TENANT" ? "/dashboard/visits" : homeForRole(user.role));
  }, [user, router]);
  return <PageSpinner />;
}
