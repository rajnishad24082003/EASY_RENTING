package com.easyrenting.ai;

import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.search.SearchFilters;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/** Renders filters as one short human-readable sentence, e.g. "2 BHK furnished apartments under ₹30,000 in Koramangala". */
public final class ExplanationBuilder {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    private ExplanationBuilder() {
    }

    public static String describe(SearchFilters f) {
        List<String> parts = new ArrayList<>();
        bhkLabel(f.bhk()).ifPresent(parts::add);
        furnishingLabel(f.furnishing()).ifPresent(parts::add);
        parts.add(typeLabel(f.propertyType()));
        if (f.tenantPreference() != null) {
            switch (f.tenantPreference()) {
                case FAMILY -> parts.add("for families");
                case BACHELOR_MALE -> parts.add("for male bachelors");
                case BACHELOR_FEMALE -> parts.add("for female bachelors");
                case COMPANY -> parts.add("for company lease");
                case ANY -> { }
            }
        }
        if (!f.amenities().isEmpty()) {
            parts.add("with " + joinWithAnd(f.amenities().stream().map(ExplanationBuilder::amenityLabel).toList()));
        }
        rentLabel(f.minRent(), f.maxRent()).ifPresent(parts::add);
        locationLabel(f).ifPresent(parts::add);
        if (f.availableBefore() != null) {
            parts.add("available by " + DATE.format(f.availableBefore()));
        }
        String sentence = String.join(" ", parts);
        return Character.toUpperCase(sentence.charAt(0)) + sentence.substring(1);
    }

    public static String rupees(long amount) {
        return "₹" + NumberFormat.getIntegerInstance(Locale.forLanguageTag("en-IN")).format(amount);
    }

    private static Optional<String> bhkLabel(List<Integer> bhk) {
        if (bhk.isEmpty()) {
            return Optional.empty();
        }
        List<String> labels = bhk.stream().sorted().map(b -> b == 0 ? "1 RK" : b + " BHK").toList();
        if (labels.size() == 1) {
            return Optional.of(labels.getFirst());
        }
        String numbers = bhk.stream().sorted().filter(b -> b > 0).map(String::valueOf).collect(Collectors.joining("/"));
        String label = numbers.isEmpty() ? "" : numbers + " BHK";
        if (bhk.contains(0)) {
            label = label.isEmpty() ? "1 RK" : "1 RK or " + label;
        }
        return Optional.of(label);
    }

    private static Optional<String> furnishingLabel(List<Furnishing> furnishing) {
        if (furnishing.isEmpty()) {
            return Optional.empty();
        }
        EnumSet<Furnishing> set = EnumSet.copyOf(furnishing);
        if (set.equals(EnumSet.of(Furnishing.FULLY_FURNISHED, Furnishing.SEMI_FURNISHED))) {
            return Optional.of("furnished");
        }
        return Optional.of(set.stream().map(fu -> switch (fu) {
            case FULLY_FURNISHED -> "fully furnished";
            case SEMI_FURNISHED -> "semi-furnished";
            case UNFURNISHED -> "unfurnished";
        }).collect(Collectors.joining(" or ")));
    }

    private static String typeLabel(List<PropertyType> types) {
        if (types.isEmpty()) {
            return "homes";
        }
        return joinWithOr(types.stream().map(t -> switch (t) {
            case APARTMENT -> "apartments";
            case INDEPENDENT_HOUSE -> "independent houses";
            case VILLA -> "villas";
            case PG -> "PGs";
            case STUDIO -> "studios";
        }).toList());
    }

    private static Optional<String> rentLabel(Long min, Long max) {
        if (min != null && max != null) {
            return Optional.of("between " + rupees(min) + " and " + rupees(max));
        }
        if (max != null) {
            return Optional.of("under " + rupees(max));
        }
        if (min != null) {
            return Optional.of("above " + rupees(min));
        }
        return Optional.empty();
    }

    private static Optional<String> locationLabel(SearchFilters f) {
        if (f.locality() != null && f.city() != null) {
            return Optional.of("in " + f.locality() + ", " + f.city());
        }
        if (f.locality() != null) {
            return Optional.of("in " + f.locality());
        }
        if (f.hasGeo()) {
            return Optional.of("near you");
        }
        if (f.city() != null) {
            return Optional.of("in " + f.city());
        }
        return Optional.empty();
    }

    private static String amenityLabel(Amenity amenity) {
        return switch (amenity) {
            case AC -> "AC";
            case WIFI -> "Wi-Fi";
            case PET_FRIENDLY -> "pets allowed";
            default -> amenity.name().toLowerCase(Locale.ROOT).replace('_', ' ');
        };
    }

    private static String joinWithAnd(List<String> items) {
        return join(items, " and ");
    }

    private static String joinWithOr(List<String> items) {
        return join(items, " or ");
    }

    private static String join(List<String> items, String last) {
        if (items.size() <= 1) {
            return String.join("", items);
        }
        return String.join(", ", items.subList(0, items.size() - 1)) + last + items.getLast();
    }
}
