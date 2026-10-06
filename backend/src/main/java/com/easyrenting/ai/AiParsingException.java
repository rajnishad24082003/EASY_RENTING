package com.easyrenting.ai;

/** The AI parser could not produce a usable result; callers fall back to the rule-based parser. */
public class AiParsingException extends RuntimeException {

    public AiParsingException(String message) {
        super(message);
    }

    public AiParsingException(String message, Throwable cause) {
        super(message, cause);
    }
}
