package com.easyrenting.common.ratelimit;

import com.easyrenting.common.ErrorCode;
import com.easyrenting.common.web.ClientIpResolver;
import com.easyrenting.common.web.ProblemResponseWriter;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** In-memory per-IP rate limiting for the abuse-prone endpoints listed in the API contract. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@ConditionalOnBooleanProperty(name = "app.rate-limit.enabled", matchIfMissing = true)
public class RateLimitFilter extends OncePerRequestFilter {

    private record Rule(String name, String method, String path, long capacity, Duration period) {
        boolean matches(HttpServletRequest request) {
            return method.equalsIgnoreCase(request.getMethod()) && path.equals(request.getRequestURI());
        }
    }

    private static final List<Rule> RULES = List.of(
            new Rule("login", "POST", "/api/v1/auth/login", 10, Duration.ofMinutes(1)),
            new Rule("register", "POST", "/api/v1/auth/register", 10, Duration.ofMinutes(1)),
            new Rule("ai-search", "POST", "/api/v1/search/ai", 20, Duration.ofMinutes(1)));

    private final Cache<String, TokenBucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofMinutes(10))
            .maximumSize(100_000)
            .build();
    private final ClientIpResolver ipResolver;
    private final ProblemResponseWriter problemWriter;

    public RateLimitFilter(ClientIpResolver ipResolver, ProblemResponseWriter problemWriter) {
        this.ipResolver = ipResolver;
        this.problemWriter = problemWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Optional<Rule> rule = RULES.stream().filter(r -> r.matches(request)).findFirst();
        if (rule.isEmpty()) {
            chain.doFilter(request, response);
            return;
        }
        Rule r = rule.get();
        String key = r.name() + ':' + ipResolver.resolve(request);
        TokenBucket bucket = buckets.get(key, k -> new TokenBucket(r.capacity(), r.period(), System.nanoTime()));
        if (bucket.tryConsume(System.nanoTime())) {
            chain.doFilter(request, response);
            return;
        }
        response.setHeader("Retry-After", Long.toString(bucket.secondsUntilNextToken()));
        problemWriter.write(request, response, ErrorCode.RATE_LIMITED, "Too many requests, please slow down");
    }
}
