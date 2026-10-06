package com.easyrenting.visit;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.easyrenting.IntegrationTest;
import com.easyrenting.user.Role;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;

class VisitLifecycleIT extends IntegrationTest {

    @Autowired
    private JdbcClient jdbc;

    private Session owner;
    private Session tenant;
    private UUID propertyId;

    @BeforeEach
    void setUp() throws Exception {
        owner = verifiedOwner();
        tenant = register(Role.TENANT);
        propertyId = createListing(owner, listing(12.9, 77.6, b -> { }));
    }

    private String requestVisit(Instant at) throws Exception {
        return read(postAs(tenant, "/api/v1/visits", Map.of("propertyId", propertyId, "scheduledAt", at.toString(),
                "note", "Evening works best")).andExpect(status().isCreated()), "$.id");
    }

    @Test
    void fullConfirmAndCompleteLifecycle() throws Exception {
        String visitId = requestVisit(futureSlot(2, 11));

        getAs(tenant, "/api/v1/visits/{id}", visitId)
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.property.id").value(propertyId.toString()))
                .andExpect(jsonPath("$.owner.phone").doesNotExist())
                .andExpect(jsonPath("$.tenant.phone").value("9876543210"));
        getAs(owner, "/api/v1/notifications/unread-count").andExpect(jsonPath("$.count").value(1));
        getAs(owner, "/api/v1/notifications").andExpect(jsonPath("$.content[0].type").value("VISIT_REQUESTED"));

        // Only one open visit per tenant and property.
        postAs(tenant, "/api/v1/visits", Map.of("propertyId", propertyId, "scheduledAt", futureSlot(3, 12).toString()))
                .andExpect(status().isConflict());
        // Tenants cannot confirm; owners cannot accept reschedules.
        postAs(tenant, "/api/v1/visits/{id}/confirm", null, visitId).andExpect(status().isForbidden());

        postAs(owner, "/api/v1/visits/{id}/confirm", null, visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.tenant.phone").value("9876543210"));
        getAs(tenant, "/api/v1/visits/{id}", visitId).andExpect(jsonPath("$.owner.phone").value("9876543210"));

        postAs(owner, "/api/v1/visits/{id}/complete", null, visitId).andExpect(status().isConflict());
        jdbc.sql("UPDATE visits SET scheduled_at = :at WHERE id = :id")
                .param("at", Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)))
                .param("id", UUID.fromString(visitId))
                .update();
        postAs(owner, "/api/v1/visits/{id}/complete", null, visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));
        postAs(owner, "/api/v1/visits/{id}/confirm", null, visitId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    void rescheduleAcceptAndCancel() throws Exception {
        String visitId = requestVisit(futureSlot(2, 11));
        Instant proposed = futureSlot(4, 16);

        postAs(owner, "/api/v1/visits/{id}/reschedule", Map.of("proposedAt", proposed.toString(), "note", "Busy that day"),
                visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESCHEDULE_PROPOSED"))
                .andExpect(jsonPath("$.responseNote").value("Busy that day"));
        postAs(owner, "/api/v1/visits/{id}/accept-reschedule", null, visitId).andExpect(status().isForbidden());

        postAs(tenant, "/api/v1/visits/{id}/accept-reschedule", null, visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.scheduledAt").value(proposed.toString()))
                .andExpect(jsonPath("$.proposedAt").doesNotExist());

        postAs(tenant, "/api/v1/visits/{id}/cancel", Map.of("reason", "Found another place"), visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
        // A cancelled visit frees the slot for a new request.
        requestVisit(futureSlot(5, 10));
    }

    @Test
    void rejectsInvalidSlotsAndNonParticipants() throws Exception {
        postAs(tenant, "/api/v1/visits", Map.of("propertyId", propertyId, "scheduledAt", futureSlot(2, 22).toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("scheduledAt"));
        postAs(tenant, "/api/v1/visits", Map.of("propertyId", propertyId,
                "scheduledAt", Instant.now().minus(1, ChronoUnit.DAYS).toString()))
                .andExpect(status().isBadRequest());
        postAs(owner, "/api/v1/visits", Map.of("propertyId", propertyId, "scheduledAt", futureSlot(2, 11).toString()))
                .andExpect(status().isForbidden());

        String visitId = requestVisit(futureSlot(2, 11));
        Session stranger = register(Role.TENANT);
        getAs(stranger, "/api/v1/visits/{id}", visitId).andExpect(status().isNotFound());
        postAs(owner, "/api/v1/visits/{id}/reject", Map.of("reason", "Already rented"), visitId)
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void listsVisitsPerRoleWithFilters() throws Exception {
        String upcoming = requestVisit(futureSlot(2, 11));
        postAs(owner, "/api/v1/visits/{id}/confirm", null, upcoming).andExpect(status().isOk());

        getAs(tenant, "/api/v1/visits?status=CONFIRMED&upcoming=true")
                .andExpect(jsonPath("$.content[*].id", contains(upcoming)));
        getAs(owner, "/api/v1/visits?status=REQUESTED")
                .andExpect(jsonPath("$.content[*].id", not(hasItem(upcoming))));
        getAs(owner, "/api/v1/visits").andExpect(jsonPath("$.content[*].id", hasItem(upcoming)));
    }
}
