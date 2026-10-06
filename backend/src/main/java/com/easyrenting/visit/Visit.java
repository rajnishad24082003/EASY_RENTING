package com.easyrenting.visit;

import com.easyrenting.common.ApiException;
import com.easyrenting.common.persistence.BaseEntity;
import com.easyrenting.property.Property;
import com.easyrenting.user.User;
import com.easyrenting.visit.VisitStateMachine.Action;
import com.easyrenting.visit.VisitStateMachine.Party;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "visits")
public class Visit extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false, updatable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false, updatable = false)
    private User tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false, updatable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private VisitStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "proposed_at")
    private Instant proposedAt;

    @Column(length = 500)
    private String note;

    @Column(name = "response_note", length = 500)
    private String responseNote;

    @Version
    private long version;

    protected Visit() {
    }

    public Visit(Property property, User tenant, Instant scheduledAt, String note) {
        this.property = property;
        this.tenant = tenant;
        this.owner = property.getOwner();
        this.status = VisitStatus.REQUESTED;
        this.scheduledAt = scheduledAt;
        this.note = note;
    }

    public Optional<Party> partyOf(UUID userId) {
        if (tenant.getId().equals(userId)) {
            return Optional.of(Party.TENANT);
        }
        if (owner.getId().equals(userId)) {
            return Optional.of(Party.OWNER);
        }
        return Optional.empty();
    }

    public void confirm() {
        status = VisitStateMachine.next(status, Action.CONFIRM, Party.OWNER);
    }

    public void reject(String reason) {
        status = VisitStateMachine.next(status, Action.REJECT, Party.OWNER);
        responseNote = reason;
    }

    public void proposeReschedule(Instant newTime, String reason) {
        status = VisitStateMachine.next(status, Action.RESCHEDULE, Party.OWNER);
        proposedAt = newTime;
        responseNote = reason;
    }

    public void acceptReschedule() {
        status = VisitStateMachine.next(status, Action.ACCEPT_RESCHEDULE, Party.TENANT);
        scheduledAt = proposedAt;
        proposedAt = null;
    }

    public void cancel(Party actor, String reason) {
        status = VisitStateMachine.next(status, Action.CANCEL, actor);
        if (reason != null) {
            responseNote = reason;
        }
    }

    public void complete(Instant now) {
        if (status == VisitStatus.CONFIRMED && now.isBefore(scheduledAt)) {
            throw ApiException.conflict("A visit can only be completed after its scheduled time");
        }
        status = VisitStateMachine.next(status, Action.COMPLETE, Party.OWNER);
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

    public VisitStatus getStatus() {
        return status;
    }

    public Instant getScheduledAt() {
        return scheduledAt;
    }

    public Instant getProposedAt() {
        return proposedAt;
    }

    public String getNote() {
        return note;
    }

    public String getResponseNote() {
        return responseNote;
    }
}
