export interface SingleFlight<T> {
  (): Promise<T>;
  /** The in-flight promise, if a call is currently running. */
  pending(): Promise<T> | null;
}

/** Wraps an async function so concurrent callers share one in-flight invocation. */
export function singleFlight<T>(fn: () => Promise<T>): SingleFlight<T> {
  let inflight: Promise<T> | null = null;
  const run = (() => {
    if (!inflight) {
      inflight = fn().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }) as SingleFlight<T>;
  run.pending = () => inflight;
  return run;
}
