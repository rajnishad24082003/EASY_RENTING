package com.easyrenting.common.web;

import com.easyrenting.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/** Resolves the caller IP, honouring {@code X-Forwarded-For} only when {@code app.trust-proxy=true}. */
@Component
public class ClientIpResolver {

    private final boolean trustProxy;

    public ClientIpResolver(AppProperties properties) {
        this.trustProxy = properties.trustProxy();
    }

    public String resolve(HttpServletRequest request) {
        if (trustProxy) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
