"use client";

import { useSyncExternalStore } from "react";
import type { Role } from "@/lib/api/types";
import { sessionStore, type SessionState } from "./session-store";

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState, sessionStore.getServerState);
}

export function useAuth() {
  const session = useSession();
  return {
    ...session,
    isAuthenticated: session.status === "authenticated",
    hasRole: (...roles: Role[]) => !!session.user && roles.includes(session.user.role),
  };
}
