package com.easyrenting.chat;

import com.easyrenting.chat.ChatService.MessageSent;
import com.easyrenting.chat.ChatService.MessagesRead;
import com.easyrenting.notification.NotificationService;
import com.easyrenting.notification.NotificationType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Delivers chat events to connected STOMP clients once the originating transaction has committed. */
@Component
class ChatEventsListener {

    static final String MESSAGES = "/queue/messages";
    static final String READ_RECEIPTS = "/queue/read-receipts";
    private static final int PREVIEW_LENGTH = 120;

    private final SimpMessagingTemplate messaging;
    private final NotificationService notifications;

    ChatEventsListener(SimpMessagingTemplate messaging, NotificationService notifications) {
        this.messaging = messaging;
        this.notifications = notifications;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onMessageSent(MessageSent event) {
        messaging.convertAndSendToUser(event.senderId().toString(), MESSAGES, event.message());
        messaging.convertAndSendToUser(event.recipientId().toString(), MESSAGES, event.message());
        String content = event.message().content();
        String preview = content.length() > PREVIEW_LENGTH ? content.substring(0, PREVIEW_LENGTH) + "…" : content;
        notifications.pushTransient(event.recipientId(), NotificationType.NEW_MESSAGE,
                "New message from " + event.senderName(), preview,
                "/messages/" + event.message().conversationId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onMessagesRead(MessagesRead event) {
        messaging.convertAndSendToUser(event.recipientId().toString(), READ_RECEIPTS, event.receipt());
    }
}
