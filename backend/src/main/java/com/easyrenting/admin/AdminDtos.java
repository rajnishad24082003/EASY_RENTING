package com.easyrenting.admin;

import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserDto;
import com.easyrenting.user.VerificationStatus;
import com.easyrenting.verification.VerificationDtos.VerificationDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AdminDtos {

    private AdminDtos() {
    }

    public record AdminStatsDto(long totalUsers, long totalOwners, long totalTenants, long verifiedOwners,
                                long pendingVerifications, long activeListings, long totalListings,
                                long visitsThisWeek, long messagesThisWeek) {
    }

    public record AdminVerificationDto(UserDto owner, VerificationDto verification, long listingCount) {
    }

    public record AdminUserDto(UUID id, String name, String email, String phone, Role role,
                               VerificationStatus verificationStatus, String avatarUrl, Instant createdAt,
                               boolean suspended, long listingCount) {

        static AdminUserDto from(User u, long listingCount) {
            return new AdminUserDto(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getRole(),
                    u.getVerificationStatus(), u.getAvatarUrl(), u.getCreatedAt(), u.isSuspended(), listingCount);
        }
    }

    public record RejectVerificationRequest(@NotBlank @Size(min = 5, max = 500) String reason) {
    }
}
