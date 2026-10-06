package com.easyrenting.notification;

import com.easyrenting.notification.NotificationService.NotificationEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
class NotificationPushListener {

    static final String DESTINATION = "/queue/notifications";

    private final SimpMessagingTemplate messaging;

    NotificationPushListener(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    void push(NotificationEvent event) {
        messaging.convertAndSendToUser(event.recipientId().toString(), DESTINATION, event.notification());
    }
}
