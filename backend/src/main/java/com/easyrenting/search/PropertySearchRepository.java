package com.easyrenting.search;

import com.easyrenting.property.Amenity;
import com.easyrenting.property.Furnishing;
import com.easyrenting.property.PropertyDtos.PropertySummaryDto;
import com.easyrenting.property.PropertyStatus;
import com.easyrenting.property.PropertyType;
import com.easyrenting.property.PropertyVisibility;
import com.easyrenting.property.TenantPreference;
import com.easyrenting.search.SearchDtos.MapPinDto;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Dynamic listing search over PostGIS. All user input is bound as named parameters; ORDER BY clauses come from a
 * fixed whitelist keyed by {@link SortBy}. The public visibility rule is always applied.
 */
@Repository
public class PropertySearchRepository {

    public static final int MAX_MAP_PINS = 500;

    private static final String POINT = "ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography";

    private static final String SUMMARY_COLUMNS = """
            p.id, p.title, p.property_type, p.bhk, p.bathrooms, p.area_sqft, p.furnishing, p.tenant_preference,
            p.rent, p.deposit, p.locality, p.city, p.latitude, p.longitude, p.amenities, p.status,
            p.available_from, p.created_at,
            (u.verification_status = 'VERIFIED') AS owner_verified,
            (SELECT i.url FROM property_images i WHERE i.property_id = p.id
              ORDER BY i.cover DESC, i.sort_order LIMIT 1) AS cover_url""";

    private static final Map<SortBy, String> ORDER_BY = Map.of(
            SortBy.DISTANCE, "distance_km ASC, p.id",
            SortBy.NEWEST, "p.created_at DESC, p.id",
            SortBy.RENT_ASC, "p.rent ASC, p.created_at DESC, p.id",
            SortBy.RENT_DESC, "p.rent DESC, p.created_at DESC, p.id");

    private final JdbcClient jdbc;

    public PropertySearchRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public record SearchPage(List<PropertySummaryDto> content, long total) {
    }

    public SearchPage search(SearchFilters filters, int page, int size) {
        Where where = where(filters);
        String distance = filters.hasGeo() ? "ST_Distance(p.location, " + POINT + ") / 1000.0" : "NULL::double precision";
        String sql = "SELECT " + SUMMARY_COLUMNS + ", " + distance + " AS distance_km"
                + " FROM properties p JOIN users u ON u.id = p.owner_id"
                + " WHERE " + where.sql()
                + " ORDER BY " + ORDER_BY.get(filters.effectiveSort())
                + " LIMIT :limit OFFSET :offset";
        Map<String, Object> params = new HashMap<>(where.params());
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<PropertySummaryDto> content = jdbc.sql(sql).params(params).query(this::mapSummary).list();

        long total = jdbc.sql("SELECT count(*) FROM properties p JOIN users u ON u.id = p.owner_id WHERE " + where.sql())
                .params(where.params())
                .query(Long.class)
                .single();
        return new SearchPage(content, total);
    }

    public List<MapPinDto> mapPins(SearchFilters filters) {
        Where where = where(filters);
        String distance = filters.hasGeo() ? "ST_Distance(p.location, " + POINT + ")" : "NULL::double precision";
        String sql = "SELECT p.id, p.latitude, p.longitude, p.rent, p.bhk, p.title, " + distance + " AS distance_km"
                + " FROM properties p JOIN users u ON u.id = p.owner_id"
                + " WHERE " + where.sql()
                + " ORDER BY " + ORDER_BY.get(filters.effectiveSort())
                + " LIMIT " + MAX_MAP_PINS;
        return jdbc.sql(sql).params(where.params())
                .query((rs, row) -> new MapPinDto(rs.getObject("id", UUID.class), rs.getDouble("latitude"),
                        rs.getDouble("longitude"), rs.getLong("rent"), rs.getInt("bhk"), rs.getString("title")))
                .list();
    }

    private record Where(String sql, Map<String, Object> params) {
    }

