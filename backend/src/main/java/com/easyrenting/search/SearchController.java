package com.easyrenting.search;

import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.search.SearchDtos.LocalityDto;
import com.easyrenting.search.SearchDtos.MapPinDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search")
public class SearchController {

    private final SearchService searchService;
    private final LocalityService localityService;

    public SearchController(SearchService searchService, LocalityService localityService) {
        this.searchService = searchService;
        this.localityService = localityService;
    }

    @GetMapping("/properties")
    public PageResponse<PropertySummaryDto> search(@ParameterObject @Valid @ModelAttribute PropertySearchParams params,
                                                   @AuthenticationPrincipal AuthenticatedUser viewer) {
        return searchService.search(params.toFilters(), params.page(), params.size(), viewer);
    }

    @GetMapping("/properties/map")
    public List<MapPinDto> map(@ParameterObject @Valid @ModelAttribute PropertySearchParams params) {
        return searchService.mapPins(params.toFilters());
    }

    @GetMapping("/localities")
    public List<LocalityDto> localities(@RequestParam(name = "q", required = false) String q) {
        return localityService.autocomplete(q);
    }
}
