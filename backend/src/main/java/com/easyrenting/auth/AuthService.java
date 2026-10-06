package com.easyrenting.auth;

import com.easyrenting.auth.AuthDtos.AuthResponse;
import com.easyrenting.auth.AuthDtos.AuthResult;
import com.easyrenting.auth.AuthDtos.LoginRequest;
import com.easyrenting.auth.AuthDtos.RegisterRequest;
import com.easyrenting.common.ApiException;
import com.easyrenting.user.Role;
import com.easyrenting.user.User;
import com.easyrenting.user.UserDto;
import com.easyrenting.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokens;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService,
                       RefreshTokenService refreshTokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokens = refreshTokens;
        // Used to equalise timing between "unknown email" and "wrong password".
        this.dummyHash = passwordEncoder.encode("timing-equaliser-password-1");
    }

    @Transactional
    public AuthResult register(RegisterRequest request) {
        if (users.existsByEmail(request.email().trim())) {
            throw ApiException.conflict("An account with this email already exists");
        }
        User user = users.save(new User(request.name().trim(), request.email(), request.phone(),
                passwordEncoder.encode(request.password()), Role.valueOf(request.role())));
        return authenticate(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        User user = users.findByEmail(request.email().trim()).orElse(null);
        String hash = user != null ? user.getPasswordHash() : dummyHash;
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (user == null || !matches) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (user.isSuspended()) {
            throw ApiException.forbidden("This account has been suspended");
        }
        return authenticate(user);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthResult refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw ApiException.unauthorized("Refresh token missing");
        }
        RefreshTokenService.Rotation rotation = refreshTokens.rotate(rawRefreshToken);
        User user = users.findById(rotation.userId())
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
        if (user.isSuspended()) {
            refreshTokens.revokeAllForUser(user.getId());
            throw ApiException.forbidden("This account has been suspended");
        }
        return new AuthResult(response(user), rotation.newToken());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokens.revoke(rawRefreshToken);
        }
    }

    private AuthResult authenticate(User user) {
        return new AuthResult(response(user), refreshTokens.issue(user.getId()));
    }

    private AuthResponse response(User user) {
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getRole(), user.getName(), user.getEmail());
        return new AuthResponse(jwtService.issueAccessToken(principal), jwtService.accessTokenTtlSeconds(),
                UserDto.from(user));
    }
}
