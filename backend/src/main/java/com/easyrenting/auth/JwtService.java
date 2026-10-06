package com.easyrenting.auth;

import com.easyrenting.config.AppProperties;
import com.easyrenting.user.Role;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

/** Issues and verifies HS256 access tokens ({@code sub}=userId, {@code role}, {@code name}, {@code email}). */
@Service
public class JwtService {

    static final int MIN_SECRET_BYTES = 32;

    private final JwtEncoder encoder;
    private final NimbusJwtDecoder decoder;
    private final String issuer;
    private final Duration accessTokenTtl;
    private final Clock clock;

    public JwtService(AppProperties properties, Clock clock) {
        AppProperties.Jwt jwt = properties.jwt();
        byte[] secret = jwt.secret() == null ? new byte[0] : jwt.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "app.jwt.secret (JWT_SECRET) must be at least " + MIN_SECRET_BYTES + " bytes long");
        }
        SecretKey key = new SecretKeySpec(secret, "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        this.decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        this.decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(jwt.issuer()));
        this.issuer = jwt.issuer();
        this.accessTokenTtl = jwt.accessTokenTtl();
        this.clock = clock;
    }

    public String issueAccessToken(AuthenticatedUser user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(user.id().toString())
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenTtl))
                .id(UUID.randomUUID().toString())
                .claim("role", user.role().name())
                .claim("name", user.displayName())
                .claim("email", user.email())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    /**
     * Verifies signature, issuer and expiry.
     *
     * @throws JwtException if the token is malformed, tampered with or expired
     */
    public AuthenticatedUser parse(String token) {
        return toPrincipal(decoder.decode(token));
    }

    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    public JwtDecoder decoder() {
        return decoder;
    }

    static AuthenticatedUser toPrincipal(Jwt jwt) {
        try {
            return new AuthenticatedUser(
                    UUID.fromString(jwt.getSubject()),
                    Role.valueOf(jwt.getClaimAsString("role")),
                    jwt.getClaimAsString("name"),
                    jwt.getClaimAsString("email"));
        } catch (RuntimeException ex) {
            throw new BadJwtException("Malformed token claims", ex);
        }
    }
}
