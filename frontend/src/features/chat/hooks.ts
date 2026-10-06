"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "@/lib/api/chat";
import type { ConversationDto, Page } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-auth";
import { useWs } from "@/lib/ws/ws-provider";
import {
  addOptimistic,
  applyReadReceipt,
  createOptimisticMessage,
  markFailed,
  MESSAGES_PAGE_SIZE,
  removeMessage,
  upsertMessage,
  type ChatMessage,
  type MessagesData,
} from "./cache";
import { chatKeys } from "./keys";

const WS_ACK_TIMEOUT_MS = 10_000;
const TYPING_THROTTLE_MS = 3_000;
const TYPING_IDLE_MS = 4_000;
const TYPING_DISPLAY_MS = 6_000;

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => chatApi.list({ page: 0, size: 50 }),
  });
}

export function useConversation(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: () => chatApi.get(id),
    initialData: () =>
      queryClient
        .getQueryData<Page<ConversationDto>>(chatKeys.conversations())
        ?.content.find((conversation) => conversation.id === id),
  });
}

export function useChatUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: chatKeys.unreadCount(),
    queryFn: chatApi.unreadCount,
    enabled,
    select: (data) => data.count,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      chatApi.messages(conversationId, { before: pageParam, size: MESSAGES_PAGE_SIZE }) as Promise<ChatMessage[]>,
    initialPageParam: undefined as string | undefined,
    // Pages are fetched backwards in time: the cursor is the oldest message we have.
    getNextPageParam: (lastPage) => (lastPage.length < MESSAGES_PAGE_SIZE ? undefined : lastPage[0]?.createdAt),
    staleTime: Infinity,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, message }: { propertyId: string; message: string }) =>
      chatApi.start(propertyId, message),
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.conversation(conversation.id), conversation);
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversation.id) });
    },
  });
}

/** Optimistic send over STOMP, with REST fallback when the socket is down or doesn't acknowledge. */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { publish } = useWs();

  const update = useCallback(
    (fn: (data: MessagesData | undefined) => MessagesData | undefined) =>
      queryClient.setQueryData<MessagesData>(chatKeys.messages(conversationId), fn),
    [queryClient, conversationId],
  );

  const sendViaRest = useCallback(
    async (tempId: string, content: string) => {
      try {
        const message = await chatApi.send(conversationId, content);
        update((data) => upsertMessage(data, message, tempId));
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      } catch {
        update((data) => markFailed(data, tempId));
      }
    },
    [conversationId, update, queryClient],
  );

  const send = useCallback(
    (content: string) => {
      if (!user) return;
      const optimistic = createOptimisticMessage(conversationId, user.id, content);
      update((data) => addOptimistic(data, optimistic));
      if (publish("/app/chat.send", { conversationId, content })) {
        window.setTimeout(() => {
          const stillPending = queryClient
            .getQueryData<MessagesData>(chatKeys.messages(conversationId))
            ?.pages.some((page) => page.some((m) => m.id === optimistic.id && m.pending));
          if (stillPending) update((data) => markFailed(data, optimistic.id));
        }, WS_ACK_TIMEOUT_MS);
      } else {
        void sendViaRest(optimistic.id, content);
      }
    },
    [user, conversationId, update, publish, sendViaRest, queryClient],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      update((data) => data && removeMessage(data, message.id));
      send(message.content);
    },
    [update, send],
  );

  return { send, retry };
}

/**
 * Marks the conversation read (over WS when connected, else REST), then mirrors that locally:
 * counterpart messages get `readAt` and the conversation's unread badge is cleared.
 */
export function useMarkConversationRead(conversationId: string, selfId: string | undefined) {
  const queryClient = useQueryClient();
  const { publish } = useWs();
  return useCallback(() => {
    if (!selfId) return;
    if (!publish("/app/chat.read", { conversationId })) {
      void chatApi.markRead(conversationId).catch(() => undefined);
    }
    const now = new Date().toISOString();
    queryClient.setQueryData<MessagesData>(chatKeys.messages(conversationId), (data) =>
      applyReadReceipt(data, selfId, now),
    );
    queryClient.setQueryData<Page<ConversationDto>>(chatKeys.conversations(), (page) =>
      page
        ? { ...page, content: page.content.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)) }
        : page,
    );
    window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() }), 500);
  }, [conversationId, selfId, publish, queryClient]);
}

/** Whether the counterpart is currently typing in this conversation. */
export function useCounterpartTyping(conversationId: string, selfId: string | undefined) {
  const { onTyping } = useWs();
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = onTyping((event) => {
      if (event.conversationId !== conversationId || event.userId === selfId) return;
      window.clearTimeout(timer);
      setTyping(event.typing);
      if (event.typing) timer = window.setTimeout(() => setTyping(false), TYPING_DISPLAY_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      setTyping(false);
    };
  }, [conversationId, selfId, onTyping]);

  return typing;
}

/** Throttled typing notifications: call `notify()` on input, `stop()` after sending. */
export function useTypingPublisher(conversationId: string) {
  const { publish } = useWs();
  const lastSent = useRef(0);
  const idleTimer = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    if (lastSent.current) publish("/app/chat.typing", { conversationId, typing: false });
    lastSent.current = 0;
  }, [conversationId, publish]);

  const notify = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current > TYPING_THROTTLE_MS) {
      if (publish("/app/chat.typing", { conversationId, typing: true })) lastSent.current = now;
    }
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(stop, TYPING_IDLE_MS);
  }, [conversationId, publish, stop]);

  useEffect(() => stop, [stop]);

  return { notify, stop };
}
