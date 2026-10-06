package com.easyrenting.common;

/** A business-rule validation failure attributable to a single request field (rendered as VALIDATION_ERROR). */
public class FieldValidationException extends ApiException {

    private final String field;

    public FieldValidationException(String field, String message) {
        super(ErrorCode.VALIDATION_ERROR, message);
        this.field = field;
    }

    public String field() {
        return field;
    }
}
