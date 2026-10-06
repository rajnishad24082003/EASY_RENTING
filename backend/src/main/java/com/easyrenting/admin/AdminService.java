package com.easyrenting.admin;

import com.easyrenting.admin.AdminDtos.AdminStatsDto;
import com.easyrenting.admin.AdminDtos.AdminUserDto;
import com.easyrenting.admin.AdminDtos.AdminVerificationDto;
import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.auth.RefreshTokenService;
import com.easyrenting.chat.MessageRepository;
import com.easyrenting.common.ApiException;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.property.PropertyMapper;
import com.easyrenting.property.PropertyRepository;
import com.easyrenting.property.PropertyService;
import com.easyrenting.property.PropertyStatus;
import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserDto;
import com.easyrenting.user.UserRepository;
import com.easyrenting.user.UserService;
import com.easyrenting.user.VerificationStatus;
import com.easyrenting.verification.VerificationDocument;
import com.easyrenting.verification.VerificationDtos.VerificationDto;
import com.easyrenting.verification.VerificationService;
import com.easyrenting.visit.VisitRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final UserService users;
    private final PropertyRepository propertyRepository;
    private final PropertyService properties;
    private final VisitRepository visits;
    private final MessageRepository messages;
    private final VerificationService verification;
    private final RefreshTokenService refreshTokens;
    private final Clock clock;

    public AdminService(UserRepository userRepository, UserService users, PropertyRepository propertyRepository,
                        PropertyService properties, VisitRepository visits, MessageRepository messages,
                        VerificationService verification, RefreshTokenService refreshTokens, Clock clock) {
        this.userRepository = userRepository;
        this.users = users;
        this.propertyRepository = propertyRepository;
        this.properties = properties;
        this.visits = visits;
        this.messages = messages;
        this.verification = verification;
        this.refreshTokens = refreshTokens;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        Instant weekAgo = clock.instant().minus(Duration.ofDays(7));
        return new AdminStatsDto(
                userRepository.count(),
                userRepository.countByRole(Role.OWNER),
                userRepository.countByRole(Role.TENANT),
                userRepository.countByRoleAndVerificationStatus(Role.OWNER, VerificationStatus.VERIFIED),
                userRepository.countByRoleAndVerificationStatus(Role.OWNER, VerificationStatus.PENDING),
                propertyRepository.countPublic(),
                propertyRepository.countByDeletedAtIsNull(),
                visits.countByCreatedAtAfter(weekAgo),
                messages.countByCreatedAtAfter(weekAgo));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminVerificationDto> verifications(VerificationStatus status, Pageable pageable) {
        Page<User> owners = userRepository.findByRoleAndVerificationStatus(Role.OWNER, status, pageable);
        List<UUID> ids = owners.getContent().stream().map(User::getId).toList();
        Map<UUID, List<VerificationDocument>> docs = ids.isEmpty() ? Map.of() : verification.documentsByOwner(ids);
        Map<UUID, Long> counts = listingCounts(ids);
        return PageResponse.from(owners, owner -> new AdminVerificationDto(UserDto.from(owner),
                VerificationDto.of(owner, docs.getOrDefault(owner.getId(), List.of())),
                counts.getOrDefault(owner.getId(), 0L)));
    }

    @Transactional
    public AdminVerificationDto approve(UUID ownerId) {
        return toVerificationDto(verification.approve(ownerId));
    }

    @Transactional
    public AdminVerificationDto reject(UUID ownerId, String reason) {
        return toVerificationDto(verification.reject(ownerId, reason));
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserDto> users(String q, Role role, Pageable pageable) {
        Page<User> page = userRepository.search(blankToNull(q), role, pageable);
        Map<UUID, Long> counts = listingCounts(page.getContent().stream().map(User::getId).toList());
        return PageResponse.from(page, u -> AdminUserDto.from(u, counts.getOrDefault(u.getId(), 0L)));
    }

    @Transactional
    public AdminUserDto suspend(AuthenticatedUser admin, UUID userId) {
        User user = users.require(userId);
        if (user.getRole() == Role.ADMIN || user.getId().equals(admin.id())) {
            throw ApiException.conflict("Administrators cannot be suspended");
        }
        user.suspend();
        refreshTokens.revokeAllForUser(userId);
        return toUserDto(user);
    }

    @Transactional
    public AdminUserDto unsuspend(UUID userId) {
        User user = users.require(userId);
        user.unsuspend();
        return toUserDto(user);
    }

    @Transactional(readOnly = true)
    public PageResponse<PropertySummaryDto> properties(String q, PropertyStatus status, Pageable pageable) {
        return PageResponse.from(propertyRepository.adminSearch(blankToNull(q), status, pageable),
                p -> PropertyMapper.toSummary(p, false));
    }

    @Transactional
    public PropertySummaryDto changePropertyStatus(AuthenticatedUser admin, UUID propertyId, PropertyStatus status) {
        Property property = properties.requireManageable(admin, propertyId);
        property.changeStatus(status);
        return PropertyMapper.toSummary(property, false);
    }

    private AdminVerificationDto toVerificationDto(User owner) {
        List<VerificationDocument> docs = verification.documentsByOwner(List.of(owner.getId()))
                .getOrDefault(owner.getId(), List.of());
        return new AdminVerificationDto(UserDto.from(owner), VerificationDto.of(owner, docs),
                listingCounts(List.of(owner.getId())).getOrDefault(owner.getId(), 0L));
    }

    private AdminUserDto toUserDto(User user) {
        return AdminUserDto.from(user, listingCounts(List.of(user.getId())).getOrDefault(user.getId(), 0L));
    }

    private Map<UUID, Long> listingCounts(Collection<UUID> ownerIds) {
        if (ownerIds.isEmpty()) {
            return Map.of();
        }
        return propertyRepository.countByOwners(ownerIds).stream()
                .collect(Collectors.toMap(PropertyRepository.OwnerListingCount::getOwnerId,
                        PropertyRepository.OwnerListingCount::getCount));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
