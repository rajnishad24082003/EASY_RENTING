package com.easyrenting.visit;

import com.easyrenting.property.Property;
import com.easyrenting.property.PropertyMapper;
import com.easyrenting.user.User;
import com.easyrenting.visit.VisitDtos.VisitDto;
import com.easyrenting.visit.VisitDtos.VisitPartyDto;
import com.easyrenting.visit.VisitDtos.VisitPropertyDto;
import java.util.UUID;

final class VisitMapper {

    private VisitMapper() {
    }

    /** Maps a visit for a given viewer: the counterparty's phone is hidden until the visit is confirmed. */
    static VisitDto toDto(Visit visit, UUID viewerId) {
        Property p = visit.getProperty();
        boolean reveal = visit.getStatus().revealsContact();
        return new VisitDto(
                visit.getId(),
                new VisitPropertyDto(p.getId(), p.getTitle(), p.getLocality(), p.getCity(), PropertyMapper.coverUrl(p)),
                party(visit.getTenant(), reveal || visit.getTenant().getId().equals(viewerId)),
                party(visit.getOwner(), reveal || visit.getOwner().getId().equals(viewerId)),
                visit.getStatus(),
                visit.getScheduledAt(),
                visit.getProposedAt(),
                visit.getNote(),
                visit.getResponseNote(),
                visit.getCreatedAt(),
                visit.getUpdatedAt());
    }

    private static VisitPartyDto party(User user, boolean showPhone) {
        return new VisitPartyDto(user.getId(), user.getName(), showPhone ? user.getPhone() : null);
    }
}
