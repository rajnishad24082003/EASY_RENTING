package com.easyrenting.visit;

import java.util.EnumSet;
import java.util.Set;

public enum VisitStatus {
    REQUESTED, CONFIRMED, RESCHEDULE_PROPOSED, REJECTED, CANCELLED, COMPLETED;

    public static final Set<VisitStatus> OPEN = EnumSet.of(REQUESTED, CONFIRMED, RESCHEDULE_PROPOSED);

    public boolean isOpen() {
        return OPEN.contains(this);
    }

    /** Counterparty phone numbers are revealed only for confirmed or completed visits. */
    public boolean revealsContact() {
        return this == CONFIRMED || this == COMPLETED;
    }
}
