package com.easyrenting.auth;

import com.easyrenting.common.ErrorCode;
import com.easyrenting.common.web.ProblemResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Renders 401/403 from the security filter chain as problem+json. */
@Component
public class ProblemSecurityHandlers implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ProblemResponseWriter writer;

    public ProblemSecurityHandlers(ProblemResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
            throws IOException {
        String detail = ex instanceof InvalidBearerTokenException
                ? "Invalid or expired access token"
                : "Authentication required";
        response.setHeader("WWW-Authenticate", "Bearer");
        writer.write(request, response, ErrorCode.UNAUTHORIZED, detail);
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException ex)
            throws IOException {
        writer.write(request, response, ErrorCode.FORBIDDEN, "You do not have permission to perform this action");
    }
}
