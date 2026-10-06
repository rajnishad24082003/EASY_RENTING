package com.easyrenting.search;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.common.web.Paging;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.search.PropertySearchRepository.SearchPage;
import com.easyrenting.search.SearchDtos.MapPinDto;
import com.easyrenting.shortlist.ShortlistLookup;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SearchService {

    private final PropertySearchRepository repository;
    private final ShortlistLookup shortlists;

    public SearchService(PropertySearchRepository repository, ShortlistLookup shortlists) {
        this.repository = repository;
        this.shortlists = shortlists;
    }

    @Transactional(readOnly = true)
    public PageResponse<PropertySummaryDto> search(SearchFilters filters, Integer page, Integer size,
                                                   AuthenticatedUser viewer) {
        int pageNumber = Paging.page(page);
        int pageSize = Paging.size(size);
        SearchPage result = repository.search(filters.normalised(), pageNumber, pageSize);
        Set<UUID> shortlisted = shortlists.shortlistedAmong(viewer,
                result.content().stream().map(PropertySummaryDto::id).toList());
        List<PropertySummaryDto> content = result.content().stream()
                .map(dto -> shortlisted.contains(dto.id()) ? withShortlisted(dto) : dto)
                .toList();
        return PageResponse.of(content, pageNumber, pageSize, result.total());
    }

    @Transactional(readOnly = true)
    public List<MapPinDto> mapPins(SearchFilters filters) {
        return repository.mapPins(filters.normalised());
    }

    private static PropertySummaryDto withShortlisted(PropertySummaryDto d) {
        return new PropertySummaryDto(d.id(), d.title(), d.propertyType(), d.bhk(), d.bathrooms(), d.areaSqft(),
                d.furnishing(), d.tenantPreference(), d.rent(), d.deposit(), d.locality(), d.city(), d.latitude(),
                d.longitude(), d.coverImageUrl(), d.amenities(), d.status(), d.availableFrom(), d.createdAt(),
                d.distanceKm(), d.ownerVerified(), true);
    }
}
