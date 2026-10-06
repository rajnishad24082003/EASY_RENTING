"use client";

import { Bell, BellOff, CalendarCheck, MessageSquare, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { NotificationDto } from "@/lib/api/types";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationUnreadCount,
} from "../hooks";

function iconFor(type: NotificationDto["type"]) {
  if (type.startsWith("VISIT_")) return CalendarCheck;
  if (type.startsWith("VERIFICATION_")) return ShieldCheck;
  return MessageSquare;
}

export function CountBadge({ count, label }: { count: number | undefined; label: string }) {
  if (!count) return null;
  return (
    <span
      aria-label={label}
      className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: unread } = useNotificationUnreadCount(true);
  const { data, isPending } = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const onSelect = (notification: NotificationDto) => {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5!" aria-hidden />
          <CountBadge count={unread} label={`${unread} unread notifications`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-semibold">Notifications</p>
          <Button variant="link" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {isPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !data || data.content.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-zinc-500">
              <BellOff className="size-6" aria-hidden />
              You&apos;re all caught up.
            </div>
          ) : (
            data.content.map((notification) => {
              const Icon = iconFor(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onSelect={() => onSelect(notification)}
                  className={cn("items-start gap-3 py-3", !notification.read && "bg-brand-50/60")}
                >
                  <Icon className="mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm text-zinc-900", !notification.read && "font-semibold")}>
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-zinc-500">{notification.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-400">{formatRelative(notification.createdAt)}</p>
                  </div>
                  {!notification.read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
