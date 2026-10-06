package com.easyrenting.shortlist;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.user.Role;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Resolves the {@code shortlisted} flag of listing DTOs; only authenticated tenants have shortlists. */
@Component
public class ShortlistLookup {

    private final ShortlistRepository shortlists;

    public ShortlistLookup(ShortlistRepository shortlists) {
        this.shortlists = shortlists;
    }

    @Transactional(readOnly = true)
    public Set<UUID> shortlistedAmong(AuthenticatedUser viewer, Collection<UUID> propertyIds) {
        if (viewer == null || viewer.role() != Role.TENANT || propertyIds.isEmpty()) {
            return Set.of();
        }
        return shortlists.findShortlistedIds(viewer.id(), propertyIds);
    }

    public boolean isShortlisted(AuthenticatedUser viewer, UUID propertyId) {
        return shortlistedAmong(viewer, List.of(propertyId)).contains(propertyId);
    }
}
