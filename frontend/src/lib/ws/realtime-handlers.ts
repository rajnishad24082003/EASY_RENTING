import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applyReadReceipt, upsertMessage, type MessagesData } from "@/features/chat/cache";
import { activeConversation, chatKeys } from "@/features/chat/keys";
import { notificationKeys } from "@/features/notifications/keys";
import { verificationKeys } from "@/features/verification/keys";
import { visitKeys } from "@/features/visits/keys";
import { usersApi } from "@/lib/api/auth";
import { sessionStore } from "@/lib/auth/session-store";
import type { CountResponse, MessageDto, NotificationDto, ReadReceiptEvent, WsErrorEvent } from "@/lib/api/types";

interface HandlerContext {
  queryClient: QueryClient;
  userId: string;
  navigate: (href: string) => void;
}

/** Applies server push events to the TanStack Query cache. */
export function createRealtimeHandlers({ queryClient, userId, navigate }: HandlerContext) {
  return {
    message(message: MessageDto) {
      queryClient.setQueryData<MessagesData>(chatKeys.messages(message.conversationId), (data) =>
        upsertMessage(data, message),
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      if (message.senderId !== userId && activeConversation.get() !== message.conversationId) {
        void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
      }
    },

    readReceipt(event: ReadReceiptEvent) {
      queryClient.setQueryData<MessagesData>(chatKeys.messages(event.conversationId), (data) =>
        applyReadReceipt(data, event.readerId, event.readAt),
      );
    },

    notification(notification: NotificationDto) {
      const viewingTarget = typeof window !== "undefined" && window.location.pathname === notification.link;

      if (notification.type === "NEW_MESSAGE") {
        // Not persisted: only refresh chat counters.
        void queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
        void queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
        const inThread = activeConversation.get() !== null && notification.link.endsWith(activeConversation.get()!);
        if (viewingTarget || inThread) return;
      } else {
        queryClient.setQueryData<CountResponse>(notificationKeys.unreadCount(), (data) =>
          data ? { count: data.count + 1 } : data,
        );
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }

      if (notification.type.startsWith("VISIT_")) {
        void queryClient.invalidateQueries({ queryKey: visitKeys.all });
      }
      if (notification.type.startsWith("VERIFICATION_")) {
        void queryClient.invalidateQueries({ queryKey: verificationKeys.all });
        // verificationStatus lives on the user; refresh it so banners/badges update.
        usersApi.me().then(sessionStore.setUser, () => undefined);
      }

      if (!viewingTarget) {
        toast(notification.title, {
          description: notification.body,
          action: notification.link ? { label: "View", onClick: () => navigate(notification.link) } : undefined,
        });
      }
    },

    error(event: WsErrorEvent) {
      toast.error(event.message || "Realtime error");
    },
  };
}
