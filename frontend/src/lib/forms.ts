import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api/errors";

/**
 * Maps ProblemDetail `errors[]` onto react-hook-form fields. Returns true when at least one
 * error matched a known field, so callers can fall back to a toast otherwise.
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): boolean {
  if (!(error instanceof ApiError)) return false;
  let applied = false;
  for (const [field, message] of Object.entries(error.fieldErrorMap())) {
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}
