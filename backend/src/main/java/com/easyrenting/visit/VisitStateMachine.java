package com.easyrenting.visit;

import com.easyrenting.common.ApiException;

/**
 * Visit lifecycle (contract rule 5):
 * <pre>
 * tenant: REQUESTED|CONFIRMED|RESCHEDULE_PROPOSED -> CANCELLED;  RESCHEDULE_PROPOSED -> CONFIRMED (accept)
 * owner : REQUESTED -> CONFIRMED | REJECTED | RESCHEDULE_PROPOSED;  CONFIRMED -> COMPLETED
 * </pre>
 * Any other combination is a 409 CONFLICT.
 */
public final class VisitStateMachine {

    public enum Party { TENANT, OWNER }

    public enum Action { CONFIRM, REJECT, RESCHEDULE, ACCEPT_RESCHEDULE, CANCEL, COMPLETE }

    private VisitStateMachine() {
    }

    public static VisitStatus next(VisitStatus current, Action action, Party actor) {
        VisitStatus target = switch (actor) {
            case TENANT -> switch (action) {
                case CANCEL -> current.isOpen() ? VisitStatus.CANCELLED : null;
                case ACCEPT_RESCHEDULE -> current == VisitStatus.RESCHEDULE_PROPOSED ? VisitStatus.CONFIRMED : null;
                default -> null;
            };
            case OWNER -> switch (action) {
                case CONFIRM -> current == VisitStatus.REQUESTED ? VisitStatus.CONFIRMED : null;
                case REJECT -> current == VisitStatus.REQUESTED ? VisitStatus.REJECTED : null;
                case RESCHEDULE -> current == VisitStatus.REQUESTED ? VisitStatus.RESCHEDULE_PROPOSED : null;
                case COMPLETE -> current == VisitStatus.CONFIRMED ? VisitStatus.COMPLETED : null;
                default -> null;
            };
        };
        if (target == null) {
            throw ApiException.conflict("A " + actor.name().toLowerCase() + " cannot "
                    + action.name().toLowerCase().replace('_', ' ') + " a visit that is " + current);
        }
        return target;
    }
}
