package com.easyrenting.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.time.ZoneId;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @DefaultValue("Asia/Kolkata") ZoneId timezone,
        @DefaultValue("false") boolean trustProxy,
        @Valid @NotNull Jwt jwt,
        @Valid @DefaultValue Cookie cookie,
        @Valid @DefaultValue Cors cors,
        @Valid @DefaultValue Storage storage,
        @Valid @DefaultValue Ai ai) {

    public record Jwt(
            @NotBlank String secret,
            @DefaultValue("easyrenting") String issuer,
            @DefaultValue("15m") Duration accessTokenTtl,
            @DefaultValue("30d") Duration refreshTokenTtl) {
    }

    public record Cookie(@DefaultValue("false") boolean secure) {
    }

    public record Cors(@DefaultValue("http://localhost:3000") List<String> allowedOrigins) {
    }

    public record Storage(@DefaultValue("./data/uploads") String localDir) {
    }

    public record Ai(
            @DefaultValue("") String anthropicApiKey,
            @DefaultValue("claude-opus-5-5") String model,
            @DefaultValue("15s") Duration timeout,
            @DefaultValue("1h") Duration cacheTtl,
            @DefaultValue("2000") long cacheMaxSize) {

        public boolean enabled() {
            return anthropicApiKey != null && !anthropicApiKey.isBlank();
        }
    }
}
