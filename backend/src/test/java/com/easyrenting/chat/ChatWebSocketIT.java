package com.easyrenting.chat;

import static org.assertj.core.api.Assertions.assertThat;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

class ChatWebSocketIT extends IntegrationTest {

    @LocalServerPort
    private int port;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void setUpClient() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new JacksonJsonMessageConverter());
    }

    @AfterEach
    void stopClient() {
        stompClient.stop();
    }

    private StompSession connect(String token) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer " + token);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", new WebSocketHttpHeaders(), connectHeaders,
                new StompSessionHandlerAdapter() { }).get(5, TimeUnit.SECONDS);
    }

    @SuppressWarnings("unchecked")
    private static BlockingQueue<Map<String, Object>> subscribe(StompSession session, String destination) {
        BlockingQueue<Map<String, Object>> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((Map<String, Object>) payload);
            }
        });
        return queue;
    }

    @Test
    void messageSentOverStompIsDeliveredToBothParticipants() throws Exception {
        Session owner = verifiedOwner();
        Session tenant = register(Role.TENANT);
        UUID propertyId = createListing(owner, listing(12.9, 77.6, b -> { }));
        String conversationId = read(postAs(tenant, "/api/v1/conversations",
                Map.of("propertyId", propertyId, "message", "Hello over REST")), "$.id");

        StompSession tenantSession = connect(tenant.token());
        StompSession ownerSession = connect(owner.token());
        BlockingQueue<Map<String, Object>> tenantMessages = subscribe(tenantSession, "/user/queue/messages");
        BlockingQueue<Map<String, Object>> ownerMessages = subscribe(ownerSession, "/user/queue/messages");
        BlockingQueue<Map<String, Object>> ownerNotifications = subscribe(ownerSession, "/user/queue/notifications");
        BlockingQueue<Map<String, Object>> ownerTyping = subscribe(ownerSession, "/user/queue/typing");
        Thread.sleep(300); // let SUBSCRIBE frames reach the broker

        tenantSession.send("/app/chat.typing", Map.of("conversationId", conversationId, "typing", true));
        Map<String, Object> typing = ownerTyping.poll(5, TimeUnit.SECONDS);
        assertThat(typing).containsEntry("userId", tenant.id().toString()).containsEntry("typing", true);

        tenantSession.send("/app/chat.send", Map.of("conversationId", conversationId, "content", "Hello over STOMP"));

        Map<String, Object> received = ownerMessages.poll(5, TimeUnit.SECONDS);
        assertThat(received).isNotNull()
                .containsEntry("content", "Hello over STOMP")
                .containsEntry("conversationId", conversationId)
                .containsEntry("senderId", tenant.id().toString());
        assertThat(tenantMessages.poll(5, TimeUnit.SECONDS)).containsEntry("content", "Hello over STOMP");
        assertThat(ownerNotifications.poll(5, TimeUnit.SECONDS)).containsEntry("type", "NEW_MESSAGE");

        BlockingQueue<Map<String, Object>> tenantReceipts = subscribe(tenantSession, "/user/queue/read-receipts");
        Thread.sleep(200);
        ownerSession.send("/app/chat.read", Map.of("conversationId", conversationId));
        assertThat(tenantReceipts.poll(5, TimeUnit.SECONDS)).containsEntry("readerId", owner.id().toString());
    }

    @Test
    void nonParticipantsReceiveAnErrorInsteadOfDelivery() throws Exception {
        Session owner = verifiedOwner();
        Session tenant = register(Role.TENANT);
        UUID propertyId = createListing(owner, listing(12.9, 77.6, b -> { }));
        String conversationId = read(postAs(tenant, "/api/v1/conversations",
                Map.of("propertyId", propertyId, "message", "Hi")), "$.id");

        StompSession intruder = connect(register(Role.TENANT).token());
        BlockingQueue<Map<String, Object>> errors = subscribe(intruder, "/user/queue/errors");
        Thread.sleep(300);
        intruder.send("/app/chat.send", Map.of("conversationId", conversationId, "content", "let me in"));

        assertThat(errors.poll(5, TimeUnit.SECONDS)).containsEntry("code", "NOT_FOUND");
    }

    @Test
    void connectWithoutValidTokenIsRejected() throws Exception {
        boolean rejected;
        try {
            StompSession session = connect("invalid-token");
            Thread.sleep(500); // the ERROR frame may arrive just after the handshake
            rejected = !session.isConnected();
        } catch (ExecutionException | TimeoutException ex) {
            rejected = true;
        }
        assertThat(rejected).isTrue();
    }
}
