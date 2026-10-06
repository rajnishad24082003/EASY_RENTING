package com.easyrenting.shortlist;

import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.property.PropertyMapper;
import com.easyrenting.property.PropertyService;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShortlistService {

    private final ShortlistRepository shortlists;
    private final PropertyService properties;

    public ShortlistService(ShortlistRepository shortlists, PropertyService properties) {
        this.shortlists = shortlists;
        this.properties = properties;
    }

    @Transactional(readOnly = true)
    public PageResponse<PropertySummaryDto> list(UUID tenantId, Pageable pageable) {
        return PageResponse.from(shortlists.findVisibleByTenant(tenantId, pageable),
                s -> PropertyMapper.toSummary(s.getProperty(), true));
    }

    /** Idempotent: shortlisting an already-shortlisted listing is a no-op. */
    @Transactional
    public void add(UUID tenantId, UUID propertyId) {
        Property property = properties.requirePublic(propertyId);
        if (!shortlists.existsByTenantIdAndPropertyId(tenantId, propertyId)) {
            shortlists.save(new Shortlist(tenantId, property));
        }
    }

    @Transactional
    public void remove(UUID tenantId, UUID propertyId) {
        shortlists.deleteByTenantAndProperty(tenantId, propertyId);
    }
}
