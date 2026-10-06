package com.easyrenting.ai;

import com.easyrenting.ai.ParsedQuery.ParserType;
import com.easyrenting.config.AppProperties;
import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.TenantPreference;
import com.easyrenting.search.LocalityGazetteer;
import com.easyrenting.search.LocalityGazetteer.Locality;
import com.easyrenting.search.SearchFilters;
import com.easyrenting.search.SortBy;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Deterministic keyword/regex parser for Indian rental queries. Always available; used when no Anthropic API key is
 * configured or when the AI parser fails.
 *
 * <p>Interpretation choices: "furnished" alone means fully <em>or</em> semi furnished; "1RK" is bhk 0 while "studio"
 * is the STUDIO property type; "bachelors" without a gender means BACHELOR_MALE (the common Indian listing usage);
 * a bare amount with a unit ("30k") is a maximum rent; a comparator amount without a unit below 1000 is read as
 * thousands ("under 25" = ₹25,000).
 */
@Component
public class RuleBasedQueryParser implements QueryParser {

    static final double DEFAULT_NEAR_ME_RADIUS_KM = 5.0;

    private static final String AMOUNT = "(\\d+(?:\\.\\d+)?)\\s*(k|thousand|l|lakhs?|lacs?|lakh|cr|crores?)?\\b";
    /** Prevents "within 2 weeks" or "above 3 floors" from being read as rent. */
    private static final String NOT_A_RENT = "(?!\\s*(?:days?|weeks?|months?|years?|mins?|minutes?|km|kms|floors?|bath\\w*)\\b)";
    private static final String BHK_UNIT = "(?:bhk|b\\s*h\\s*k|bed(?:room)?s?|br)\\b";

    private static final Pattern RADIUS = Pattern.compile(
            "\\b(?:within|in|under|around)?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:km|kms|kilometers?|kilometres?)\\b");
    private static final Pattern RK = Pattern.compile("\\b(?:1\\s*)?rk\\b");
    private static final Pattern BHK_RANGE = Pattern.compile(
            "\\b(\\d{1,2})\\s*(or|/|-|to|,|and)\\s*(\\d{1,2})\\s*" + BHK_UNIT);
    private static final Pattern BHK_PLUS = Pattern.compile("\\b(\\d{1,2})\\s*\\+\\s*" + BHK_UNIT);
    private static final Pattern BHK_SINGLE = Pattern.compile("\\b(\\d{1,2})\\s*" + BHK_UNIT);

    private static final Pattern RENT_BETWEEN = Pattern.compile(
            "\\b(?:between|from|range)\\s+" + AMOUNT + "\\s*(?:and|to|-)\\s*" + AMOUNT);
    private static final Pattern RENT_RANGE = Pattern.compile(AMOUNT + "\\s*(?:-|to)\\s*" + AMOUNT);
    private static final Pattern RENT_MAX = Pattern.compile(
            "(?:\\bunder|\\bbelow|\\bless\\s+than|\\blesser\\s+than|\\bup\\s*to|\\bwithin|\\bmax(?:imum)?|"
                    + "\\bbudget(?:\\s+of|\\s+is)?|\\bnot\\s+more\\s+than|\\bcheaper\\s+than|<=?)\\s*" + AMOUNT + NOT_A_RENT);
    private static final Pattern RENT_MIN = Pattern.compile(
            "(?:\\babove|\\bover|\\bmore\\s+than|\\bat\\s*least|\\bmin(?:imum)?|\\bstarting(?:\\s+from)?|"
                    + "\\bgreater\\s+than|>=?)\\s*" + AMOUNT + NOT_A_RENT);
    private static final Pattern RENT_BARE = Pattern.compile(
            "\\b(\\d+(?:\\.\\d+)?)\\s*(k|thousand|lakhs?|lacs?|lakh)\\b");

