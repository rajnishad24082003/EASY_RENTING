package com.easyrenting.ai;

import com.easyrenting.ai.AiSearchDtos.AiSearchRequest;
import com.easyrenting.ai.AiSearchDtos.AiSearchResponse;
import com.easyrenting.auth.AuthenticatedUser;
import com.easyrenting.common.web.PageResponse;
import com.easyrenting.config.AppProperties;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.search.LocalityGazetteer;
import com.easyrenting.search.SearchFilters;
import com.easyrenting.search.SearchService;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Natural-language search: parse (Claude when configured, otherwise or on failure the rule parser), geocode the
 * locality via the gazetteer, then run the regular geo search. Successful AI parses are cached for
 * {@code app.ai.cache-ttl} keyed by the normalised query and coarse (≈1 km) user location.
 */
@Service
public class AiSearchService {

    static final double LOCALITY_RADIUS_KM = 3.0;
    static final int RESULT_PAGE_SIZE = 20;

    private static final Logger log = LoggerFactory.getLogger(AiSearchService.class);

    private final Optional<ClaudeQueryParser> aiParser;
    private final RuleBasedQueryParser ruleParser;
    private final LocalityGazetteer gazetteer;
    private final SearchService searchService;
    private final Cache<String, ParsedQuery> cache;

    public AiSearchService(Optional<ClaudeQueryParser> aiParser, RuleBasedQueryParser ruleParser,
                           LocalityGazetteer gazetteer, SearchService searchService, AppProperties properties) {
        this.aiParser = aiParser;
        this.ruleParser = ruleParser;
        this.gazetteer = gazetteer;
        this.searchService = searchService;
        this.cache = Caffeine.newBuilder()
                .expireAfterWrite(properties.ai().cacheTtl())
                .maximumSize(properties.ai().cacheMaxSize())
                .build();
    }

    public AiSearchResponse search(AiSearchRequest request, AuthenticatedUser viewer) {
        ParsedQuery parsed = parse(request.query().strip(), request.lat(), request.lng());
        SearchFilters filters = geocode(parsed.filters());
        PageResponse<PropertySummaryDto> results = searchService.search(filters, 0, RESULT_PAGE_SIZE, viewer);
        return new AiSearchResponse(filters, parsed.explanation(), parsed.parser(), results);
    }

    ParsedQuery parse(String query, Double lat, Double lng) {
        long started = System.nanoTime();
        ParsedQuery result = aiParser.map(parser -> parseWithAi(parser, query, lat, lng))
                .orElseGet(() -> ruleParser.parse(query, lat, lng));
        log.info("Parsed search query with {} in {} ms", result.parser(), (System.nanoTime() - started) / 1_000_000);
        return result;
    }

    private ParsedQuery parseWithAi(ClaudeQueryParser parser, String query, Double lat, Double lng) {
        String key = cacheKey(query, lat, lng);
        ParsedQuery cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        try {
            ParsedQuery parsed = parser.parse(query, lat, lng);
            cache.put(key, parsed);
            return parsed;
        } catch (AiParsingException ex) {
            log.warn("AI query parsing failed, falling back to rules: {}", ex.getMessage());
            return ruleParser.parse(query, lat, lng);
        }
    }

    /** Resolves a named locality to gazetteer coordinates so radius filtering applies; else keeps ILIKE matching. */
    SearchFilters geocode(SearchFilters filters) {
        if (filters.hasGeo() || filters.locality() == null) {
            return filters;
        }
        return gazetteer.find(filters.locality(), filters.city())
                .map(l -> new SearchFilters(l.city(), l.name(), l.latitude(), l.longitude(),
                        filters.radiusKm() != null ? filters.radiusKm() : LOCALITY_RADIUS_KM,
                        filters.minRent(), filters.maxRent(), filters.bhk(), filters.propertyType(),
                        filters.furnishing(), filters.tenantPreference(), filters.amenities(),
                        filters.availableBefore(), filters.keywords(), filters.sort()))
                .orElse(filters);
    }

    private static String cacheKey(String query, Double lat, Double lng) {
        String location = lat == null || lng == null ? "-" : String.format(Locale.ROOT, "%.2f,%.2f", lat, lng);
        return LocalityGazetteer.normalise(query) + "|" + location;
    }
}
