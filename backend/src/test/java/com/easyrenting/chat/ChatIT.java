package com.easyrenting.chat;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatIT extends IntegrationTest {

    @Test
    void tenantAndOwnerExchangeMessages() throws Exception {
        Session owner = verifiedOwner();
        Session tenant = register(Role.TENANT);
        UUID propertyId = createListing(owner, listing(12.9, 77.6, b -> { }));

        String conversationId = read(postAs(tenant, "/api/v1/conversations",
                Map.of("propertyId", propertyId, "message", "Is this still available?"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.property.id").value(propertyId.toString()))
                .andExpect(jsonPath("$.counterpart.id").value(owner.id().toString()))
                .andExpect(jsonPath("$.counterpart.role").value("OWNER"))
                .andExpect(jsonPath("$.lastMessage.content").value("Is this still available?")), "$.id");

        // Starting again reuses the conversation (unique per property + tenant) and appends.
        postAs(tenant, "/api/v1/conversations", Map.of("propertyId", propertyId, "message", "Also, is parking included?"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(conversationId));

        getAs(owner, "/api/v1/conversations/unread-count").andExpect(jsonPath("$.count").value(2));
        getAs(owner, "/api/v1/conversations")
                .andExpect(jsonPath("$.content[0].id").value(conversationId))
                .andExpect(jsonPath("$.content[0].unreadCount").value(2))
                .andExpect(jsonPath("$.content[0].counterpart.role").value("TENANT"))
                .andExpect(jsonPath("$.content[0].lastMessage.content").value("Also, is parking included?"));
        getAs(owner, "/api/v1/conversations/{id}/messages", conversationId)
                .andExpect(jsonPath("$[*].content", contains("Is this still available?", "Also, is parking included?")));

        postAs(owner, "/api/v1/conversations/{id}/read", null, conversationId).andExpect(status().isNoContent());
        getAs(owner, "/api/v1/conversations/unread-count").andExpect(jsonPath("$.count").value(0));
        getAs(tenant, "/api/v1/conversations/{id}/messages?size=1", conversationId)
                .andExpect(jsonPath("$[0].readAt").isString());

        postAs(owner, "/api/v1/conversations/{id}/messages", Map.of("content", "Yes, one covered slot."), conversationId)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.senderId").value(owner.id().toString()))
                .andExpect(jsonPath("$.conversationId").value(conversationId));
        getAs(tenant, "/api/v1/conversations/unread-count").andExpect(jsonPath("$.count").value(1));
        getAs(tenant, "/api/v1/conversations/{id}", conversationId)
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.lastMessage.content").value("Yes, one covered slot."));
    }

    @Test
    void enforcesParticipantsAndRoles() throws Exception {
        Session owner = verifiedOwner();
        Session tenant = register(Role.TENANT);
        UUID propertyId = createListing(owner, listing(12.9, 77.6, b -> { }));
        String conversationId = read(postAs(tenant, "/api/v1/conversations",
                Map.of("propertyId", propertyId, "message", "Hello")), "$.id");

        postAs(owner, "/api/v1/conversations", Map.of("propertyId", propertyId, "message", "Hi"))
                .andExpect(status().isForbidden());
        Session stranger = register(Role.TENANT);
        getAs(stranger, "/api/v1/conversations/{id}", conversationId).andExpect(status().isNotFound());
        postAs(stranger, "/api/v1/conversations/{id}/messages", Map.of("content", "spam"), conversationId)
                .andExpect(status().isNotFound());
        postAs(tenant, "/api/v1/conversations/{id}/messages", Map.of("content", ""), conversationId)
                .andExpect(status().isBadRequest());

        Session unverified = register(Role.OWNER);
        UUID hidden = createListing(unverified, listing(12.9, 77.6, b -> { }));
        postAs(tenant, "/api/v1/conversations", Map.of("propertyId", hidden, "message", "Hello"))
                .andExpect(status().isNotFound());
    }
}
