package com.easyrenting.search;

import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;

/** Query-string binding for {@code GET /search/properties} and {@code /search/properties/map}. */
public record PropertySearchParams(
        @DecimalMin("-90") @DecimalMax("90") Double lat,
        @DecimalMin("-180") @DecimalMax("180") Double lng,
        @DecimalMin("0.5") @DecimalMax("50") Double radiusKm,
        @Size(max = 80) String city,
        @Size(max = 120) String locality,
        @Size(max = 200) String q,
        @PositiveOrZero Long minRent,
        @PositiveOrZero Long maxRent,
        List<@Min(0) @Max(10) Integer> bhk,
        List<PropertyType> propertyType,
        List<Furnishing> furnishing,
        TenantPreference tenantPreference,
        List<Amenity> amenities,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate availableBefore,
        SortBy sort,
        @Min(0) Integer page,
        @Min(1) @Max(100) Integer size) {

    @AssertTrue(message = "lat and lng must be provided together")
    public boolean isCoordinatePairComplete() {
        return (lat == null) == (lng == null);
    }

    @AssertTrue(message = "minRent must not exceed maxRent")
    public boolean isRentRangeValid() {
        return minRent == null || maxRent == null || minRent <= maxRent;
    }

    public SearchFilters toFilters() {
        return new SearchFilters(city, locality, lat, lng, radiusKm, minRent, maxRent, bhk, propertyType, furnishing,
                tenantPreference, amenities, availableBefore, q, sort);
    }
}
