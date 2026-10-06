package com.easyrenting.chat;

import com.easyrenting.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class ChatDtos {

    private ChatDtos() {
    }

    public record StartConversationRequest(@NotNull UUID propertyId, @NotBlank @Size(max = 2000) String message) {
    }

    public record SendMessageRequest(@NotBlank @Size(max = 2000) String content) {
    }

    public record MessageDto(UUID id, UUID conversationId, UUID senderId, String content, Instant createdAt,
                             Instant readAt) {

        static MessageDto from(Message m) {
            return new MessageDto(m.getId(), m.getConversation().getId(), m.getSenderId(), m.getContent(),
                    m.getCreatedAt(), m.getReadAt());
        }
    }

    public record ConversationPropertyDto(UUID id, String title, String coverImageUrl, long rent) {
    }

    public record CounterpartDto(UUID id, String name, Role role) {
    }

    public record ConversationDto(UUID id, ConversationPropertyDto property, CounterpartDto counterpart,
                                  MessageDto lastMessage, long unreadCount, Instant createdAt) {
    }

    /** STOMP payloads ({@code /app/chat.*}). */
    public record WsSendMessage(UUID conversationId, String content) {
    }

    public record WsTyping(UUID conversationId, boolean typing) {
    }

    public record WsRead(UUID conversationId) {
    }

    /** Server → client payloads. */
    public record TypingEvent(UUID conversationId, UUID userId, boolean typing) {
    }

    public record ReadReceipt(UUID conversationId, UUID readerId, Instant readAt) {
    }

    public record WsError(String code, String message) {
    }
}
