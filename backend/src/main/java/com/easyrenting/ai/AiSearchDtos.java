package com.easyrenting.ai;

import com.easyrenting.ai.ParsedQuery.ParserType;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.search.SearchFilters;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AiSearchDtos {

    private AiSearchDtos() {
    }

    public record AiSearchRequest(
            @NotBlank @Size(min = 3, max = 300) String query,
            @DecimalMin("-90") @DecimalMax("90") Double lat,
            @DecimalMin("-180") @DecimalMax("180") Double lng) {
    }

    public record AiSearchResponse(SearchFilters filters, String explanation, ParserType parser,
                                   PageResponse<PropertySummaryDto> results) {
    }
}
