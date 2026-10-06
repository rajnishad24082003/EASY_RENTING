package com.easyrenting.property;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record PropertyRequest(
        @NotBlank @Size(min = 10, max = 120) String title,
        @NotBlank @Size(min = 30, max = 5000) String description,
        @NotNull PropertyType propertyType,
        @NotNull @Min(0) @Max(10) Integer bhk,
        @NotNull @Min(1) @Max(10) Integer bathrooms,
        @NotNull @Min(100) @Max(20000) Integer areaSqft,
        @NotNull Furnishing furnishing,
        @NotNull TenantPreference tenantPreference,
        @NotNull @Min(1000) @Max(10_000_000) Long rent,
        @NotNull @Min(0) Long deposit,
        @NotNull @Min(0) Long maintenance,
        @NotNull LocalDate availableFrom,
        @Min(-5) @Max(200) Integer floor,
        @Min(0) @Max(200) Integer totalFloors,
        @Size(max = 32) String facing,
        @NotBlank @Size(max = 255) String addressLine,
        @NotBlank @Size(max = 120) String locality,
        @NotBlank @Size(max = 80) String city,
        @NotBlank @Size(max = 80) String state,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "must be a 6-digit pincode") String pincode,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull List<@NotNull Amenity> amenities,
        PropertyStatus status) {
}
