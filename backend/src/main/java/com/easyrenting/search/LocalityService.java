package com.easyrenting.search;

import com.easyrenting.property.PropertyVisibility;
import com.easyrenting.search.SearchDtos.LocalityDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Locality autocomplete: gazetteer entries first, then distinct localities of public listings. */
@Service
public class LocalityService {

    static final int MAX_RESULTS = 10;

    private final LocalityGazetteer gazetteer;
    private final JdbcClient jdbc;

    public LocalityService(LocalityGazetteer gazetteer, JdbcClient jdbc) {
        this.gazetteer = gazetteer;
        this.jdbc = jdbc;
    }

    public List<LocalityDto> autocomplete(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String q = query.trim();
        Map<String, LocalityDto> results = new LinkedHashMap<>();
        gazetteer.autocomplete(q, MAX_RESULTS).forEach(l ->
                results.putIfAbsent(key(l.name(), l.city()), new LocalityDto(l.name(), l.city(), l.latitude(), l.longitude())));
        if (results.size() < MAX_RESULTS) {
            String like = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            jdbc.sql("""
                    SELECT p.locality, p.city, avg(p.latitude) AS lat, avg(p.longitude) AS lng
                    FROM properties p JOIN users u ON u.id = p.owner_id
                    WHERE %s AND p.locality ILIKE :like
                    GROUP BY p.locality, p.city
                    ORDER BY count(*) DESC, p.locality
                    LIMIT :limit
                    """.formatted(PropertyVisibility.SQL))
                    .param("like", like)
                    .param("limit", MAX_RESULTS)
                    .query((rs, row) -> new LocalityDto(rs.getString("locality"), rs.getString("city"),
                            rs.getDouble("lat"), rs.getDouble("lng")))
                    .list()
                    .forEach(dto -> results.putIfAbsent(key(dto.name(), dto.city()), dto));
        }
        return results.values().stream().limit(MAX_RESULTS).toList();
    }

    private static String key(String name, String city) {
        return (name + "|" + city).toLowerCase(Locale.ROOT);
    }
}
