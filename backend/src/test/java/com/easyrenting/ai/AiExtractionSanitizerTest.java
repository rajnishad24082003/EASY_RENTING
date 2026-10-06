package com.easyrenting.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.easyrenting.ai.ParsedQuery.ParserType;
import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import com.easyrenting.search.LocalityGazetteer;
import com.easyrenting.search.SearchFilters;
import com.easyrenting.search.SortBy;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class AiExtractionSanitizerTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-06T06:30:00Z"), ZoneOffset.UTC);

    private final AiExtractionSanitizer sanitizer = new AiExtractionSanitizer(new LocalityGazetteer(), CLOCK);

    private static AiExtraction extraction(String city, String locality, boolean nearMe, double radius, long minRent,
                                           long maxRent, List<Integer> bhk, List<String> types,
                                           List<String> furnishing, String tenant, List<String> amenities,
                                           String availableBefore, String sort, String explanation) {
        return new AiExtraction(city, locality, nearMe, radius, minRent, maxRent, bhk, types, furnishing, tenant,
                amenities, availableBefore, "", sort, explanation);
    }

    @Test
    void keepsValidValuesAndCanonicalisesNames() {
        ParsedQuery result = sanitizer.sanitize(extraction("bangalore", "koramangala", false, 0, 0, 40_000,
                List.of(2), List.of("APARTMENT"), List.of("FULLY_FURNISHED", "SEMI_FURNISHED"), "FAMILY",
                List.of("PARKING"), "", "", "2 BHK furnished flats"), null, null);
        SearchFilters f = result.filters();

        assertThat(result.parser()).isEqualTo(ParserType.AI);
        assertThat(f.city()).isEqualTo("Bengaluru");
        assertThat(f.locality()).isEqualTo("Koramangala");
        assertThat(f.maxRent()).isEqualTo(40_000L);
        assertThat(f.minRent()).isNull();
        assertThat(f.bhk()).containsExactly(2);
        assertThat(f.propertyType()).containsExactly(PropertyType.APARTMENT);
        assertThat(f.furnishing()).containsExactlyInAnyOrder(Furnishing.FULLY_FURNISHED, Furnishing.SEMI_FURNISHED);
        assertThat(f.tenantPreference()).isEqualTo(TenantPreference.FAMILY);
        assertThat(f.amenities()).containsExactly(Amenity.PARKING);
        assertThat(result.explanation()).isEqualTo("2 BHK furnished flats");
    }

    @Test
    void dropsUnknownEnumValuesAndOutOfRangeNumbers() {
        SearchFilters f = sanitizer.sanitize(extraction("", "", false, 500, -5, 99_000_000_000L,
                List.of(-1, 2, 2, 11, 3), List.of("CASTLE", "villa"), List.of("PARTLY"), "ALIENS",
                List.of("JACUZZI", "gym"), "", "BEST", ""), null, null).filters();

        assertThat(f.radiusKm()).isEqualTo(50.0);
        assertThat(f.minRent()).isNull();
        assertThat(f.maxRent()).isEqualTo(AiExtractionSanitizer.MAX_RENT);
        assertThat(f.bhk()).containsExactly(2, 3);
        assertThat(f.propertyType()).containsExactly(PropertyType.VILLA);
        assertThat(f.furnishing()).isEmpty();
        assertThat(f.tenantPreference()).isNull();
        assertThat(f.amenities()).containsExactly(Amenity.GYM);
        assertThat(f.sort()).isNull();
    }

    @Test
    void swapsInvertedRentRange() {
        SearchFilters f = sanitizer.sanitize(extraction("", "", false, 0, 30_000, 15_000, List.of(), List.of(),
                List.of(), "", List.of(), "", "RENT_ASC", "x"), null, null).filters();

        assertThat(f.minRent()).isEqualTo(15_000L);
        assertThat(f.maxRent()).isEqualTo(30_000L);
        assertThat(f.sort()).isEqualTo(SortBy.RENT_ASC);
    }

    @Test
    void appliesNearMeOnlyWithCoordinatesAndNoNamedLocality() {
        AiExtraction nearMe = extraction("", "", true, 0, 0, 0, List.of(), List.of(), List.of(), "", List.of(), "",
                "", "x");

        SearchFilters withCoordinates = sanitizer.sanitize(nearMe, 19.1, 72.9).filters();
        assertThat(withCoordinates.lat()).isEqualTo(19.1);
        assertThat(withCoordinates.radiusKm()).isEqualTo(5.0);

        assertThat(sanitizer.sanitize(nearMe, null, null).filters().hasGeo()).isFalse();
    }

    @Test
    void validatesDates() {
        AiExtraction valid = extraction("", "", false, 0, 0, 0, List.of(), List.of(), List.of(), "", List.of(),
                "2026-11-30", "", "x");
        AiExtraction garbage = extraction("", "", false, 0, 0, 0, List.of(), List.of(), List.of(), "", List.of(),
                "next tuesday", "", "x");
        AiExtraction farFuture = extraction("", "", false, 0, 0, 0, List.of(), List.of(), List.of(), "", List.of(),
                "2035-01-01", "", "x");

        assertThat(sanitizer.sanitize(valid, null, null).filters().availableBefore()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(sanitizer.sanitize(garbage, null, null).filters().availableBefore()).isNull();
        assertThat(sanitizer.sanitize(farFuture, null, null).filters().availableBefore()).isNull();
    }

    @Test
    void generatesExplanationWhenModelOmitsOne() {
        ParsedQuery result = sanitizer.sanitize(extraction("Pune", "", false, 0, 0, 20_000, List.of(1), List.of(),
                List.of(), "", List.of(), "", "", "  "), null, null);

        assertThat(result.explanation()).isEqualTo("1 BHK homes under ₹20,000 in Pune");
    }

    @Test
    void truncatesOverlongText() {
        String longText = "x".repeat(500);
        ParsedQuery result = sanitizer.sanitize(extraction(longText, "", false, 0, 0, 0, List.of(), List.of(),
                List.of(), "", List.of(), "", "", longText), null, null);

        assertThat(result.filters().city()).hasSize(AiExtractionSanitizer.MAX_TEXT);
        assertThat(result.explanation()).hasSize(AiExtractionSanitizer.MAX_EXPLANATION);
    }
}