    private static final Pattern NEAR_ME = Pattern.compile(
            "\\b(?:near\\s+me|nearby|near\\s+by|close\\s+to\\s+me|around\\s+me|near\\s+my\\s+(?:location|place)|my\\s+area)\\b");
    private static final Pattern FREE_LOCALITY = Pattern.compile("\\b(?:in|near|at|around)\\s+([a-z]+(?:\\s+[a-z]+)?)");

    private static final Pattern READY = Pattern.compile(
            "\\b(?:ready\\s+to\\s+move|immediate(?:ly)?|move[\\s-]?in\\s+now|available\\s+now|asap)\\b");
    private static final Pattern NEXT_MONTH = Pattern.compile("\\bnext\\s+month\\b");
    private static final Pattern THIS_MONTH = Pattern.compile("\\bthis\\s+month\\b");
    private static final Pattern WITHIN_PERIOD = Pattern.compile("\\bwithin\\s+(\\d{1,2})\\s+(day|week|month)s?\\b");
    private static final Pattern BY_MONTH = Pattern.compile(
            "\\b(?:by|before|from|in|available|starting)\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\b");

    private static final Map<Furnishing, Pattern> FURNISHING = new LinkedHashMap<>();
    private static final Map<PropertyType, Pattern> PROPERTY_TYPES = new LinkedHashMap<>();
    private static final Map<Amenity, Pattern> AMENITIES = new LinkedHashMap<>();
    private static final Map<SortBy, Pattern> SORTS = new LinkedHashMap<>();

    private static final Pattern FEMALE = Pattern.compile("\\b(?:girls?|ladies|women|female|females)\\b");
    private static final Pattern MALE = Pattern.compile("\\b(?:boys?|gents|men|male|males|bachelors?)\\b");
    private static final Pattern FAMILY = Pattern.compile("\\bfamil(?:y|ies)\\b");
    private static final Pattern COMPANY = Pattern.compile("\\b(?:company|corporate)(?:\\s+lease)?\\b");

    private static final Set<String> LOCALITY_STOP_WORDS = Set.of(
            "me", "my", "the", "a", "an", "under", "below", "above", "for", "with", "budget", "rent", "and", "or",
            "flat", "flats", "house", "apartment", "apartments", "area", "city", "range", "good", "nice", "any",
            "rs", "inr", "less", "more", "around", "near", "by", "month", "next", "this", "front", "between", "from",
            "pg", "studio", "villa", "furnished", "unfurnished", "semi", "family", "bachelors", "bachelor", "girls",
            "boys", "parking", "gym", "within", "walking", "distance", "metro", "lakh", "k", "least", "most", "total",
            "advance", "hurry", "need", "want", "looking", "search", "rented", "it", "is", "our", "your");

    private static final Map<String, String> NUMBER_WORDS = Map.of(
            "one", "1", "single", "1", "two", "2", "double", "2", "three", "3", "four", "4", "five", "5");

