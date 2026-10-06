package com.easyrenting.chat;

import com.easyrenting.chat.ChatDtos.ConversationDto;
import com.easyrenting.chat.ChatDtos.ConversationPropertyDto;
import com.easyrenting.chat.ChatDtos.CounterpartDto;
import com.easyrenting.chat.ChatDtos.MessageDto;
import com.easyrenting.chat.ChatDtos.ReadReceipt;
import com.easyrenting.chat.ChatDtos.TypingEvent;
import com.easyrenting.common.ApiException;
import com.easyrenting.common.FieldValidationException;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyMapper;
import com.easyrenting.property.PropertyService;
import com.easyrenting.user.User;
import com.easyrenting.user.UserService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    static final int MAX_CONTENT_LENGTH = 2000;
    static final int DEFAULT_HISTORY_SIZE = 30;
    static final int MAX_HISTORY_SIZE = 100;

    /** Domain events delivered over WebSocket after commit by {@link ChatEventsListener}. */
    public record MessageSent(MessageDto message, UUID senderId, String senderName, UUID recipientId) {
    }

    public record MessagesRead(ReadReceipt receipt, UUID recipientId) {
    }

    /** A typing indicator to forward to the conversation counterpart (not persisted). */
    public record TypingNotice(UUID recipientId, TypingEvent event) {
    }

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final PropertyService properties;
    private final UserService users;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public ChatService(ConversationRepository conversations, MessageRepository messages, PropertyService properties,
                       UserService users, ApplicationEventPublisher events, Clock clock) {
        this.conversations = conversations;
        this.messages = messages;
        this.properties = properties;
        this.users = users;
        this.events = events;
        this.clock = clock;
    }

    /** Starts (or reuses) the tenant's conversation about a listing and appends the first message. */
    @Transactional
    public ConversationDto start(UUID tenantId, UUID propertyId, String content) {
        Property property = properties.requirePublic(propertyId);
        Conversation conversation = conversations.findByPropertyIdAndTenantId(propertyId, tenantId)
                .orElseGet(() -> conversations.save(new Conversation(property, users.require(tenantId), clock.instant())));
        Message message = append(conversation, tenantId, content);
        return toDto(conversation, tenantId, MessageDto.from(message), 0);
    }

    @Transactional(readOnly = true)
    public PageResponse<ConversationDto> list(UUID userId, Pageable pageable) {
        Page<Conversation> page = conversations.findForUser(userId, pageable);
        List<UUID> ids = page.getContent().stream().map(Conversation::getId).toList();
        if (ids.isEmpty()) {
            return PageResponse.from(page, c -> toDto(c, userId, null, 0));
        }
        Map<UUID, Message> latest = messages.findLatestIn(ids).stream()
                .collect(Collectors.toMap(m -> m.getConversation().getId(), Function.identity(), (a, b) -> a));
        Map<UUID, Long> unread = messages.countUnreadIn(ids, userId).stream()
                .collect(Collectors.toMap(MessageRepository.UnreadCount::getConversationId,
                        MessageRepository.UnreadCount::getCount));
        return PageResponse.from(page, c -> toDto(c, userId,
                latest.containsKey(c.getId()) ? MessageDto.from(latest.get(c.getId())) : null,
                unread.getOrDefault(c.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public ConversationDto get(UUID userId, UUID conversationId) {
        Conversation conversation = requireParticipant(userId, conversationId);
        MessageDto last = messages.findNewest(conversationId, PageRequest.of(0, 1)).stream()
                .findFirst().map(MessageDto::from).orElse(null);
        long unread = messages.countUnreadIn(List.of(conversationId), userId).stream()
                .mapToLong(MessageRepository.UnreadCount::getCount).sum();
        return toDto(conversation, userId, last, unread);
    }

    /** Returns up to {@code size} messages older than {@code before}, oldest first (cursor paging backwards). */
    @Transactional(readOnly = true)
    public List<MessageDto> history(UUID userId, UUID conversationId, Instant before, Integer size) {
        requireParticipant(userId, conversationId);
        int limit = size == null || size < 1 ? DEFAULT_HISTORY_SIZE : Math.min(size, MAX_HISTORY_SIZE);
        Pageable pageable = PageRequest.of(0, limit);
        List<Message> newestFirst = before == null
                ? messages.findNewest(conversationId, pageable)
                : messages.findOlderThan(conversationId, before, pageable);
        return newestFirst.reversed().stream().map(MessageDto::from).toList();
    }

    @Transactional
    public MessageDto send(UUID senderId, UUID conversationId, String content) {
        Conversation conversation = requireParticipant(senderId, conversationId);
        return MessageDto.from(append(conversation, senderId, content));
    }

    @Transactional
    public void markRead(UUID readerId, UUID conversationId) {
        Conversation conversation = requireParticipant(readerId, conversationId);
        Instant now = clock.instant();
        if (messages.markReadBy(conversationId, readerId, now) > 0) {
            events.publishEvent(new MessagesRead(new ReadReceipt(conversationId, readerId, now),
                    conversation.counterpartOf(readerId).getId()));
        }
    }

    @Transactional(readOnly = true)
    public TypingNotice typing(UUID userId, UUID conversationId, boolean typing) {
        Conversation conversation = requireParticipant(userId, conversationId);
        return new TypingNotice(conversation.counterpartOf(userId).getId(), new TypingEvent(conversationId, userId, typing));
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return messages.countUnreadForUser(userId);
    }

    private Message append(Conversation conversation, UUID senderId, String rawContent) {
        String content = rawContent == null ? "" : rawContent.strip();
        if (content.isEmpty() || content.length() > MAX_CONTENT_LENGTH) {
            throw new FieldValidationException("content", "must be between 1 and " + MAX_CONTENT_LENGTH + " characters");
        }
        Message message = messages.save(new Message(conversation, senderId, content));
        conversation.touch(message.getCreatedAt() != null ? message.getCreatedAt() : clock.instant());
        User sender = conversation.getTenant().getId().equals(senderId) ? conversation.getTenant() : conversation.getOwner();
        events.publishEvent(new MessageSent(MessageDto.from(message), senderId, sender.getName(),
                conversation.counterpartOf(senderId).getId()));
        return message;
    }

    private Conversation requireParticipant(UUID userId, UUID conversationId) {
        return conversations.findDetailed(conversationId)
                .filter(c -> c.isParticipant(userId))
                .orElseThrow(() -> ApiException.notFound("Conversation"));
    }

    private static ConversationDto toDto(Conversation c, UUID viewerId, MessageDto lastMessage, long unreadCount) {
        Property p = c.getProperty();
        User counterpart = c.counterpartOf(viewerId);
        return new ConversationDto(c.getId(),
                new ConversationPropertyDto(p.getId(), p.getTitle(), PropertyMapper.coverUrl(p), p.getRent()),
                new CounterpartDto(counterpart.getId(), counterpart.getName(), counterpart.getRole()),
                lastMessage, unreadCount, c.getCreatedAt());
    }
}
