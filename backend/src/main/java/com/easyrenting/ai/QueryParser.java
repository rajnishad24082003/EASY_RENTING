package com.easyrenting.ai;

/** Turns a natural-language rental query into structured search filters. */
public interface QueryParser {

    /**
     * @param query the user's free-text query
     * @param lat   the user's latitude, used to resolve "near me" (nullable)
     * @param lng   the user's longitude, used to resolve "near me" (nullable)
     */
    ParsedQuery parse(String query, Double lat, Double lng);
}
