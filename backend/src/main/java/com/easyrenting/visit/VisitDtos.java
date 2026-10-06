package com.easyrenting.visit;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class VisitDtos {

    private VisitDtos() {
    }

    public record CreateVisitRequest(@NotNull UUID propertyId, @NotNull Instant scheduledAt,
                                     @Size(max = 500) String note) {
    }

    public record ReasonRequest(@Size(max = 500) String reason) {
    }

    public record RescheduleRequest(@NotNull Instant proposedAt, @Size(max = 500) String note) {
    }

    public record VisitPropertyDto(UUID id, String title, String locality, String city, String coverImageUrl) {
    }

    public record VisitPartyDto(UUID id, String name, String phone) {
    }

    public record VisitDto(UUID id, VisitPropertyDto property, VisitPartyDto tenant, VisitPartyDto owner,
                           VisitStatus status, Instant scheduledAt, Instant proposedAt, String note,
                           String responseNote, Instant createdAt, Instant updatedAt) {
    }
}
