package com.easyrenting.search;

import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.util.List;

/** Structured search filters; also the {@code filters} payload of AI search responses (absent fields omitted). */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record SearchFilters(
        String city,
        String locality,
        Double lat,
        Double lng,
        Double radiusKm,
        Long minRent,
        Long maxRent,
        List<Integer> bhk,
        List<PropertyType> propertyType,
        List<Furnishing> furnishing,
        TenantPreference tenantPreference,
        List<Amenity> amenities,
        LocalDate availableBefore,
        String keywords,
        SortBy sort) {

    public static final double DEFAULT_RADIUS_KM = 5.0;
    public static final double MIN_RADIUS_KM = 0.5;
    public static final double MAX_RADIUS_KM = 50.0;

    public SearchFilters {
        bhk = bhk == null ? List.of() : List.copyOf(bhk);
        propertyType = propertyType == null ? List.of() : List.copyOf(propertyType);
        furnishing = furnishing == null ? List.of() : List.copyOf(furnishing);
        amenities = amenities == null ? List.of() : List.copyOf(amenities);
    }

    public boolean hasGeo() {
        return lat != null && lng != null;
    }

    public SearchFilters withGeo(double latitude, double longitude, double radius) {
        return new SearchFilters(city, locality, latitude, longitude, radius, minRent, maxRent, bhk, propertyType,
                furnishing, tenantPreference, amenities, availableBefore, keywords, sort);
    }

    /** Applies defaults: radius 5 km when a point is given, clamped to the 0.5–50 km contract range. */
    public SearchFilters normalised() {
        if (!hasGeo()) {
            return this;
        }
        double radius = radiusKm == null ? DEFAULT_RADIUS_KM : Math.clamp(radiusKm, MIN_RADIUS_KM, MAX_RADIUS_KM);
        return withGeo(lat, lng, radius);
    }

    /** RELEVANCE resolves to DISTANCE for geo searches and NEWEST otherwise; DISTANCE needs a point. */
    public SortBy effectiveSort() {
        SortBy requested = sort == null ? SortBy.RELEVANCE : sort;
        return switch (requested) {
            case RELEVANCE, DISTANCE -> hasGeo() ? SortBy.DISTANCE : SortBy.NEWEST;
            default -> requested;
        };
    }
}
