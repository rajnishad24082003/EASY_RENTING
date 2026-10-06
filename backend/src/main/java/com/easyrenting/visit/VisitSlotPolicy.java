package com.easyrenting.visit;

import com.easyrenting.common.FieldValidationException;
import com.easyrenting.config.AppProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

/** Contract rule 4: a visit slot must be in the future and between 08:00 and 20:00 in the marketplace time zone. */
@Component
public class VisitSlotPolicy {

    static final LocalTime EARLIEST = LocalTime.of(8, 0);
    static final LocalTime LATEST = LocalTime.of(20, 0);

    private final Clock clock;
    private final ZoneId zone;

    public VisitSlotPolicy(Clock clock, AppProperties properties) {
        this.clock = clock;
        this.zone = properties.timezone();
    }

    public void validate(String field, Instant slot) {
        if (!slot.isAfter(clock.instant())) {
            throw new FieldValidationException(field, "must be in the future");
        }
        LocalTime local = slot.atZone(zone).toLocalTime();
        if (local.isBefore(EARLIEST) || local.isAfter(LATEST)) {
            throw new FieldValidationException(field, "must be between 08:00 and 20:00 (" + zone + ")");
        }
    }
}
