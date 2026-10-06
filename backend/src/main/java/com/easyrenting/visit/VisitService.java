package com.easyrenting.visit;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.ApiException;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import com.easyrenting.config.AppProperties;
import com.easyrenting.notification.NotificationService;
import com.easyrenting.notification.NotificationType;
import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyService;
import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserService;
import com.easyrenting.visit.VisitDtos.CreateVisitRequest;
import com.easyrenting.visit.VisitDtos.VisitDto;
import com.easyrenting.visit.VisitStateMachine.Party;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitService {

    private static final String VISITS_LINK = "/dashboard/visits";

    private final VisitRepository visits;
    private final PropertyService properties;
    private final UserService users;
    private final VisitSlotPolicy slotPolicy;
    private final NotificationService notifications;
    private final Clock clock;
    private final DateTimeFormatter slotFormat;

    public VisitService(VisitRepository visits, PropertyService properties, UserService users,
                        VisitSlotPolicy slotPolicy, NotificationService notifications, Clock clock,
                        AppProperties appProperties) {
        this.visits = visits;
        this.properties = properties;
        this.users = users;
        this.slotPolicy = slotPolicy;
        this.notifications = notifications;
        this.clock = clock;
        this.slotFormat = DateTimeFormatter.ofPattern("EEE, d MMM 'at' h:mm a", Locale.ENGLISH)
                .withZone(appProperties.timezone());
    }

    @Transactional
    public VisitDto request(AuthenticatedUser tenantPrincipal, CreateVisitRequest request) {
        slotPolicy.validate("scheduledAt", request.scheduledAt());
        Property property = properties.requirePublic(request.propertyId());
        if (visits.existsByTenantIdAndPropertyIdAndStatusIn(tenantPrincipal.id(), property.getId(), VisitStatus.OPEN)) {
            throw ApiException.conflict("You already have an open visit request for this property");
        }
        User tenant = users.require(tenantPrincipal.id());
        Visit visit = visits.save(new Visit(property, tenant, request.scheduledAt(), blankToNull(request.note())));
        notifications.notify(visit.getOwner().getId(), NotificationType.VISIT_REQUESTED, "New visit request",
                tenant.getName() + " wants to visit \"" + property.getTitle() + "\" on " + format(visit.getScheduledAt()),
                VISITS_LINK);
        return VisitMapper.toDto(visit, tenant.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<VisitDto> list(AuthenticatedUser user, List<VisitStatus> statuses, Boolean upcoming,
                                       Integer page, Integer size) {
        Specification<Visit> spec = user.role() == Role.OWNER
                ? (root, query, cb) -> cb.equal(root.get("owner").get("id"), user.id())
                : (root, query, cb) -> cb.equal(root.get("tenant").get("id"), user.id());
        if (statuses != null && !statuses.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("status").in(statuses));
        }
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (Boolean.TRUE.equals(upcoming)) {
            Instant now = clock.instant();
            spec = spec.and((root, query, cb) -> cb.greaterThan(root.get("scheduledAt"), now));
            sort = Sort.by(Sort.Direction.ASC, "scheduledAt");
        }
        return PageResponse.from(visits.findAll(spec, Paging.of(page, size, sort.and(Sort.by("id")))),
                visit -> VisitMapper.toDto(visit, user.id()));
    }

    @Transactional(readOnly = true)
    public VisitDto get(AuthenticatedUser user, UUID id) {
        Visit visit = requireParticipant(user, id);
        return VisitMapper.toDto(visit, user.id());
    }

    @Transactional
    public VisitDto confirm(AuthenticatedUser owner, UUID id) {
        Visit visit = requireParty(owner, id, Party.OWNER);
        visit.confirm();
        notifyTenant(visit, NotificationType.VISIT_CONFIRMED, "Visit confirmed",
                "Your visit to \"" + visit.getProperty().getTitle() + "\" on " + format(visit.getScheduledAt())
                        + " is confirmed");
        return VisitMapper.toDto(visit, owner.id());
    }

    @Transactional
    public VisitDto reject(AuthenticatedUser owner, UUID id, String reason) {
        Visit visit = requireParty(owner, id, Party.OWNER);
        visit.reject(blankToNull(reason));
        notifyTenant(visit, NotificationType.VISIT_REJECTED, "Visit request declined",
                "The owner declined your visit to \"" + visit.getProperty().getTitle() + "\""
                        + (visit.getResponseNote() != null ? ": " + visit.getResponseNote() : ""));
        return VisitMapper.toDto(visit, owner.id());
    }

    @Transactional
    public VisitDto reschedule(AuthenticatedUser owner, UUID id, Instant proposedAt, String note) {
        slotPolicy.validate("proposedAt", proposedAt);
        Visit visit = requireParty(owner, id, Party.OWNER);
        visit.proposeReschedule(proposedAt, blankToNull(note));
        notifyTenant(visit, NotificationType.VISIT_RESCHEDULED, "New time proposed",
                "The owner proposed " + format(proposedAt) + " for your visit to \"" + visit.getProperty().getTitle() + "\"");
        return VisitMapper.toDto(visit, owner.id());
    }

    @Transactional
    public VisitDto acceptReschedule(AuthenticatedUser tenant, UUID id) {
        Visit visit = requireParty(tenant, id, Party.TENANT);
        visit.acceptReschedule();
        notifyOwner(visit, NotificationType.VISIT_CONFIRMED, "Visit confirmed",
                visit.getTenant().getName() + " accepted the new time " + format(visit.getScheduledAt())
                        + " for \"" + visit.getProperty().getTitle() + "\"");
        return VisitMapper.toDto(visit, tenant.id());
    }

    @Transactional
    public VisitDto cancel(AuthenticatedUser user, UUID id, String reason) {
        Visit visit = requireParticipant(user, id);
        Party party = visit.partyOf(user.id()).orElseThrow();
        visit.cancel(party, blankToNull(reason));
        String body = "The visit to \"" + visit.getProperty().getTitle() + "\" on " + format(visit.getScheduledAt())
                + " was cancelled";
        if (party == Party.TENANT) {
            notifyOwner(visit, NotificationType.VISIT_CANCELLED, "Visit cancelled", body);
        } else {
            notifyTenant(visit, NotificationType.VISIT_CANCELLED, "Visit cancelled", body);
        }
        return VisitMapper.toDto(visit, user.id());
    }

    @Transactional
    public VisitDto complete(AuthenticatedUser owner, UUID id) {
        Visit visit = requireParty(owner, id, Party.OWNER);
        visit.complete(clock.instant());
        notifyTenant(visit, NotificationType.VISIT_COMPLETED, "Visit completed",
                "How was \"" + visit.getProperty().getTitle() + "\"? Message the owner if you'd like to proceed.");
        return VisitMapper.toDto(visit, owner.id());
    }

    private Visit requireParticipant(AuthenticatedUser user, UUID id) {
        Visit visit = visits.findDetailed(id).orElseThrow(() -> ApiException.notFound("Visit"));
        if (visit.partyOf(user.id()).isEmpty()) {
            throw ApiException.notFound("Visit");
        }
        return visit;
    }

    private Visit requireParty(AuthenticatedUser user, UUID id, Party expected) {
        Visit visit = requireParticipant(user, id);
        if (visit.partyOf(user.id()).orElseThrow() != expected) {
            throw ApiException.forbidden("Only the " + expected.name().toLowerCase() + " can perform this action");
        }
        return visit;
    }

    private void notifyTenant(Visit visit, NotificationType type, String title, String body) {
        notifications.notify(visit.getTenant().getId(), type, title, body, VISITS_LINK);
    }

    private void notifyOwner(Visit visit, NotificationType type, String title, String body) {
        notifications.notify(visit.getOwner().getId(), type, title, body, VISITS_LINK);
    }

    private String format(Instant instant) {
        return slotFormat.format(instant);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
