package com.easyrenting.auth;

import com.easyrenting.config.AppProperties;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Builds the {@code er_refresh} cookie: httpOnly, Path=/api/v1/auth, SameSite=Lax, Secure configurable. */
@Component
public class RefreshCookies {

    public static final String NAME = "er_refresh";
    static final String PATH = "/api/v1/auth";

    private final boolean secure;
    private final Duration maxAge;

    public RefreshCookies(AppProperties properties, RefreshTokenService refreshTokens) {
        this.secure = properties.cookie().secure();
        this.maxAge = refreshTokens.ttl();
    }

    public ResponseCookie issue(String token) {
        return base(token).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return base("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Lax").path(PATH);
    }
}