    static {
        FURNISHING.put(Furnishing.UNFURNISHED, Pattern.compile("\\b(?:un[\\s-]?furnished|not\\s+furnished|bare\\s+shell)\\b"));
        FURNISHING.put(Furnishing.SEMI_FURNISHED, Pattern.compile("\\bsemi[\\s-]?furnished\\b"));
        FURNISHING.put(Furnishing.FULLY_FURNISHED, Pattern.compile("\\b(?:fully|full|completely)[\\s-]?furnished\\b"));

        PROPERTY_TYPES.put(PropertyType.PG, Pattern.compile("\\b(?:pg|paying\\s+guest|hostel|co-?living)\\b"));
        PROPERTY_TYPES.put(PropertyType.STUDIO, Pattern.compile("\\bstudio(?:\\s+apartment)?s?\\b"));
        PROPERTY_TYPES.put(PropertyType.VILLA, Pattern.compile("\\bvillas?\\b"));
        PROPERTY_TYPES.put(PropertyType.INDEPENDENT_HOUSE, Pattern.compile(
                "\\b(?:independent(?:\\s+(?:house|floor|home))?|builder\\s+floor|bungalow|row\\s*house)s?\\b"));
        PROPERTY_TYPES.put(PropertyType.APARTMENT, Pattern.compile("\\b(?:flats?|apartments?|apts?|condos?)\\b"));

        AMENITIES.put(Amenity.PARKING, Pattern.compile("\\b(?:(?:car|bike|covered)\\s+)?parking\\b|\\bgarage\\b"));
        AMENITIES.put(Amenity.LIFT, Pattern.compile("\\b(?:lifts?|elevators?)\\b"));
        AMENITIES.put(Amenity.POWER_BACKUP, Pattern.compile(
                "\\b(?:power\\s*back\\s*-?up|generator|inverter|dg\\s*back\\s*-?up)\\b"));
        AMENITIES.put(Amenity.GYM, Pattern.compile("\\b(?:gym|gymnasium|fitness\\s+cent(?:er|re))\\b"));
        AMENITIES.put(Amenity.SWIMMING_POOL, Pattern.compile("\\b(?:swimming(?:\\s+pool)?|pool)\\b"));
        AMENITIES.put(Amenity.SECURITY, Pattern.compile("\\b(?:security|gated(?:\\s+(?:community|society))?|cctv|guards?)\\b"));
        AMENITIES.put(Amenity.WIFI, Pattern.compile("\\b(?:wi-?fi|internet|broadband)\\b"));
        AMENITIES.put(Amenity.AC, Pattern.compile("\\b(?:ac|a/c|air[\\s-]?condition(?:ed|ing|er)?)\\b"));
        AMENITIES.put(Amenity.GAS_PIPELINE, Pattern.compile(
                "\\b(?:gas\\s+pipe\\s*line|piped\\s+gas|gas\\s+connection|png\\s+connection)\\b"));
        AMENITIES.put(Amenity.CLUB_HOUSE, Pattern.compile("\\bclub\\s*house\\b"));
        AMENITIES.put(Amenity.PLAY_AREA, Pattern.compile(
                "\\b(?:play\\s*area|play\\s*ground|kids?\\s+play|children'?s?\\s+play)\\b"));
        AMENITIES.put(Amenity.PET_FRIENDLY, Pattern.compile(
                "\\b(?:pets?(?:[\\s-]+(?:friendly|allowed|ok))?|dogs?|cats?)\\b"));
        AMENITIES.put(Amenity.WASHING_MACHINE, Pattern.compile("\\b(?:washing\\s+machine|washer)\\b"));
        AMENITIES.put(Amenity.FRIDGE, Pattern.compile("\\b(?:fridge|refrigerator)\\b"));

        SORTS.put(SortBy.RENT_ASC, Pattern.compile(
                "\\b(?:cheapest|lowest\\s+(?:rent|price)|low\\s+to\\s+high|budget\\s+friendly|affordable)\\b"));
        SORTS.put(SortBy.RENT_DESC, Pattern.compile("\\b(?:most\\s+expensive|luxury|luxurious|premium|high\\s+to\\s+low)\\b"));
        SORTS.put(SortBy.NEWEST, Pattern.compile("\\b(?:newest|latest|new\\s+listings?|recently\\s+(?:added|listed))\\b"));
        SORTS.put(SortBy.DISTANCE, Pattern.compile("\\b(?:nearest|closest)\\b"));
    }

    private final LocalityGazetteer gazetteer;
    private final Clock clock;
    private final ZoneId zone;

    @Autowired
    public RuleBasedQueryParser(LocalityGazetteer gazetteer, Clock clock, AppProperties properties) {
        this(gazetteer, clock, properties.timezone());
    }

    RuleBasedQueryParser(LocalityGazetteer gazetteer, Clock clock, ZoneId zone) {
        this.gazetteer = gazetteer;
        this.clock = clock;
        this.zone = zone;
    }

