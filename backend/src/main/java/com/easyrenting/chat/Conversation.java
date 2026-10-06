package com.easyrenting.chat;

import com.easyrenting.common.persistence.BaseEntity;
import com.easyrenting.property.Property;
import com.easyrenting.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A tenant ↔ owner thread about one listing; unique per (property, tenant). */
@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false, updatable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false, updatable = false)
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, updatable = false)
    private User owner;

    @Column(name = "last_message_at", nullable = false)
    private Instant lastMessageAt;

    protected Conversation() {
    }

    public Conversation(Property property, User tenant, Instant now) {
        this.property = property;
        this.tenant = tenant;
        this.owner = property.getOwner();
        this.lastMessageAt = now;
    }

    public boolean isParticipant(UUID userId) {
        return tenant.getId().equals(userId) || owner.getId().equals(userId);
    }

    public User counterpartOf(UUID userId) {
        return tenant.getId().equals(userId) ? owner : tenant;
    }

    void touch(Instant at) {
        this.lastMessageAt = at;
    }

    public Property getProperty() {
        return property;
    }

    public User getTenant() {
        return tenant;
    }

    public User getOwner() {
        return owner;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }
}
