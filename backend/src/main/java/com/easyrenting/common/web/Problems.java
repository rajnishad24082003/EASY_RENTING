package com.easyrenting.common.web;

import com.easyrenting.common.ErrorCode;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

/**
 * Builds RFC 9457 problem bodies in the exact shape of the API contract:
 * {@code type, title, status, detail, instance, code[, errors]}.
 */
public final class Problems {

    private static final URI ABOUT_BLANK = URI.create("about:blank");

    private Problems() {
    }

    public static ProblemDetail of(ErrorCode code, String detail, String instance) {
        return of(code.status(), code.status().getReasonPhrase(), code, detail, instance);
    }

    public static ProblemDetail of(HttpStatusCode status, String title, ErrorCode code, String detail, String instance) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(ABOUT_BLANK);
        problem.setTitle(title);
        if (instance != null) {
            problem.setInstance(URI.create(instance));
        }
        problem.setProperty("code", code.name());
        return problem;
    }

    public static ProblemDetail validation(List<FieldError> errors, String instance) {
        ProblemDetail problem = of(ErrorCode.VALIDATION_ERROR, "Validation failed", instance);
        problem.setProperty("errors", errors);
        return problem;
    }

    public static ResponseEntity<Map<String, Object>> response(ProblemDetail problem) {
        return ResponseEntity.status(problem.getStatus())
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(toBody(problem));
    }

    /** Flattens a problem into its JSON body with a stable field order. */
    public static Map<String, Object> toBody(ProblemDetail problem) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", (problem.getType() != null ? problem.getType() : ABOUT_BLANK).toString());
        body.put("title", problem.getTitle());
        body.put("status", problem.getStatus());
        body.put("detail", problem.getDetail());
        if (problem.getInstance() != null) {
            body.put("instance", problem.getInstance().toString());
        }
        if (problem.getProperties() != null) {
            body.putAll(problem.getProperties());
        }
        return body;
    }
}
