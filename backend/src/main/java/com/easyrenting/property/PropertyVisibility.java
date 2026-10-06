package com.easyrenting.property;

import com.easyrenting.auth.AuthenticatedUser;

/**
 * The single definition of the public visibility rule (contract rule 1 + 7): a listing is public only if it is
 * ACTIVE, not soft-deleted, and its owner is VERIFIED and not suspended. Expressed once for each query technology.
 */
public final class PropertyVisibility {

    /** Native SQL predicate; requires aliases {@code p} (properties) and {@code u} (owner users). */
    public static final String SQL = "p.status = 'ACTIVE' AND p.deleted_at IS NULL"
            + " AND u.verification_status = 'VERIFIED' AND u.suspended = FALSE";

    /** JPQL predicate; requires alias {@code p} for {@link Property}. */
    public static final String JPQL = "p.status = com.easyrenting.property.PropertyStatus.ACTIVE"
            + " and p.deletedAt is null"
            + " and p.owner.verificationStatus = com.easyrenting.user.VerificationStatus.VERIFIED"
            + " and p.owner.suspended = false";

    private PropertyVisibility() {
    }

    public static boolean isPublic(Property property) {
        return property.getStatus() == PropertyStatus.ACTIVE
                && !property.isDeleted()
                && property.getOwner().isVerified()
                && !property.getOwner().isSuspended();
    }

    /** Public listings are visible to everyone; others only to their owner and admins. */
    public static boolean isVisibleTo(Property property, AuthenticatedUser viewer) {
        if (property.isDeleted()) {
            return viewer != null && viewer.isAdmin();
        }
        return isPublic(property) || canManage(property, viewer);
    }

    public static boolean canManage(Property property, AuthenticatedUser user) {
        return user != null && (user.isAdmin() || property.isOwnedBy(user.id()));
    }
}
