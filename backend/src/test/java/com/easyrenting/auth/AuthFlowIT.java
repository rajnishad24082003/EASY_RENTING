package com.easyrenting.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class AuthFlowIT extends IntegrationTest {

    private ResultActions refresh(String refreshToken) throws Exception {
        return mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie(RefreshCookies.NAME, refreshToken)));
    }

    @Test
    void registerIssuesTokensAndHttpOnlyRefreshCookie() throws Exception {
        postAs(null, "/api/v1/auth/register", Map.of("name", "Ananya", "email", "Ananya.Reg@Test.in",
                "phone", "9876543210", "password", "Secret123", "role", "TENANT"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.user.email").value("ananya.reg@test.in"))
                .andExpect(jsonPath("$.user.role").value("TENANT"))
                .andExpect(jsonPath("$.user.verificationStatus").value("UNVERIFIED"))
                .andExpect(cookie().httpOnly(RefreshCookies.NAME, true))
                .andExpect(cookie().path(RefreshCookies.NAME, "/api/v1/auth"))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Lax")));
    }

    @Test
    void rejectsInvalidRegistrationWithFieldErrors() throws Exception {
        postAs(null, "/api/v1/auth/register", Map.of("name", "A", "email", "nope", "phone", "12345",
                "password", "password", "role", "ADMIN"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.type").value("about:blank"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[?(@.field == 'role')]").exists())
                .andExpect(jsonPath("$.errors[?(@.field == 'phone')]").exists());
    }

    @Test
    void duplicateEmailIsConflict() throws Exception {
        Session tenant = register(Role.TENANT);
        postAs(null, "/api/v1/auth/register", Map.of("name", "Dup", "email", tenant.email().toUpperCase(),
                "phone", "9876543210", "password", PASSWORD, "role", "TENANT"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() throws Exception {
        Session tenant = register(Role.TENANT);
        postAs(null, "/api/v1/auth/login", Map.of("email", tenant.email(), "password", "Wrong1234"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void protectedEndpointsReturnProblemJson() throws Exception {
        getAs(null, "/api/v1/users/me")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid or expired access token"));

        Session tenant = register(Role.TENANT);
        getAs(tenant, "/api/v1/users/me").andExpect(status().isOk()).andExpect(jsonPath("$.id").value(tenant.id().toString()));
        getAs(tenant, "/api/v1/admin/stats").andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void refreshRotatesTokenAndDetectsReuse() throws Exception {
        Session tenant = register(Role.TENANT);

        MvcResult first = refresh(tenant.refreshToken()).andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString()).andReturn();
        String rotated = first.getResponse().getCookie(RefreshCookies.NAME).getValue();
        assertThat(rotated).isNotEqualTo(tenant.refreshToken());

        // Presenting the already-rotated token is treated as theft...
        refresh(tenant.refreshToken()).andExpect(status().isUnauthorized());
        // ...and revokes the whole family, including the legitimately rotated token.
        refresh(rotated).andExpect(status().isUnauthorized());

        // A fresh login starts a new, unaffected family.
        Session again = login(tenant.email());
        refresh(again.refreshToken()).andExpect(status().isOk());
    }

    @Test
    void logoutRevokesRefreshTokenAndClearsCookie() throws Exception {
        Session tenant = register(Role.TENANT);

        mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie(RefreshCookies.NAME, tenant.refreshToken())))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(RefreshCookies.NAME, 0));
        refresh(tenant.refreshToken()).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void suspendedUsersCannotLoginOrRefresh() throws Exception {
        Session admin = admin();
        Session tenant = register(Role.TENANT);

        postAs(admin, "/api/v1/admin/users/{id}/suspend", null, tenant.id())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.suspended").value(true));

        postAs(null, "/api/v1/auth/login", Map.of("email", tenant.email(), "password", PASSWORD))
                .andExpect(status().isForbidden());
        refresh(tenant.refreshToken()).andExpect(status().isUnauthorized());

        postAs(admin, "/api/v1/admin/users/{id}/unsuspend", null, tenant.id()).andExpect(status().isOk());
        login(tenant.email());
    }

    @Test
    void profileCanBeUpdated() throws Exception {
        Session owner = register(Role.OWNER);
        perform(patch("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Renamed Owner\"}"), owner)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Renamed Owner"))
                .andExpect(jsonPath("$.phone").value("9876543210"));
    }
}
