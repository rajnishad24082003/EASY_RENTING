package com.easyrenting.chat;

import com.easyrenting.chat.ChatDtos.WsError;
import com.easyrenting.chat.ChatDtos.WsRead;
import com.easyrenting.chat.ChatDtos.WsSendMessage;
import com.easyrenting.chat.ChatDtos.WsTyping;
import com.easyrenting.chat.ChatService.TypingNotice;
import com.easyrenting.common.ApiException;
import com.easyrenting.common.ErrorCode;
import java.security.Principal;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

/**
 * STOMP endpoints ({@code /app/chat.*}). The principal name is the user id (set by the CONNECT interceptor);
 * participation is re-checked by {@link ChatService} on every frame.
 */
@Controller
public class ChatWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketController.class);
    static final String TYPING = "/queue/typing";

    private final ChatService chatService;
    private final SimpMessagingTemplate messaging;

    public ChatWebSocketController(ChatService chatService, SimpMessagingTemplate messaging) {
        this.chatService = chatService;
        this.messaging = messaging;
    }

    @MessageMapping("chat.send")
    public void send(@Payload WsSendMessage payload, Principal principal) {
        chatService.send(userId(principal), requireConversation(payload.conversationId()), payload.content());
    }

    @MessageMapping("chat.typing")
    public void typing(@Payload WsTyping payload, Principal principal) {
        TypingNotice notice = chatService.typing(userId(principal), requireConversation(payload.conversationId()),
                payload.typing());
        messaging.convertAndSendToUser(notice.recipientId().toString(), TYPING, notice.event());
    }

    @MessageMapping("chat.read")
    public void read(@Payload WsRead payload, Principal principal) {
        chatService.markRead(userId(principal), requireConversation(payload.conversationId()));
    }

    @MessageExceptionHandler
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public WsError handle(Exception ex) {
        if (ex instanceof ApiException api) {
            return new WsError(api.code().name(), api.getMessage());
        }
        log.warn("Unhandled STOMP error", ex);
        return new WsError(ErrorCode.BAD_REQUEST.name(), "Could not process message");
    }

    private static UUID userId(Principal principal) {
        if (principal == null) {
            throw ApiException.unauthorized("Not authenticated");
        }
        return UUID.fromString(principal.getName());
    }

    private static UUID requireConversation(UUID conversationId) {
        if (conversationId == null) {
            throw ApiException.badRequest("conversationId is required");
        }
        return conversationId;
    }
}
