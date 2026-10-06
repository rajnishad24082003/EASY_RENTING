package com.easyrenting.ai;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import java.util.List;

/**
 * Structured-output schema for Claude. Primitive/empty sentinels (0, "", []) mean "not mentioned" so the schema
 * stays simple; {@link AiExtractionSanitizer} validates and converts the result into search filters.
 */
public record AiExtraction(
        @JsonPropertyDescription("Canonical city name if the query names or clearly implies one (Bengaluru, Mumbai, "
                + "Pune, Hyderabad, Delhi, Gurugram, Noida, Chennai, or another Indian city). Empty string if none.")
        String city,

        @JsonPropertyDescription("Neighbourhood / locality name exactly as a resident would write it, e.g. "
                + "\"Koramangala\", \"HSR Layout\", \"Powai\". Empty string if none.")
        String locality,

        @JsonPropertyDescription("True only if the user asks for places near their current location "
                + "(\"near me\", \"nearby\", \"around me\").")
        boolean nearMe,

        @JsonPropertyDescription("Search radius in kilometres if explicitly stated (\"within 2 km\"), else 0.")
        double radiusKm,

        @JsonPropertyDescription("Minimum monthly rent in whole rupees, else 0.")
        long minRent,

        @JsonPropertyDescription("Maximum monthly rent in whole rupees, else 0. \"under 30k\" = 30000, "
                + "\"1.5 lakh\" = 150000.")
        long maxRent,

        @JsonPropertyDescription("Acceptable bedroom counts. 1RK or studio-sized = 0, \"2bhk\" = [2], "
                + "\"2 or 3 bhk\" = [2, 3]. Empty if not mentioned.")
        List<Integer> bhk,

        @JsonPropertyDescription("Zero or more of: APARTMENT, INDEPENDENT_HOUSE, VILLA, PG, STUDIO.")
        List<String> propertyTypes,

        @JsonPropertyDescription("Zero or more of: UNFURNISHED, SEMI_FURNISHED, FULLY_FURNISHED. Plain \"furnished\" "
                + "= [FULLY_FURNISHED, SEMI_FURNISHED].")
        List<String> furnishing,

        @JsonPropertyDescription("One of: FAMILY, BACHELOR_MALE, BACHELOR_FEMALE, COMPANY; empty string if not "
                + "mentioned.")
        String tenantPreference,

        @JsonPropertyDescription("Zero or more of: PARKING, LIFT, POWER_BACKUP, GYM, SWIMMING_POOL, SECURITY, WIFI, AC, "
                + "GAS_PIPELINE, CLUB_HOUSE, PLAY_AREA, PET_FRIENDLY, WASHING_MACHINE, FRIDGE.")
        List<String> amenities,

        @JsonPropertyDescription("Latest acceptable move-in date as YYYY-MM-DD, resolved against today's date; "
                + "empty string if not mentioned.")
        String availableBefore,

        @JsonPropertyDescription("Other distinctive words worth matching in listing text (e.g. \"sea view\", "
                + "\"balcony\"); empty string if none. Never repeat words already captured by other fields.")
        String keywords,

        @JsonPropertyDescription("One of: RELEVANCE, DISTANCE, RENT_ASC, RENT_DESC, NEWEST; empty string if the user "
                + "did not ask for an ordering.")
        String sort,

        @JsonPropertyDescription("One short sentence (max 20 words) describing what will be searched, e.g. "
                + "\"2 BHK furnished flats under ₹30,000 in Koramangala, Bengaluru\".")
        String explanation) {
}
