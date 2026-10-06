package com.easyrenting.auth;

import com.easyrenting.user.Role;
import java.security.Principal;
import java.util.UUID;

/**
 * Security principal reconstructed from the access token. {@link #getName()} is the user id, which is also the
 * STOMP user name used for {@code /user/queue/...} destinations.
 */
public record AuthenticatedUser(UUID id, Role role, String displayName, String email) implements Principal {

    @Override
    public String getName() {
        return id.toString();
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
