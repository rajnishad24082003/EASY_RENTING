package com.easyrenting.ai;

import com.easyrenting.ai.ParsedQuery.ParserType;
import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import com.easyrenting.search.LocalityGazetteer;
import com.easyrenting.search.SearchFilters;
import com.easyrenting.search.SortBy;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeSet;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Treats model output as untrusted input: clamps numbers to contract ranges, drops unknown enum values and malformed
 * dates, trims free text, and canonicalises city/locality names against the gazetteer.
 */
@Component
public class AiExtractionSanitizer {

    static final long MAX_RENT = 10_000_000L;
    static final int MAX_TEXT = 120;
    static final int MAX_EXPLANATION = 200;

    private final LocalityGazetteer gazetteer;
    private final Clock clock;

    public AiExtractionSanitizer(LocalityGazetteer gazetteer, Clock clock) {
        this.gazetteer = gazetteer;
        this.clock = clock;
    }

    public ParsedQuery sanitize(AiExtraction raw, Double userLat, Double userLng) {
        String locality = text(raw.locality()).map(l -> gazetteer.find(l).map(LocalityGazetteer.Locality::name).orElse(l))
                .orElse(null);
        String city = text(raw.city()).map(c -> gazetteer.canonicalCity(c).orElse(c)).orElse(null);
        if (locality != null && city == null) {
            city = gazetteer.find(locality).map(LocalityGazetteer.Locality::city).orElse(null);
        }

        Double radius = raw.radiusKm() > 0
                ? Math.clamp(raw.radiusKm(), SearchFilters.MIN_RADIUS_KM, SearchFilters.MAX_RADIUS_KM)
                : null;
        Double lat = null;
        Double lng = null;
        if (raw.nearMe() && locality == null && userLat != null && userLng != null) {
            lat = userLat;
            lng = userLng;
            radius = radius != null ? radius : RuleBasedQueryParser.DEFAULT_NEAR_ME_RADIUS_KM;
        }

        Long minRent = rent(raw.minRent());
        Long maxRent = rent(raw.maxRent());
        if (minRent != null && maxRent != null && minRent > maxRent) {
            Long swap = minRent;
            minRent = maxRent;
            maxRent = swap;
        }

        SearchFilters filters = new SearchFilters(city, locality, lat, lng, radius, minRent, maxRent,
                bhk(raw.bhk()),
                enums(raw.propertyTypes(), PropertyType.class),
                enums(raw.furnishing(), Furnishing.class),
                text(raw.tenantPreference()).flatMap(v -> parseEnum(v, TenantPreference.class))
                        .filter(t -> t != TenantPreference.ANY).orElse(null),
                enums(raw.amenities(), Amenity.class),
                date(raw.availableBefore()),
                text(raw.keywords()).orElse(null),
                text(raw.sort()).flatMap(v -> parseEnum(v, SortBy.class)).orElse(null));

        String explanation = Optional.ofNullable(raw.explanation())
                .map(String::strip)
                .filter(e -> !e.isEmpty())
                .map(e -> e.length() > MAX_EXPLANATION ? e.substring(0, MAX_EXPLANATION - 1) + "…" : e)
                .orElseGet(() -> ExplanationBuilder.describe(filters));
        return new ParsedQuery(filters, explanation, ParserType.AI);
    }

    private static Long rent(long value) {
        return value > 0 ? Math.min(value, MAX_RENT) : null;
    }

    private static List<Integer> bhk(List<Integer> values) {
        if (values == null) {
            return List.of();
        }
        return List.copyOf(values.stream().filter(Objects::nonNull).filter(b -> b >= 0 && b <= 10)
                .collect(Collectors.toCollection(TreeSet::new)));
    }

    private static <E extends Enum<E>> List<E> enums(Collection<String> values, Class<E> type) {
        if (values == null) {
            return List.of();
        }
        EnumSet<E> set = EnumSet.noneOf(type);
        values.stream().filter(Objects::nonNull).forEach(v -> parseEnum(v, type).ifPresent(set::add));
        return List.copyOf(set);
    }

    private static <E extends Enum<E>> Optional<E> parseEnum(String value, Class<E> type) {
        try {
            return Optional.of(Enum.valueOf(type, value.trim().toUpperCase(Locale.ROOT).replace(' ', '_')));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    private LocalDate date(String value) {
        Optional<String> text = text(value);
        if (text.isEmpty()) {
            return null;
        }
        try {
            LocalDate date = LocalDate.parse(text.get());
            LocalDate today = LocalDate.now(clock);
            // Ignore dates in the past or absurdly far ahead (likely hallucinated).
            return date.isBefore(today.minusDays(1)) || date.isAfter(today.plusYears(2)) ? null : date;
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private static Optional<String> text(String value) {
        if (value == null) {
            return Optional.empty();
        }
        String trimmed = value.strip();
        if (trimmed.isEmpty() || trimmed.equalsIgnoreCase("null") || trimmed.equalsIgnoreCase("none")) {
            return Optional.empty();
        }
        return Optional.of(trimmed.length() > MAX_TEXT ? trimmed.substring(0, MAX_TEXT) : trimmed);
    }
}
