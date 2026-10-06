package com.easyrenting.property;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.ApiException;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.PropertyDtos.PropertyDetailDto;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.shortlist.ShortlistLookup;
import com.easyrenting.user.User;
import com.easyrenting.user.UserService;
import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PropertyService {

    private final PropertyRepository properties;
    private final UserService users;
    private final ShortlistLookup shortlists;
    private final Clock clock;

    public PropertyService(PropertyRepository properties, UserService users, ShortlistLookup shortlists, Clock clock) {
        this.properties = properties;
        this.users = users;
        this.shortlists = shortlists;
        this.clock = clock;
    }

    @Transactional
    public PropertyDetailDto create(AuthenticatedUser owner, PropertyRequest request) {
        requireCreatableStatus(request.status());
        User user = users.require(owner.id());
        Property property = properties.save(new Property(user, request));
        return PropertyMapper.toDetail(property, false);
    }

    @Transactional
    public PropertyDetailDto update(AuthenticatedUser actor, UUID id, PropertyRequest request) {
        requireCreatableStatus(request.status());
        Property property = requireManageable(actor, id);
        property.apply(request);
        return PropertyMapper.toDetail(property, false);
    }

    @Transactional
    public PropertyDetailDto changeStatus(AuthenticatedUser actor, UUID id, PropertyStatus status) {
        Property property = requireManageable(actor, id);
        property.changeStatus(status);
        return PropertyMapper.toDetail(property, false);
    }

    @Transactional
    public void delete(AuthenticatedUser actor, UUID id) {
        requireManageable(actor, id).softDelete(clock.instant());
    }

    /** Public detail view; non-public listings resolve to 404 for everyone except their owner and admins. */
    @Transactional
    public PropertyDetailDto detail(UUID id, AuthenticatedUser viewer) {
        Property property = properties.findLive(id)
                .filter(p -> PropertyVisibility.isVisibleTo(p, viewer))
                .orElseThrow(() -> ApiException.notFound("Property"));
        if (!PropertyVisibility.canManage(property, viewer)) {
            properties.incrementViewCount(id);
        }
        return PropertyMapper.toDetail(property, shortlists.isShortlisted(viewer, id));
    }

    @Transactional(readOnly = true)
    public PageResponse<PropertySummaryDto> mine(AuthenticatedUser owner, Pageable pageable) {
        return PageResponse.from(properties.findByOwner(owner.id(), pageable),
                p -> PropertyMapper.toSummary(p, false));
    }

    /** Loads a live listing the actor may edit (its owner or an admin); otherwise 404/403. */
    @Transactional(readOnly = true)
    public Property requireManageable(AuthenticatedUser actor, UUID id) {
        Property property = properties.findLive(id).orElseThrow(() -> ApiException.notFound("Property"));
        if (!PropertyVisibility.canManage(property, actor)) {
            throw ApiException.forbidden("Only the listing owner can modify this listing");
        }
        return property;
    }

    /** Loads a listing that is currently publicly visible, or 404. */
    @Transactional(readOnly = true)
    public Property requirePublic(UUID id) {
        return properties.findPublic(id).orElseThrow(() -> ApiException.notFound("Property"));
    }

    private static void requireCreatableStatus(PropertyStatus status) {
        if (status != null && status != PropertyStatus.DRAFT && status != PropertyStatus.ACTIVE) {
            throw ApiException.badRequest("status must be DRAFT or ACTIVE");
        }
    }
}