    private static Where where(SearchFilters f) {
        List<String> clauses = new ArrayList<>();
        Map<String, Object> params = new HashMap<>();
        clauses.add(PropertyVisibility.SQL);

        if (f.hasGeo()) {
            clauses.add("ST_DWithin(p.location, " + POINT + ", :radiusM)");
            params.put("lat", f.lat());
            params.put("lng", f.lng());
            params.put("radiusM", f.radiusKm() * 1000.0);
        } else if (notBlank(f.locality())) {
            clauses.add("p.locality ILIKE :locality");
            params.put("locality", "%" + escapeLike(f.locality().trim()) + "%");
        }
        if (notBlank(f.city())) {
            clauses.add("lower(p.city) = lower(:city)");
            params.put("city", f.city().trim());
        }
        if (notBlank(f.keywords())) {
            clauses.add("(p.title ILIKE :q OR p.locality ILIKE :q OR p.description ILIKE :q)");
            params.put("q", "%" + escapeLike(f.keywords().trim()) + "%");
        }
        if (f.minRent() != null) {
            clauses.add("p.rent >= :minRent");
            params.put("minRent", f.minRent());
        }
        if (f.maxRent() != null) {
            clauses.add("p.rent <= :maxRent");
            params.put("maxRent", f.maxRent());
        }
        if (!f.bhk().isEmpty()) {
            clauses.add("p.bhk IN (:bhk)");
            params.put("bhk", f.bhk());
        }
        if (!f.propertyType().isEmpty()) {
            clauses.add("p.property_type IN (:propertyTypes)");
            params.put("propertyTypes", names(f.propertyType()));
        }
        if (!f.furnishing().isEmpty()) {
            clauses.add("p.furnishing IN (:furnishings)");
            params.put("furnishings", names(f.furnishing()));
        }
        if (f.tenantPreference() != null && f.tenantPreference() != TenantPreference.ANY) {
            // Listings open to ANY tenant also suit a specific preference.
            clauses.add("p.tenant_preference IN (:tenantPreference, 'ANY')");
            params.put("tenantPreference", f.tenantPreference().name());
        }
        if (!f.amenities().isEmpty()) {
            clauses.add("p.amenities @> CAST(:amenities AS text[])");
            params.put("amenities", f.amenities().stream().map(Enum::name).toArray(String[]::new));
        }
        if (f.availableBefore() != null) {
            clauses.add("p.available_from <= :availableBefore");
            params.put("availableBefore", f.availableBefore());
        }
        return new Where(String.join(" AND ", clauses), params);
    }

    private PropertySummaryDto mapSummary(ResultSet rs, int row) throws SQLException {
        double distance = rs.getDouble("distance_km");
        Double distanceKm = rs.wasNull() ? null : Math.round(distance * 100.0) / 100.0;
        return new PropertySummaryDto(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                PropertyType.valueOf(rs.getString("property_type")),
                rs.getInt("bhk"),
                rs.getInt("bathrooms"),
                rs.getInt("area_sqft"),
                Furnishing.valueOf(rs.getString("furnishing")),
                TenantPreference.valueOf(rs.getString("tenant_preference")),
                rs.getLong("rent"),
                rs.getLong("deposit"),
                rs.getString("locality"),
                rs.getString("city"),
                rs.getDouble("latitude"),
                rs.getDouble("longitude"),
                rs.getString("cover_url"),
                amenities(rs.getArray("amenities")),
                PropertyStatus.valueOf(rs.getString("status")),
                rs.getObject("available_from", LocalDate.class),
                rs.getObject("created_at", OffsetDateTime.class).toInstant(),
                distanceKm,
                rs.getBoolean("owner_verified"),
                false);
    }

    private static List<Amenity> amenities(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        return Arrays.stream((String[]) array.getArray()).map(Amenity::valueOf).sorted().toList();
    }

    private static List<String> names(List<? extends Enum<?>> values) {
        return values.stream().map(Enum::name).toList();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
