package com.easyrenting.auth;

import com.easyrenting.user.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 80) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$", message = "must be a valid 10-digit Indian mobile number")
            String phone,
            @NotBlank @Size(min = 8, max = 72)
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).*$", message = "must contain at least one letter and one digit")
            String password,
            @NotNull @Pattern(regexp = "TENANT|OWNER", message = "must be TENANT or OWNER") String role) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record AuthResponse(String accessToken, long expiresIn, UserDto user) {
    }

    /** Service-level result: the response body plus the raw refresh token destined for the cookie. */
    public record AuthResult(AuthResponse response, String refreshToken) {
    }
}
