package com.easyrenting.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Authenticates STOMP CONNECT frames via {@code Authorization: Bearer <jwt>} and binds the user to the session.
 * Unauthenticated SEND/SUBSCRIBE frames are rejected, and clients may only subscribe to their own
 * {@code /user/queue/**} destinations. A rejected CONNECT results in an ERROR frame and a closed connection.
 */
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompAuthChannelInterceptor.class);
    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;

    public StompAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        StompCommand command = accessor.getCommand();
        if (command == StompCommand.CONNECT) {
            accessor.setUser(JwtPrincipalConverter.authenticationFor(authenticate(accessor)));
        } else if (command == StompCommand.SEND || command == StompCommand.SUBSCRIBE) {
            if (accessor.getUser() == null) {
                throw new MessageDeliveryException("Not authenticated");
            }
            if (command == StompCommand.SUBSCRIBE && !isOwnQueue(accessor.getDestination())) {
                throw new MessageDeliveryException("Subscriptions are limited to /user/queue/**");
            }
        }
        return message;
    }

    private AuthenticatedUser authenticate(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.regionMatches(true, 0, BEARER, 0, BEARER.length())) {
            throw new MessageDeliveryException("Missing bearer token");
        }
        try {
            return jwtService.parse(header.substring(BEARER.length()).trim());
        } catch (JwtException ex) {
            log.debug("Rejected STOMP CONNECT: {}", ex.getMessage());
            throw new MessageDeliveryException("Invalid or expired access token");
        }
    }

    private static boolean isOwnQueue(String destination) {
        return destination != null && destination.startsWith("/user/queue/");
    }
}
