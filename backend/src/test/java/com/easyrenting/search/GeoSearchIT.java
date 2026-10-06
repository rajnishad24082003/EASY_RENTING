package com.easyrenting.search;

import static org.hamcrest.Matchers.closeTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.ResultActions;

class GeoSearchIT extends IntegrationTest {

    /** ~0.009° latitude ≈ 1 km. */
    private static final double KM = 0.009;

    private double lat;
    private double lng;
    private UUID center;
    private UUID twoKmNorth;
    private UUID tenKmNorth;
    private UUID unverifiedAtCenter;
    private UUID draftAtCenter;

    @BeforeEach
    void createListings() throws Exception {
        double[] point = isolatedPoint();
        lat = point[0];
        lng = point[1];
        Session owner = verifiedOwner();
        Session unverified = register(Role.OWNER);

        center = createListing(owner, listing(lat, lng, b -> {
            b.put("rent", 25_000);
            b.put("bhk", 2);
            b.put("furnishing", "FULLY_FURNISHED");
            b.put("amenities", List.of("PARKING", "GYM", "LIFT"));
        }));
        twoKmNorth = createListing(owner, listing(lat + 2 * KM, lng, b -> {
            b.put("rent", 40_000);
            b.put("bhk", 3);
            b.put("tenantPreference", "FAMILY");
            b.put("amenities", List.of("PARKING"));
        }));
        tenKmNorth = createListing(owner, listing(lat + 10 * KM, lng, b -> {
            b.put("rent", 20_000);
            b.put("bhk", 1);
        }));
        unverifiedAtCenter = createListing(unverified, listing(lat, lng, b -> { }));
        draftAtCenter = createListing(owner, listing(lat, lng, b -> b.put("status", "DRAFT")));
    }

    private ResultActions search(String query) throws Exception {
        return getAs(null, "/api/v1/search/properties?lat={lat}&lng={lng}" + query, lat, lng);
    }

    @Test
    void radiusSearchReturnsOnlyPublicListingsInsideRadiusSortedByDistance() throws Exception {
        search("&radiusKm=5")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].id", contains(center.toString(), twoKmNorth.toString())))
                .andExpect(jsonPath("$.content[0].distanceKm", closeTo(0.0, 0.05)))
                .andExpect(jsonPath("$.content[1].distanceKm", closeTo(2.0, 0.1)))
                .andExpect(jsonPath("$.content[0].ownerVerified").value(true))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20));

        search("&radiusKm=15")
                .andExpect(jsonPath("$.content[*].id",
                        contains(center.toString(), twoKmNorth.toString(), tenKmNorth.toString())));
    }

    @Test
    void defaultRadiusIsFiveKilometres() throws Exception {
        search("").andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void appliesStructuredFiltersAndSorting() throws Exception {
        search("&radiusKm=15&bhk=2&bhk=3")
                .andExpect(jsonPath("$.content[*].id", containsInAnyOrder(center.toString(), twoKmNorth.toString())));
        search("&radiusKm=15&maxRent=30000&sort=RENT_DESC")
                .andExpect(jsonPath("$.content[*].id", contains(center.toString(), tenKmNorth.toString())));
        search("&radiusKm=15&amenities=PARKING&amenities=GYM")
                .andExpect(jsonPath("$.content[*].id", contains(center.toString())));
        search("&radiusKm=15&furnishing=FULLY_FURNISHED")
                .andExpect(jsonPath("$.content[*].id", contains(center.toString())));
        // A FAMILY filter also matches listings open to ANY tenant.
        search("&radiusKm=15&tenantPreference=FAMILY")
                .andExpect(jsonPath("$.totalElements").value(3));
        search("&radiusKm=15&minRent=21000&size=1&page=1")
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void mapPinsHonourFiltersAndVisibility() throws Exception {
        getAs(null, "/api/v1/search/properties/map?lat={lat}&lng={lng}&radiusKm=15", lat, lng)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(center.toString()))
                .andExpect(jsonPath("$[0].rent").value(25_000));
    }

    @Test
    void validatesSearchParameters() throws Exception {
        getAs(null, "/api/v1/search/properties?lat=12.9").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        search("&radiusKm=100").andExpect(status().isBadRequest());
    }

    @Test
    void unverifiedOwnersAndDraftListingsAreNotPublic() throws Exception {
        getAs(null, "/api/v1/properties/{id}", unverifiedAtCenter).andExpect(status().isNotFound());
        getAs(null, "/api/v1/properties/{id}", draftAtCenter).andExpect(status().isNotFound());
    }

    @Test
    void shortlistedFlagIsSetForTenant() throws Exception {
        Session tenant = register(Role.TENANT);
        perform(put("/api/v1/shortlist/{id}", center), tenant).andExpect(status().isNoContent());

        getAs(tenant, "/api/v1/search/properties?lat={lat}&lng={lng}&radiusKm=1", lat, lng)
                .andExpect(jsonPath("$.content[0].shortlisted").value(true));
        getAs(tenant, "/api/v1/shortlist")
                .andExpect(jsonPath("$.content[*].id", contains(center.toString())));
        getAs(tenant, "/api/v1/properties/{id}", center).andExpect(jsonPath("$.shortlisted").value(true));
    }

    @Test
    void aiSearchFallsBackToRulesAndGeocodesTheLocality() throws Exception {
        postAs(null, "/api/v1/search/ai",
                Map.of("query", "2bhk furnished flat in koramangala under 40k for family with parking"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parser").value("RULES"))
                .andExpect(jsonPath("$.filters.locality").value("Koramangala"))
                .andExpect(jsonPath("$.filters.city").value("Bengaluru"))
                .andExpect(jsonPath("$.filters.lat").value(12.9352))
                .andExpect(jsonPath("$.filters.radiusKm").value(3.0))
                .andExpect(jsonPath("$.filters.maxRent").value(40_000))
                .andExpect(jsonPath("$.filters.bhk", contains(2)))
                .andExpect(jsonPath("$.explanation").isString())
                .andExpect(jsonPath("$.results.content").isArray());

        postAs(null, "/api/v1/search/ai", Map.of("query", "x"))
                .andExpect(status().isBadRequest());
    }
}
