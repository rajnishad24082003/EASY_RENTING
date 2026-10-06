"use client";

import { Client, ReconnectionTimeMode, type IMessage } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { chatKeys } from "@/features/chat/keys";
import { notificationKeys } from "@/features/notifications/keys";
import { refreshSession } from "@/lib/api/client";
import type { TypingEvent } from "@/lib/api/types";
import { sessionStore } from "@/lib/auth/session-store";
import { useSession } from "@/lib/auth/use-auth";
import { createRealtimeHandlers } from "./realtime-handlers";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws";
const TOKEN_MIN_VALIDITY_MS = 30_000;

type TypingListener = (event: TypingEvent) => void;

interface WsContextValue {
  connected: boolean;
  /** Publishes a JSON payload; returns false when not connected (callers should fall back to REST). */
  publish: (destination: string, body: unknown) => boolean;
  onTyping: (listener: TypingListener) => () => void;
}

const WsContext = createContext<WsContextValue | null>(null);

function parse<T>(message: IMessage): T | null {
  try {
    return JSON.parse(message.body) as T;
  } catch {
    return null;
  }
}

/** Fresh access token for (re)connecting, refreshing first if it's missing or about to expire. */
async function connectToken(): Promise<string | null> {
  const { accessToken, expiresAt } = sessionStore.getState();
  if (accessToken && expiresAt && expiresAt - Date.now() > TOKEN_MIN_VALIDITY_MS) return accessToken;
  const session = await refreshSession();
  return session?.accessToken ?? null;
}

/**
 * Maintains one STOMP connection per signed-in user. Reconnects with exponential backoff, re-reading
 * (and if needed refreshing) the access token before every attempt.
 */
export function WsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const router = useRouter();
  const clientRef = useRef<Client | null>(null);
  const typingListeners = useRef(new Set<TypingListener>());
  const [connectedFor, setConnectedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const handlers = createRealtimeHandlers({ queryClient, userId, navigate: (href) => router.push(href) });
    let hasConnectedBefore = false;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 2_000,
      maxReconnectDelay: 60_000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      heartbeatIncoming: 15_000,
      heartbeatOutgoing: 15_000,
      beforeConnect: async (stomp) => {
        const token = await connectToken();
        stomp.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
      onConnect: () => {
        setConnectedFor(userId);
        client.subscribe("/user/queue/messages", (m) => {
          const data = parse<Parameters<typeof handlers.message>[0]>(m);
          if (data) handlers.message(data);
        });
        client.subscribe("/user/queue/typing", (m) => {
          const data = parse<TypingEvent>(m);
          if (data) typingListeners.current.forEach((listener) => listener(data));
        });
        client.subscribe("/user/queue/read-receipts", (m) => {
          const data = parse<Parameters<typeof handlers.readReceipt>[0]>(m);
          if (data) handlers.readReceipt(data);
        });
        client.subscribe("/user/queue/notifications", (m) => {
          const data = parse<Parameters<typeof handlers.notification>[0]>(m);
          if (data) handlers.notification(data);
        });
        client.subscribe("/user/queue/errors", (m) => {
          const data = parse<Parameters<typeof handlers.error>[0]>(m);
          if (data) handlers.error(data);
        });
        // After a reconnect, catch up on anything pushed while we were offline.
        if (hasConnectedBefore) {
          void queryClient.invalidateQueries({ queryKey: chatKeys.all });
          void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        }
        hasConnectedBefore = true;
      },
      onWebSocketClose: () => setConnectedFor(null),
      onStompError: () => {
        // Most likely a rejected/expired token: force a refresh before the next reconnect attempt.
        setConnectedFor(null);
        void refreshSession();
      },
    });

    clientRef.current = client;
    client.activate();
    return () => {
      clientRef.current = null;
      void client.deactivate();
    };
  }, [userId, queryClient, router]);

  const connected = !!userId && connectedFor === userId;

  const publish = useCallback(
    (destination: string, body: unknown) => {
      const client = clientRef.current;
      if (!connected || !client?.connected) return false;
      client.publish({ destination, body: JSON.stringify(body) });
      return true;
    },
    [connected],
  );

  const onTyping = useCallback((listener: TypingListener) => {
    const listeners = typingListeners.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ connected, publish, onTyping }), [connected, publish, onTyping]);
  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWs(): WsContextValue {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error("useWs must be used inside <WsProvider>");
  return ctx;
}
