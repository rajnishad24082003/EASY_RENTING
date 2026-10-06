package com.easyrenting.notification;

import com.easyrenting.common.ApiException;
import com.easyrenting.common.web.PageResponse;
import java.time.Clock;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persists in-app notifications and schedules their WebSocket delivery for after the surrounding transaction
 * commits (see {@link NotificationPushListener}).
 */
@Service
public class NotificationService {

    /** Published after a notification is created; delivered over WebSocket once the transaction commits. */
    public record NotificationEvent(UUID recipientId, NotificationDto notification) {
    }

    private final NotificationRepository notifications;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, ApplicationEventPublisher events, Clock clock) {
        this.notifications = notifications;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public void notify(UUID recipientId, NotificationType type, String title, String body, String link) {
        Notification saved = notifications.save(new Notification(recipientId, type, title, body, link));
        events.publishEvent(new NotificationEvent(recipientId, NotificationDto.from(saved)));
    }

    /** Pushes a notification that is not persisted (contract: NEW_MESSAGE is WS-only). */
    public void pushTransient(UUID recipientId, NotificationType type, String title, String body, String link) {
        NotificationDto dto = new NotificationDto(UUID.randomUUID(), type, title, body, link, false, clock.instant());
        events.publishEvent(new NotificationEvent(recipientId, dto));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(UUID userId, Pageable pageable) {
        return PageResponse.from(notifications.findByUserId(userId, pageable), NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notifications.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        notifications.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> ApiException.notFound("Notification"))
                .markRead();
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notifications.markAllRead(userId);
    }
}
