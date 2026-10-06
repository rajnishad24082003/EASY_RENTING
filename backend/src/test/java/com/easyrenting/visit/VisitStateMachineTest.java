package com.easyrenting.visit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.easyrenting.common.ApiException;
import com.easyrenting.common.ErrorCode;
import com.easyrenting.visit.VisitStateMachine.Action;
import com.easyrenting.visit.VisitStateMachine.Party;
import java.util.EnumSet;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class VisitStateMachineTest {

    @ParameterizedTest(name = "{1} by {2}: {0} -> {3}")
    @CsvSource({
            "REQUESTED,           CONFIRM,           OWNER,  CONFIRMED",
            "REQUESTED,           REJECT,            OWNER,  REJECTED",
            "REQUESTED,           RESCHEDULE,        OWNER,  RESCHEDULE_PROPOSED",
            "CONFIRMED,           COMPLETE,          OWNER,  COMPLETED",
            "RESCHEDULE_PROPOSED, ACCEPT_RESCHEDULE, TENANT, CONFIRMED",
            "REQUESTED,           CANCEL,            TENANT, CANCELLED",
            "CONFIRMED,           CANCEL,            TENANT, CANCELLED",
            "RESCHEDULE_PROPOSED, CANCEL,            TENANT, CANCELLED"
    })
    void allowsContractTransitions(VisitStatus from, Action action, Party actor, VisitStatus expected) {
        assertThat(VisitStateMachine.next(from, action, actor)).isEqualTo(expected);
    }

    @Test
    void rejectsEveryOtherTransitionWithConflict() {
        Map<VisitStatus, Map<Party, EnumSet<Action>>> allowed = Map.of(
                VisitStatus.REQUESTED, Map.of(
                        Party.OWNER, EnumSet.of(Action.CONFIRM, Action.REJECT, Action.RESCHEDULE),
                        Party.TENANT, EnumSet.of(Action.CANCEL)),
                VisitStatus.CONFIRMED, Map.of(
                        Party.OWNER, EnumSet.of(Action.COMPLETE),
                        Party.TENANT, EnumSet.of(Action.CANCEL)),
                VisitStatus.RESCHEDULE_PROPOSED, Map.of(
                        Party.OWNER, EnumSet.noneOf(Action.class),
                        Party.TENANT, EnumSet.of(Action.ACCEPT_RESCHEDULE, Action.CANCEL)));

        int rejected = 0;
        for (VisitStatus status : VisitStatus.values()) {
            for (Party party : Party.values()) {
                for (Action action : Action.values()) {
                    boolean permitted = allowed.getOrDefault(status, Map.of())
                            .getOrDefault(party, EnumSet.noneOf(Action.class)).contains(action);
                    if (!permitted) {
                        assertThatThrownBy(() -> VisitStateMachine.next(status, action, party))
                                .isInstanceOf(ApiException.class)
                                .extracting(ex -> ((ApiException) ex).code())
                                .isEqualTo(ErrorCode.CONFLICT);
                        rejected++;
                    }
                }
            }
        }
        assertThat(rejected).isEqualTo(VisitStatus.values().length * 2 * Action.values().length - 8);
    }

    @Test
    void terminalStatesAreClosed() {
        assertThat(EnumSet.allOf(VisitStatus.class).stream().filter(VisitStatus::isOpen))
                .containsExactlyInAnyOrder(VisitStatus.REQUESTED, VisitStatus.CONFIRMED, VisitStatus.RESCHEDULE_PROPOSED);
        assertThat(VisitStatus.CONFIRMED.revealsContact()).isTrue();
        assertThat(VisitStatus.REQUESTED.revealsContact()).isFalse();
    }
}