    @Override
    public ParsedQuery parse(String query, Double lat, Double lng) {
        String original = normalise(query);
        Draft draft = new Draft();

        String text = extractRadius(original, draft);
        text = extractBhk(text, draft);
        extractRent(text, draft);
        extractFurnishing(original, draft);
        extractPropertyTypes(original, draft);
        extractTenantPreference(original, draft);
        extractAmenities(original, draft);
        extractAvailability(original, draft);
        extractSort(original, draft);
        extractLocation(original, draft, lat, lng);

        SearchFilters filters = draft.toFilters();
        return new ParsedQuery(filters, ExplanationBuilder.describe(filters), ParserType.RULES);
    }

    static String normalise(String query) {
        String text = query == null ? "" : query.toLowerCase(Locale.ROOT);
        text = text.replace('₹', ' ')
                .replaceAll("\\b(?:rs\\.?|inr)\\s*", " ")
                .replaceAll("(?<=\\d),(?=\\d)", "")
                .replace("/-", " ")
                .replaceAll("(?<=\\d)(?=(?:bhk|rk)\\b)", " ");
        for (Map.Entry<String, String> word : NUMBER_WORDS.entrySet()) {
            text = text.replaceAll("\\b" + word.getKey() + "(?=\\s+(?:bhk|bed|bedroom|br|rk)\\b)", word.getValue());
        }
        return text.replaceAll("\\s+", " ").trim();
    }

    private static String extractRadius(String text, Draft draft) {
        Matcher m = RADIUS.matcher(text);
        if (m.find()) {
            draft.radiusKm = Double.parseDouble(m.group(1));
            return remove(text, m);
        }
        return text;
    }

    private static String extractBhk(String text, Draft draft) {
        Matcher rk = RK.matcher(text);
        if (rk.find()) {
            draft.bhk.add(0);
            text = remove(text, rk);
        }
        Matcher range = BHK_RANGE.matcher(text);
        if (range.find()) {
            int a = Integer.parseInt(range.group(1));
            int b = Integer.parseInt(range.group(3));
            boolean inclusiveRange = range.group(2).equals("-") || range.group(2).equals("to");
            if (inclusiveRange) {
                for (int i = Math.min(a, b); i <= Math.max(a, b); i++) {
                    draft.addBhk(i);
                }
            } else {
                draft.addBhk(a);
                draft.addBhk(b);
            }
            return remove(text, range);
        }
        Matcher plus = BHK_PLUS.matcher(text);
        if (plus.find()) {
            int from = Integer.parseInt(plus.group(1));
            for (int i = from; i <= Math.min(from + 2, 10); i++) {
                draft.addBhk(i);
            }
            return remove(text, plus);
        }
        Matcher single = BHK_SINGLE.matcher(text);
        while (single.find()) {
            draft.addBhk(Integer.parseInt(single.group(1)));
        }
        return BHK_SINGLE.matcher(text).replaceAll(" ");
    }

    private static void extractRent(String text, Draft draft) {
        Matcher between = RENT_BETWEEN.matcher(text);
        if (between.find()) {
            draft.setRentRange(amount(between.group(1), between.group(2), true),
                    amount(between.group(3), between.group(4), true));
            return;
        }
        Matcher range = RENT_RANGE.matcher(text);
        while (range.find()) {
            boolean hasUnit = range.group(2) != null || range.group(4) != null;
            long low = amount(range.group(1), range.group(2) != null ? range.group(2) : range.group(4), hasUnit);
            long high = amount(range.group(3), range.group(4), hasUnit);
            if (hasUnit || (low >= 1000 && high >= 1000)) {
                draft.setRentRange(low, high);
                return;
            }
        }
        Matcher max = RENT_MAX.matcher(text);
        if (max.find()) {
            draft.maxRent = amount(max.group(1), max.group(2), true);
        }
        Matcher min = RENT_MIN.matcher(text);
        if (min.find()) {
            draft.minRent = amount(min.group(1), min.group(2), true);
        }
        if (draft.maxRent == null && draft.minRent == null) {
            Matcher bare = RENT_BARE.matcher(text);
            if (bare.find()) {
                draft.maxRent = amount(bare.group(1), bare.group(2), true);
            }
        }
        draft.normaliseRent();
    }

