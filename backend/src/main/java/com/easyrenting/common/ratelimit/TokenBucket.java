package com.easyrenting.common.ratelimit;

import java.time.Duration;

/** Thread-safe token bucket refilled continuously at {@code capacity / period}. */
final class TokenBucket {

    private final long capacity;
    private final double refillPerNano;
    private double tokens;
    private long lastRefillNanos;

    TokenBucket(long capacity, Duration period, long nowNanos) {
        this.capacity = capacity;
        this.refillPerNano = (double) capacity / period.toNanos();
        this.tokens = capacity;
        this.lastRefillNanos = nowNanos;
    }

    synchronized boolean tryConsume(long nowNanos) {
        double elapsed = Math.max(0, nowNanos - lastRefillNanos);
        tokens = Math.min(capacity, tokens + elapsed * refillPerNano);
        lastRefillNanos = nowNanos;
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }

    synchronized long secondsUntilNextToken() {
        double missing = Math.max(0, 1 - tokens);
        return Math.max(1, (long) Math.ceil(missing / refillPerNano / 1_000_000_000d));
    }
}
