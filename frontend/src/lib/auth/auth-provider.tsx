"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type ReactNode } from "react";
import { refreshSession } from "@/lib/api/client";
import { sessionStore } from "./session-store";
import { useSession } from "./use-auth";

const REFRESH_LEAD_MS = 60_000;

/**
 * Restores the session from the refresh cookie on boot, refreshes the access token shortly before it
 * expires, and resets cached server state whenever the signed-in identity changes.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { status, user, expiresAt } = useSession();

  useEffect(() => {
    if (sessionStore.getState().status === "loading") void refreshSession();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const delay = Math.max(expiresAt - Date.now() - REFRESH_LEAD_MS, 5_000);
    const timer = window.setTimeout(() => void refreshSession(), delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const userId = user?.id ?? null;
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (status === "loading") return;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      void queryClient.resetQueries();
    }
    previousUserId.current = userId;
  }, [status, userId, queryClient]);

  return children;
}
