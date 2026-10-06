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
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class RuleBasedQueryParserTest {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    /** 2026-10-06 12:00 IST. */
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-06T06:30:00Z"), ZoneOffset.UTC);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 6);

    private final RuleBasedQueryParser parser = new RuleBasedQueryParser(new LocalityGazetteer(), CLOCK, IST);

    private SearchFilters parse(String query) {
        return parser.parse(query, null, null).filters();
    }

    @Test
    void parsesTheFullShowcaseQuery() {
        ParsedQuery result = parser.parse("2bhk furnished flat in koramangala under 40k for family with parking",
                null, null);
        SearchFilters f = result.filters();

        assertThat(result.parser()).isEqualTo(ParserType.RULES);
        assertThat(f.bhk()).containsExactly(2);
        assertThat(f.furnishing()).containsExactlyInAnyOrder(Furnishing.FULLY_FURNISHED, Furnishing.SEMI_FURNISHED);
        assertThat(f.propertyType()).containsExactly(PropertyType.APARTMENT);
        assertThat(f.maxRent()).isEqualTo(40_000L);
        assertThat(f.minRent()).isNull();
        assertThat(f.tenantPreference()).isEqualTo(TenantPreference.FAMILY);
        assertThat(f.amenities()).containsExactly(Amenity.PARKING);
        assertThat(f.locality()).isEqualTo("Koramangala");
        assertThat(f.city()).isEqualTo("Bengaluru");
        assertThat(result.explanation())
                .isEqualTo("2 BHK furnished apartments for families with parking under ₹40,000 in Koramangala, Bengaluru");
    }

    @ParameterizedTest(name = "\"{0}\" -> bhk {1}")
    @CsvSource(delimiter = '|', value = {
            "2bhk in hsr            | 2",
            "2 bhk flat             | 2",
            "two bedroom apartment  | 2",
            "3 BHK for rent         | 3",
            "1rk near metro         | 0",
            "1 rk                   | 0"
    })
    void parsesSingleBhkVariants(String query, int expected) {
        assertThat(parse(query).bhk()).containsExactly(expected);
    }

    @Test
    void parsesBhkAlternativesAndOpenRanges() {
        assertThat(parse("2 or 3 bhk in bangalore").bhk()).containsExactly(2, 3);
        assertThat(parse("2-4 bhk").bhk()).containsExactly(2, 3, 4);
        assertThat(parse("3+ bhk villa").bhk()).containsExactly(3, 4, 5);
    }

    @ParameterizedTest(name = "\"{0}\" -> maxRent {1}")
    @CsvSource(delimiter = '|', value = {
            "flat under 25k                 | 25000",
            "flat under 25,000              | 25000",
            "below ₹25000                   | 25000",
            "less than rs. 18,500           | 18500",
            "budget 1.5 lakh                | 150000",
            "upto 2 lakhs in bandra         | 200000",
            "under 25                       | 25000",
            "30k 2bhk whitefield            | 30000"
    })
    void parsesMaximumRent(String query, long expected) {
        SearchFilters f = parse(query);
        assertThat(f.maxRent()).isEqualTo(expected);
        assertThat(f.minRent()).isNull();
    }

    @Test
    void parsesRentRangesAndMinimums() {
        SearchFilters between = parse("between 15k and 25k");
        assertThat(between.minRent()).isEqualTo(15_000L);
        assertThat(between.maxRent()).isEqualTo(25_000L);

        SearchFilters dashed = parse("2bhk 15k-25k");
        assertThat(dashed.minRent()).isEqualTo(15_000L);
        assertThat(dashed.maxRent()).isEqualTo(25_000L);
        assertThat(dashed.bhk()).containsExactly(2);

        SearchFilters above = parse("villa above 50k");
        assertThat(above.minRent()).isEqualTo(50_000L);
        assertThat(above.maxRent()).isNull();
        assertThat(above.propertyType()).containsExactly(PropertyType.VILLA);
    }

    @Test
    void distinguishesFurnishingLevels() {
        assertThat(parse("fully furnished 1bhk").furnishing()).containsExactly(Furnishing.FULLY_FURNISHED);
        assertThat(parse("semi-furnished flat").furnishing()).containsExactly(Furnishing.SEMI_FURNISHED);
        assertThat(parse("unfurnished house").furnishing()).containsExactly(Furnishing.UNFURNISHED);
        assertThat(parse("furnished").furnishing())
                .containsExactlyInAnyOrder(Furnishing.FULLY_FURNISHED, Furnishing.SEMI_FURNISHED);
    }

    @Test
    void parsesPropertyTypes() {
        assertThat(parse("studio apartment in powai").propertyType()).containsExactly(PropertyType.STUDIO);
        assertThat(parse("independent house for company lease").propertyType())
                .containsExactly(PropertyType.INDEPENDENT_HOUSE);
        assertThat(parse("paying guest in electronic city").propertyType()).containsExactly(PropertyType.PG);
    }

    @Test
    void parsesTenantPreferences() {
        assertThat(parse("pg for girls in btm layout").tenantPreference()).isEqualTo(TenantPreference.BACHELOR_FEMALE);
        assertThat(parse("flat for bachelors").tenantPreference()).isEqualTo(TenantPreference.BACHELOR_MALE);
        assertThat(parse("house for families").tenantPreference()).isEqualTo(TenantPreference.FAMILY);
        assertThat(parse("independent house for company lease").tenantPreference()).isEqualTo(TenantPreference.COMPANY);
    }

    @Test
    void mapsAmenitySynonyms() {
        assertThat(parse("pet friendly flat with gym, swimming pool, elevator and power backup").amenities())
                .containsExactlyInAnyOrder(Amenity.PET_FRIENDLY, Amenity.GYM, Amenity.SWIMMING_POOL, Amenity.LIFT,
                        Amenity.POWER_BACKUP);
        assertThat(parse("gated community with wifi, ac and washing machine").amenities())
                .containsExactlyInAnyOrder(Amenity.SECURITY, Amenity.WIFI, Amenity.AC, Amenity.WASHING_MACHINE);
    }

    @Test
    void resolvesGazetteerLocalitiesAndCityAliases() {
        SearchFilters f = parse("2bhk in BTM");
        assertThat(f.locality()).isEqualTo("BTM Layout");
        assertThat(f.city()).isEqualTo("Bengaluru");

        SearchFilters city = parse("1bhk in gurgaon");
        assertThat(city.city()).isEqualTo("Gurugram");
        assertThat(city.locality()).isNull();
    }

    @Test
    void fallsBackToFreeTextLocalityForUnknownNames() {
        SearchFilters f = parse("2bhk in kalyan nagar under 30k");
        assertThat(f.locality()).isEqualTo("Kalyan Nagar");
        assertThat(f.maxRent()).isEqualTo(30_000L);
    }

    @Test
    void nearMeUsesTheCallersLocationOnlyWhenProvided() {
        SearchFilters withLocation = parser.parse("1bhk near me", 12.97, 77.59).filters();
        assertThat(withLocation.lat()).isEqualTo(12.97);
        assertThat(withLocation.lng()).isEqualTo(77.59);
        assertThat(withLocation.radiusKm()).isEqualTo(5.0);

        SearchFilters withoutLocation = parse("1bhk near me");
        assertThat(withoutLocation.hasGeo()).isFalse();
        assertThat(withoutLocation.locality()).isNull();
    }

    @Test
    void radiusIsNotMistakenForRent() {
        SearchFilters f = parse("flat within 2 km of indiranagar under 35k");
        assertThat(f.radiusKm()).isEqualTo(2.0);
        assertThat(f.locality()).isEqualTo("Indiranagar");
        assertThat(f.maxRent()).isEqualTo(35_000L);
    }

    @Test
    void resolvesRelativeAvailabilityDates() {
        assertThat(parse("ready to move 2bhk").availableBefore()).isEqualTo(TODAY);
        assertThat(parse("available from next month").availableBefore()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(parse("available by december").availableBefore()).isEqualTo(LocalDate.of(2026, 12, 31));
        assertThat(parse("available by march").availableBefore()).isEqualTo(LocalDate.of(2027, 3, 31));

        SearchFilters withinWeeks = parse("flat within 2 weeks");
        assertThat(withinWeeks.availableBefore()).isEqualTo(TODAY.plusWeeks(2));
        assertThat(withinWeeks.maxRent()).isNull();
    }

    @Test
    void parsesSortIntent() {
        assertThat(parse("cheapest 1bhk in pune").sort()).isEqualTo(SortBy.RENT_ASC);
        assertThat(parse("latest listings in baner").sort()).isEqualTo(SortBy.NEWEST);
        assertThat(parse("luxury villa").sort()).isEqualTo(SortBy.RENT_DESC);
    }

    @Test
    void returnsEmptyFiltersForUnrelatedText() {
        ParsedQuery result = parser.parse("hello there", null, null);
        SearchFilters f = result.filters();
        assertThat(f.bhk()).isEmpty();
        assertThat(f.maxRent()).isNull();
        assertThat(f.locality()).isNull();
        assertThat(result.explanation()).isEqualTo("Homes");
    }
}
