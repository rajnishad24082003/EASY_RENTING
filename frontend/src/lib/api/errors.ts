import type { ErrorCode, FieldError, ProblemDetail } from "./types";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMITED",
};

const FALLBACK_MESSAGES: Partial<Record<string, string>> = {
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That action conflicts with the current state. Refresh and try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  NETWORK_ERROR: "Can't reach the server. Check your connection and try again.",
};

/** Error thrown by the API client; parsed from an RFC 9457 ProblemDetail body when available. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string | undefined;
  readonly detail: string | undefined;
  readonly fieldErrors: FieldError[];

  constructor(status: number, problem: ProblemDetail = {}) {
    const code = problem.code ?? STATUS_TO_CODE[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
    super(problem.detail || problem.title || FALLBACK_MESSAGES[code] || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.title = problem.title;
    this.detail = problem.detail;
    this.fieldErrors = Array.isArray(problem.errors) ? problem.errors.filter(isFieldError) : [];
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let problem: ProblemDetail = {};
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      try {
        const body: unknown = await res.json();
        if (body && typeof body === "object") problem = body as ProblemDetail;
      } catch {
        // Malformed body: fall back to status-derived defaults.
      }
    }
    return new ApiError(res.status, problem);
  }

  static network(cause: unknown): ApiError {
    const err = new ApiError(0, { code: "NETWORK_ERROR", detail: FALLBACK_MESSAGES.NETWORK_ERROR });
    err.cause = cause;
    return err;
  }

  get isValidation(): boolean {
    return this.code === "VALIDATION_ERROR" || this.fieldErrors.length > 0;
  }

  /** Field-level messages keyed by field path (first message wins). */
  fieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const { field, message } of this.fieldErrors) {
      if (!(field in map)) map[field] = message;
    }
    return map;
  }
}

function isFieldError(value: unknown): value is FieldError {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as FieldError).field === "string" &&
    typeof (value as FieldError).message === "string"
  );
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Human-readable message for any thrown value. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.fieldErrors.length > 0) {
      const { field, message } = error.fieldErrors[0];
      return `${field}: ${message}`;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
