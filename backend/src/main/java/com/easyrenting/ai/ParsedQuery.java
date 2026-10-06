package com.easyrenting.ai;

import com.easyrenting.search.SearchFilters;

/**
 * Parser output. {@code filters.locality} is the raw locality name; geocoding against the gazetteer happens in
 * {@link AiSearchService}.
 */
public record ParsedQuery(SearchFilters filters, String explanation, ParserType parser) {

    public enum ParserType { AI, RULES }
}
