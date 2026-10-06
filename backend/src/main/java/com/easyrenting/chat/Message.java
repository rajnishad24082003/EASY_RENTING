package com.easyrenting.chat;

import com.easyrenting.common.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "messages")
public class Message extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false, updatable = false)
    private Conversation conversation;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(nullable = false, length = 2000)
    private String content;

    @Column(name = "read_at")
    private Instant readAt;

    protected Message() {
    }

    public Message(Conversation conversation, UUID senderId, String content) {
        this.conversation = conversation;
        this.senderId = senderId;
        this.content = content;
    }

    public Conversation getConversation() {
        return conversation;
    }

    public UUID getSenderId() {
        return senderId;
    }

    public String getContent() {
        return content;
    }

    public Instant getReadAt() {
        return readAt;
    }
}
