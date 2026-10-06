package com.easyrenting.user;

import java.time.Instant;
import java.util.UUID;

public record UserDto(
        UUID id,
        String name,
        String email,
        String phone,
        Role role,
        VerificationStatus verificationStatus,
        String avatarUrl,
        Instant createdAt) {

    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole(),
                user.getVerificationStatus(), user.getAvatarUrl(), user.getCreatedAt());
    }
}