    /** Converts "25", "25k", "1.5 lakh" etc. to rupees; unit-less values below 1000 are read as thousands. */
    static long amount(String number, String unit, boolean smallMeansThousands) {
        double value = Double.parseDouble(number);
        String u = unit == null ? "" : unit;
        double multiplier;
        if (u.equals("k") || u.equals("thousand")) {
            multiplier = 1_000;
        } else if (u.equals("l") || u.startsWith("lakh") || u.startsWith("lac")) {
            multiplier = 100_000;
        } else if (u.startsWith("cr")) {
            multiplier = 10_000_000;
        } else {
            multiplier = smallMeansThousands && value < 1000 ? 1_000 : 1;
        }
        return Math.round(value * multiplier);
    }

    private static void extractFurnishing(String text, Draft draft) {
        String remaining = text;
        for (Map.Entry<Furnishing, Pattern> entry : FURNISHING.entrySet()) {
            Matcher m = entry.getValue().matcher(remaining);
            if (m.find()) {
                draft.furnishing.add(entry.getKey());
                remaining = m.replaceAll(" ");
            }
        }
        if (draft.furnishing.isEmpty() && remaining.matches(".*\\bfurnished\\b.*")) {
            draft.furnishing.add(Furnishing.FULLY_FURNISHED);
            draft.furnishing.add(Furnishing.SEMI_FURNISHED);
        }
    }

    private static void extractPropertyTypes(String text, Draft draft) {
        String remaining = text;
        for (Map.Entry<PropertyType, Pattern> entry : PROPERTY_TYPES.entrySet()) {
            Matcher m = entry.getValue().matcher(remaining);
            if (m.find()) {
                draft.propertyTypes.add(entry.getKey());
                remaining = m.replaceAll(" ");
            }
        }
    }

    private static void extractTenantPreference(String text, Draft draft) {
        if (FEMALE.matcher(text).find()) {
            draft.tenantPreference = TenantPreference.BACHELOR_FEMALE;
        } else if (FAMILY.matcher(text).find()) {
            draft.tenantPreference = TenantPreference.FAMILY;
        } else if (MALE.matcher(text).find()) {
            draft.tenantPreference = TenantPreference.BACHELOR_MALE;
        } else if (COMPANY.matcher(text).find()) {
            draft.tenantPreference = TenantPreference.COMPANY;
        }
    }

    private static void extractAmenities(String text, Draft draft) {
        AMENITIES.forEach((amenity, pattern) -> {
            if (pattern.matcher(text).find()) {
                draft.amenities.add(amenity);
            }
        });
    }

    private void extractAvailability(String text, Draft draft) {
        LocalDate today = LocalDate.now(clock.withZone(zone));
        if (READY.matcher(text).find()) {
            draft.availableBefore = today;
            return;
        }
        if (NEXT_MONTH.matcher(text).find()) {
            draft.availableBefore = today.plusMonths(1).with(TemporalAdjusters.lastDayOfMonth());
            return;
        }
        if (THIS_MONTH.matcher(text).find()) {
            draft.availableBefore = today.with(TemporalAdjusters.lastDayOfMonth());
            return;
        }
        Matcher within = WITHIN_PERIOD.matcher(text);
        if (within.find()) {
            int n = Integer.parseInt(within.group(1));
            draft.availableBefore = switch (within.group(2)) {
                case "day" -> today.plusDays(n);
                case "week" -> today.plusWeeks(n);
                default -> today.plusMonths(n);
            };
            return;
        }
        Matcher byMonth = BY_MONTH.matcher(text);
        if (byMonth.find()) {
            Month month = monthOf(byMonth.group(1));
            LocalDate candidate = today.withMonth(month.getValue()).with(TemporalAdjusters.lastDayOfMonth());
            draft.availableBefore = candidate.isBefore(today) ? candidate.plusYears(1)
                    .with(TemporalAdjusters.lastDayOfMonth()) : candidate;
        }
    }

