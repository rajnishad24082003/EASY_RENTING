"use client";

import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { PropertyImage } from "@/components/property-image";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import { formatINR, formatShortTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useConversations } from "../hooks";

export function ConversationList({ activeId }: { activeId: string | null }) {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useConversations();

  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState className="m-3" error={error} onRetry={() => refetch()} />;
  if (data.content.length === 0) {
    return (
      <EmptyState
        className="m-3 border-0"
        icon={MessagesSquare}
        title="No conversations yet"
        description={
          user?.role === "TENANT"
            ? "Open a listing and tap “Chat with owner” to start a conversation."
            : "Tenants interested in your listings will message you here."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-zinc-100" aria-label="Conversations">
      {data.content.map((conversation) => {
        const active = conversation.id === activeId;
        const last = conversation.lastMessage;
        const unread = conversation.unreadCount > 0 && !active;
        return (
          <li key={conversation.id}>
            <Link
              href={`/messages/${conversation.id}`}
              aria-current={active ? "page" : undefined}
              className={cn("flex gap-3 px-4 py-3 transition-colors", active ? "bg-brand-50" : "hover:bg-zinc-50")}
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                <PropertyImage src={conversation.property.coverImageUrl} alt="" sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      unread ? "font-semibold text-zinc-900" : "font-medium text-zinc-800",
                    )}
                  >
                    {conversation.counterpart.name}
                  </p>
                  {last && (
                    <span className="shrink-0 text-[11px] text-zinc-400">{formatShortTimestamp(last.createdAt)}</span>
                  )}
                </div>
                <p className="truncate text-xs text-zinc-500">
                  {conversation.property.title} · {formatINR(conversation.property.rent)}
                </p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={cn("truncate text-xs", unread ? "font-medium text-zinc-800" : "text-zinc-500")}>
                    {last ? `${last.senderId === user?.id ? "You: " : ""}${last.content}` : "No messages yet"}
                  </p>
                  {unread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">
                      {conversation.unreadCount}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
