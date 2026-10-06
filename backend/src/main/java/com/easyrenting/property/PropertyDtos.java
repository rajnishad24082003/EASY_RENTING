package com.easyrenting.property;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PropertyDtos {

    private PropertyDtos() {
    }

    public record PropertyImageDto(UUID id, String url, boolean cover, int sortOrder) {
    }

    public record OwnerSummaryDto(UUID id, String name, boolean verified, Instant memberSince) {
    }

    public record PropertySummaryDto(
            UUID id, String title, PropertyType propertyType, int bhk, int bathrooms, int areaSqft,
            Furnishing furnishing, TenantPreference tenantPreference, long rent, long deposit,
            String locality, String city, double latitude, double longitude, String coverImageUrl,
            List<Amenity> amenities, PropertyStatus status, LocalDate availableFrom, Instant createdAt,
            Double distanceKm, boolean ownerVerified, boolean shortlisted) {
    }

    public record PropertyDetailDto(
            UUID id, String title, PropertyType propertyType, int bhk, int bathrooms, int areaSqft,
            Furnishing furnishing, TenantPreference tenantPreference, long rent, long deposit,
            String locality, String city, double latitude, double longitude, String coverImageUrl,
            List<Amenity> amenities, PropertyStatus status, LocalDate availableFrom, Instant createdAt,
            Double distanceKm, boolean ownerVerified, boolean shortlisted,
            String description, long maintenance, Integer floor, Integer totalFloors, String facing,
            String addressLine, String state, String pincode, List<PropertyImageDto> images,
            OwnerSummaryDto owner, long viewCount, Instant updatedAt) {
    }

    public record StatusChangeRequest(@NotNull PropertyStatus status) {
    }
}
