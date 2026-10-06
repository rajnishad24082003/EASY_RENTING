package com.easyrenting;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

/**
 * Base for integration tests: full application on a random port against a shared PostGIS Testcontainer. Tests
 * isolate themselves with unique users and coordinates rather than cleaning the database.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    protected static final String PASSWORD = "Secret123";
    protected static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JsonMapper json;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected PasswordEncoder passwordEncoder;
    @Autowired
    protected TransactionTemplate transactions;

    protected record Session(UUID id, String token, String email, String refreshToken) {
    }

    // --- HTTP helpers -------------------------------------------------------------------------------------------

    protected ResultActions perform(AbstractMockHttpServletRequestBuilder<?> request, Session session) throws Exception {
        if (session != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + session.token());
        }
        return mvc.perform(request);
    }

    protected ResultActions getAs(Session session, String url, Object... vars) throws Exception {
        return perform(get(url, vars), session);
    }

    protected ResultActions postAs(Session session, String url, Object body, Object... vars) throws Exception {
        MockHttpServletRequestBuilder request = post(url, vars);
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return perform(request, session);
    }

    protected static <T> T read(ResultActions actions, String path) throws Exception {
        return JsonPath.read(actions.andReturn().getResponse().getContentAsString(), path);
    }

    protected static <T> T read(MvcResult result, String path) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), path);
    }

    // --- Fixtures -----------------------------------------------------------------------------------------------

    protected Session register(Role role) throws Exception {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@test.in";
        MvcResult result = postAs(null, "/api/v1/auth/register", Map.of(
                "name", "Test " + role.name().toLowerCase(), "email", email, "phone", "9876543210",
                "password", PASSWORD, "role", role.name())).andReturn();
        if (result.getResponse().getStatus() != 201) {
            throw new IllegalStateException("Registration failed: " + result.getResponse().getContentAsString());
        }
        return new Session(UUID.fromString(read(result, "$.user.id")), read(result, "$.accessToken"), email,
                result.getResponse().getCookie("er_refresh").getValue());
    }

    protected Session login(String email) throws Exception {
        MvcResult result = postAs(null, "/api/v1/auth/login", Map.of("email", email, "password", PASSWORD)).andReturn();
        return new Session(UUID.fromString(read(result, "$.user.id")), read(result, "$.accessToken"), email,
                result.getResponse().getCookie("er_refresh").getValue());
    }

    /** An owner whose verification is already approved, so their ACTIVE listings are public. */
    protected Session verifiedOwner() throws Exception {
        Session owner = register(Role.OWNER);
        transactions.executeWithoutResult(status -> {
            User user = users.findById(owner.id()).orElseThrow();
            user.submitVerification(Instant.now());
            user.approveVerification(Instant.now());
        });
        return owner;
    }

    protected Session admin() throws Exception {
        String email = "admin-" + UUID.randomUUID() + "@test.in";
        users.save(new User("Test Admin", email, "9000000000", passwordEncoder.encode(PASSWORD), Role.ADMIN));
        return login(email);
    }

    protected static Map<String, Object> listing(double lat, double lng, Consumer<Map<String, Object>> customizer) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", "Bright 2 BHK apartment near the park");
        body.put("description", "A well maintained home with good light, ventilation and a quiet neighbourhood.");
        body.put("propertyType", "APARTMENT");
        body.put("bhk", 2);
        body.put("bathrooms", 2);
        body.put("areaSqft", 1100);
        body.put("furnishing", "SEMI_FURNISHED");
        body.put("tenantPreference", "ANY");
        body.put("rent", 30_000);
        body.put("deposit", 150_000);
        body.put("maintenance", 2_000);
        body.put("availableFrom", LocalDate.now().toString());
        body.put("addressLine", "12, Test Residency");
        body.put("locality", "Testnagar");
        body.put("city", "Bengaluru");
        body.put("state", "Karnataka");
        body.put("pincode", "560034");
        body.put("latitude", lat);
        body.put("longitude", lng);
        body.put("amenities", List.of("PARKING", "LIFT"));
        customizer.accept(body);
        return body;
    }

    protected UUID createListing(Session owner, Map<String, Object> body) throws Exception {
        ResultActions result = postAs(owner, "/api/v1/properties", body);
        if (result.andReturn().getResponse().getStatus() != 201) {
            throw new IllegalStateException("Listing creation failed: "
                    + result.andReturn().getResponse().getContentAsString());
        }
        return UUID.fromString(read(result, "$.id"));
    }

    /** A random point in central India, far from other tests' data, so geo assertions are isolated. */
    protected static double[] isolatedPoint() {
        return new double[] {20 + Math.random() * 3, 76 + Math.random() * 4};
    }

    protected static Instant futureSlot(int daysAhead, int hour) {
        return LocalDate.now(IST).plusDays(daysAhead).atTime(LocalTime.of(hour, 0)).atZone(IST).toInstant();
    }
}
