"use client";

import { ArrowLeft, WifiOff } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth/use-auth";
import { formatDayLabel, formatINR } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useWs } from "@/lib/ws/ws-provider";
import { flattenMessages, isTempId } from "../cache";
import {
  useConversation,
  useCounterpartTyping,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useTypingPublisher,
} from "../hooks";
import { activeConversation } from "../keys";
import { MessageBubble } from "./message-bubble";
import { MessageComposer } from "./message-composer";

const NEAR_BOTTOM_PX = 160;

export function ChatThread({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const selfId = user?.id;
  const { connected } = useWs();
  const conversation = useConversation(conversationId);
  const messagesQuery = useMessages(conversationId);
  const { send, retry } = useSendMessage(conversationId);
  const markRead = useMarkConversationRead(conversationId, selfId);
  const typing = useCounterpartTyping(conversationId, selfId);
  const typingPublisher = useTypingPublisher(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const snapshot = useRef<{ firstId?: string; lastId?: string; scrollHeight: number }>({ scrollHeight: 0 });

  const messages = flattenMessages(messagesQuery.data);
  const firstId = messages[0]?.id;
  const lastMessage = messages.at(-1);
  const lastId = lastMessage?.id;
  const lastMine = lastMessage?.senderId === selfId;
  const latestUnreadId = messages.filter((m) => m.senderId !== selfId && !m.readAt && !isTempId(m.id)).at(-1)?.id;

  useEffect(() => {
    activeConversation.set(conversationId);
    return () => activeConversation.set(null);
  }, [conversationId]);

  // Scroll management: stick to the bottom on new messages, keep position when older ones are prepended.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !lastId) return;
    const prev = snapshot.current;
    if (!prev.lastId) {
      el.scrollTop = el.scrollHeight;
    } else if (prev.firstId !== firstId && prev.lastId === lastId) {
      el.scrollTop += el.scrollHeight - prev.scrollHeight;
    } else if (prev.lastId !== lastId) {
      const wasNearBottom = prev.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      if (wasNearBottom || lastMine) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    snapshot.current = { firstId, lastId, scrollHeight: el.scrollHeight };
  }, [firstId, lastId, lastMine]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = messagesQuery;
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { root, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-mark as read while the thread is visible.
  useEffect(() => {
    if (!latestUnreadId) return;
    const markIfVisible = () => {
      if (document.visibilityState === "visible") markRead();
    };
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [latestUnreadId, markRead]);

  if (conversation.isError) {
    return (
      <div className="p-6">
        <ErrorState
          error={conversation.error}
          title="Conversation unavailable"
          onRetry={() => conversation.refetch()}
        />
      </div>
    );
  }

  const c = conversation.data;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2.5 sm:px-4">
        <Link
          href="/messages"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "md:hidden")}
          aria-label="Back to conversations"
        >
          <ArrowLeft aria-hidden />
        </Link>
        {c ? (
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {c.counterpart.name}{" "}
              <span className="text-xs font-normal text-zinc-500">· {ROLE_LABELS[c.counterpart.role]}</span>
            </p>
            <Link
              href={`/properties/${c.property.id}`}
              className="block truncate text-xs text-zinc-500 hover:text-brand-700 hover:underline"
            >
              {c.property.title} · {formatINR(c.property.rent)}/mo
            </Link>
          </div>
        ) : (
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        )}
        {!connected && (
          <span
            className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800"
            title="Realtime connection lost; messages are sent over HTTP"
          >
            <WifiOff className="size-3" aria-hidden /> Offline mode
          </span>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 sm:px-6"
        role="log"
        aria-label="Messages"
        aria-live="polite"
      >
        <div ref={topSentinelRef} />
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Spinner className="size-4" />
          </div>
        )}
        {messagesQuery.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className={cn("h-10 w-1/2 rounded-2xl", i % 2 && "ml-auto")} />
            ))}
          </div>
        ) : messagesQuery.isError ? (
          <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">Say hello 👋</p>
        ) : (
          <div className="space-y-1.5">
            {messages.map((message, i) => {
              const day = formatDayLabel(message.createdAt);
              const showDay = i === 0 || formatDayLabel(messages[i - 1].createdAt) !== day;
              return (
                <Fragment key={message.id}>
                  {showDay && (
                    <div className="flex justify-center py-3" role="separator">
                      <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-[11px] font-medium text-zinc-500">
                        {day}
                      </span>
                    </div>
                  )}
                  <MessageBubble message={message} mine={message.senderId === selfId} onRetry={retry} />
                </Fragment>
              );
            })}
          </div>
        )}
        {typing && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="flex gap-0.5" aria-hidden>
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400" />
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:120ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:240ms]" />
            </span>
            {c?.counterpart.name ?? "They"} is typing…
          </p>
        )}
      </div>

      <MessageComposer
        onTyping={typingPublisher.notify}
        onSend={(content) => {
          typingPublisher.stop();
          send(content);
        }}
      />
    </div>
  );
}
