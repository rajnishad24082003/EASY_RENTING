import { describe, expect, it } from "vitest";
import { ApiError, getErrorMessage } from "./errors";

function problemResponse(status: number, body: unknown, contentType = "application/problem+json") {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

describe("ApiError.fromResponse", () => {
  it("parses an RFC 9457 ProblemDetail with field errors", async () => {
    const error = await ApiError.fromResponse(
      problemResponse(400, {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Validation failed",
        instance: "/api/v1/properties",
        code: "VALIDATION_ERROR",
        errors: [
          { field: "rent", message: "must be greater than 0" },
          { field: "rent", message: "second message is ignored" },
          { field: "title", message: "size must be between 10 and 120" },
          { bogus: true },
        ],
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Validation failed");
    expect(error.isValidation).toBe(true);
    expect(error.fieldErrors).toHaveLength(3);
    expect(error.fieldErrorMap()).toEqual({
      rent: "must be greater than 0",
      title: "size must be between 10 and 120",
    });
    expect(getErrorMessage(error)).toBe("rent: must be greater than 0");
  });

  it("derives a code and friendly message from the status when the body isn't JSON", async () => {
    const error = await ApiError.fromResponse(problemResponse(429, "Too many", "text/plain"));
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.message).toMatch(/too many requests/i);
    expect(error.fieldErrors).toEqual([]);
  });

  it("survives malformed JSON bodies", async () => {
    const error = await ApiError.fromResponse(problemResponse(503, "{not json"));
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.status).toBe(503);
  });

  it("prefers the backend's code and detail", async () => {
    const error = await ApiError.fromResponse(
      problemResponse(409, { code: "CONFLICT", detail: "You already have an active visit for this property" }),
    );
    expect(error.code).toBe("CONFLICT");
    expect(getErrorMessage(error)).toBe("You already have an active visit for this property");
  });
});

describe("getErrorMessage", () => {
  it("handles non-API errors", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("weird", "fallback")).toBe("fallback");
  });
});
