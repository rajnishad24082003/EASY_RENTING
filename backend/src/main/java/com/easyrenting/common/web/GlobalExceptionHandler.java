package com.easyrenting.common.web;

import com.easyrenting.common.ApiException;
import com.easyrenting.common.ErrorCode;
import com.easyrenting.common.FieldValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Maps every error raised by the web layer to a contract-shaped RFC 9457 problem. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<Map<String, Object>> handleApi(ApiException ex, HttpServletRequest request) {
        if (ex instanceof FieldValidationException fve) {
            return validation(List.of(new FieldError(fve.field(), fve.getMessage())), request);
        }
        return respond(ex.code(), ex.getMessage(), request);
    }

    @ExceptionHandler(BindException.class)
    ResponseEntity<Map<String, Object>> handleBind(BindException ex, HttpServletRequest request) {
        List<FieldError> errors = ex.getBindingResult().getAllErrors().stream()
                .map(error -> new FieldError(
                        error instanceof org.springframework.validation.FieldError fe ? fe.getField() : error.getObjectName(),
                        error.getDefaultMessage()))
                .toList();
        return validation(errors, request);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<Map<String, Object>> handleMethodValidation(HandlerMethodValidationException ex,
                                                               HttpServletRequest request) {
        List<FieldError> errors = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new FieldError(
                                error instanceof org.springframework.validation.FieldError fe
                                        ? fe.getField()
                                        : result.getMethodParameter().getParameterName(),
                                error.getDefaultMessage())))
                .toList();
        return validation(errors, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<Map<String, Object>> handleConstraint(ConstraintViolationException ex, HttpServletRequest request) {
        List<FieldError> errors = ex.getConstraintViolations().stream()
                .map(v -> new FieldError(lastNode(v.getPropertyPath().toString()), v.getMessage()))
                .toList();
        return validation(errors, request);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class,
            MultipartException.class,
            HttpMediaTypeNotSupportedException.class
    })
    ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex, HttpServletRequest request) {
        String detail = switch (ex) {
            case HttpMessageNotReadableException ignored -> "Malformed or unreadable request body";
            case MethodArgumentTypeMismatchException e -> "Invalid value for parameter '" + e.getName() + "'";
            case MissingServletRequestParameterException e -> "Missing parameter '" + e.getParameterName() + "'";
            case MissingServletRequestPartException e -> "Missing multipart part '" + e.getRequestPartName() + "'";
            case MaxUploadSizeExceededException ignored -> "Uploaded file is too large";
            case HttpMediaTypeNotSupportedException ignored -> "Unsupported content type";
            default -> "Bad request";
        };
        return respond(ErrorCode.BAD_REQUEST, detail, request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<Map<String, Object>> handleMethod(HttpRequestMethodNotSupportedException ex,
                                                     HttpServletRequest request) {
        return Problems.response(Problems.of(HttpStatus.METHOD_NOT_ALLOWED,
                HttpStatus.METHOD_NOT_ALLOWED.getReasonPhrase(), ErrorCode.BAD_REQUEST, ex.getMessage(),
                request.getRequestURI()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<Map<String, Object>> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return respond(ErrorCode.NOT_FOUND, "Resource not found", request);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ResponseEntity<Map<String, Object>> handleAccessDenied(Exception ex, HttpServletRequest request) {
        return respond(ErrorCode.FORBIDDEN, "You do not have permission to perform this action", request);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<Map<String, Object>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex,
                                                             HttpServletRequest request) {
        return respond(ErrorCode.CONFLICT, "The resource was modified concurrently, please retry", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> handleIntegrity(DataIntegrityViolationException ex,
                                                        HttpServletRequest request) {
        log.debug("Data integrity violation", ex);
        return respond(ErrorCode.CONFLICT, "The request conflicts with existing data", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return respond(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred", request);
    }

    private static ResponseEntity<Map<String, Object>> respond(ErrorCode code, String detail,
                                                               HttpServletRequest request) {
        return Problems.response(Problems.of(code, detail, request.getRequestURI()));
    }

    private static ResponseEntity<Map<String, Object>> validation(List<FieldError> errors, HttpServletRequest request) {
        return Problems.response(Problems.validation(errors, request.getRequestURI()));
    }

    private static String lastNode(String path) {
        int dot = path.lastIndexOf('.');
        return dot >= 0 ? path.substring(dot + 1) : path;
    }
}
