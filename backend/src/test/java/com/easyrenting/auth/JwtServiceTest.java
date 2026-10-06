package com.easyrenting.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.easyrenting.config.AppProperties;
import com.easyrenting.user.Role;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtException;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-that-is-long-enough-1234";
    private static final AuthenticatedUser USER =
            new AuthenticatedUser(UUID.randomUUID(), Role.OWNER, "Rajesh Sharma", "owner@example.com");

    private static AppProperties properties(String secret, String issuer) {
        return new AppProperties(ZoneId.of("Asia/Kolkata"), false,
                new AppProperties.Jwt(secret, issuer, Duration.ofMinutes(15), Duration.ofDays(30)),
                new AppProperties.Cookie(false), new AppProperties.Cors(List.of("http://localhost:3000")),
                new AppProperties.Storage("./data"),
                new AppProperties.Ai("", "claude-opus-5-5", Duration.ofSeconds(15), Duration.ofHours(1), 100));
    }

    private static JwtService service(String secret, Clock clock) {
        return new JwtService(properties(secret, "easyrenting"), clock);
    }

    @Test
    void roundTripsClaims() {
        JwtService jwt = service(SECRET, Clock.systemUTC());
        String token = jwt.issueAccessToken(USER);

        assertThat(jwt.parse(token)).isEqualTo(USER);
        assertThat(jwt.accessTokenTtlSeconds()).isEqualTo(900);
    }

    @Test
    void rejectsTamperedTokens() {
        JwtService jwt = service(SECRET, Clock.systemUTC());
        String token = jwt.issueAccessToken(USER);
        String tampered = token.substring(0, token.length() - 3) + (token.endsWith("AAA") ? "BBB" : "AAA");

        assertThatThrownBy(() -> jwt.parse(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokensSignedWithAnotherKey() {
        String token = service("another-secret-that-is-also-long-enough-99", Clock.systemUTC()).issueAccessToken(USER);

        assertThatThrownBy(() -> service(SECRET, Clock.systemUTC()).parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsExpiredTokens() {
        Clock past = Clock.fixed(Instant.now().minus(Duration.ofHours(1)), ZoneOffset.UTC);
        String token = service(SECRET, past).issueAccessToken(USER);

        assertThatThrownBy(() -> service(SECRET, Clock.systemUTC()).parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsTokensFromAnotherIssuer() {
        String token = new JwtService(properties(SECRET, "someone-else"), Clock.systemUTC()).issueAccessToken(USER);

        assertThatThrownBy(() -> service(SECRET, Clock.systemUTC()).parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void failsFastOnShortSecrets() {
        assertThatThrownBy(() -> service("too-short", Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }
}