    private static Month monthOf(String prefix) {
        for (Month month : Month.values()) {
            if (month.name().toLowerCase(Locale.ROOT).startsWith(prefix.substring(0, 3))) {
                return month;
            }
        }
        throw new IllegalArgumentException(prefix);
    }

    private static void extractSort(String text, Draft draft) {
        for (Map.Entry<SortBy, Pattern> entry : SORTS.entrySet()) {
            if (entry.getValue().matcher(text).find()) {
                draft.sort = entry.getKey();
                return;
            }
        }
    }

    private void extractLocation(String text, Draft draft, Double lat, Double lng) {
        Optional<Locality> locality = gazetteer.findLocalityIn(text);
        gazetteer.findCityIn(text).ifPresent(city -> draft.city = city);
        if (locality.isPresent()) {
            draft.locality = locality.get().name();
            draft.city = locality.get().city();
            return;
        }
        if (NEAR_ME.matcher(text).find() && lat != null && lng != null) {
            draft.lat = lat;
            draft.lng = lng;
            if (draft.radiusKm == null) {
                draft.radiusKm = DEFAULT_NEAR_ME_RADIUS_KM;
            }
            return;
        }
        Matcher free = FREE_LOCALITY.matcher(text);
        while (free.find()) {
            Optional<String> candidate = freeTextLocality(free.group(1));
            if (candidate.isPresent()) {
                draft.locality = candidate.get();
                return;
            }
        }
    }

    private Optional<String> freeTextLocality(String phrase) {
        List<String> words = new ArrayList<>(List.of(phrase.split(" ")));
        while (!words.isEmpty() && LOCALITY_STOP_WORDS.contains(words.getLast())) {
            words.removeLast();
        }
        if (words.isEmpty() || LOCALITY_STOP_WORDS.contains(words.getFirst()) || words.getFirst().length() < 3) {
            return Optional.empty();
        }
        String name = String.join(" ", words);
        if (gazetteer.canonicalCity(name).isPresent()) {
            return Optional.empty();
        }
        StringBuilder titled = new StringBuilder();
        for (String word : words) {
            titled.append(titled.isEmpty() ? "" : " ")
                    .append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return Optional.of(titled.toString());
    }

    private static String remove(String text, Matcher m) {
        return (text.substring(0, m.start()) + " " + text.substring(m.end())).replaceAll("\\s+", " ").trim();
    }

    /** Mutable accumulator for parse results. */
    private static final class Draft {
        String city;
        String locality;
        Double lat;
        Double lng;
        Double radiusKm;
        Long minRent;
        Long maxRent;
        final TreeSet<Integer> bhk = new TreeSet<>();
        final EnumSet<PropertyType> propertyTypes = EnumSet.noneOf(PropertyType.class);
        final EnumSet<Furnishing> furnishing = EnumSet.noneOf(Furnishing.class);
        TenantPreference tenantPreference;
        final EnumSet<Amenity> amenities = EnumSet.noneOf(Amenity.class);
        LocalDate availableBefore;
        SortBy sort;

        void addBhk(int value) {
            if (value >= 0 && value <= 10) {
                bhk.add(value);
            }
        }

        void setRentRange(long a, long b) {
            minRent = Math.min(a, b);
            maxRent = Math.max(a, b);
        }

        void normaliseRent() {
            if (minRent != null && maxRent != null && minRent > maxRent) {
                setRentRange(minRent, maxRent);
            }
        }

        SearchFilters toFilters() {
            return new SearchFilters(city, locality, lat, lng, radiusKm, minRent, maxRent,
                    List.copyOf(bhk), List.copyOf(propertyTypes), List.copyOf(furnishing), tenantPreference,
                    List.copyOf(amenities), availableBefore, null, sort);
        }
    }
}
