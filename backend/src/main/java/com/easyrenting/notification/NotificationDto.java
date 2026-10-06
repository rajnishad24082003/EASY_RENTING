package com.easyrenting.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(UUID id, NotificationType type, String title, String body, String link, boolean read,
                              Instant createdAt) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.isRead(),
                n.getCreatedAt());
    }
}
