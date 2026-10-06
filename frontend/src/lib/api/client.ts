import { sessionStore } from "@/lib/auth/session-store";
import { ApiError } from "./errors";
import { singleFlight } from "./single-flight";
import type { AuthResponse } from "./types";

export const API_PREFIX = "/api/v1";

/** Browser requests go through the Next.js rewrite (same origin); server-side requests hit the backend directly. */
export function apiBaseUrl(): string {
  if (typeof window !== "undefined") return API_PREFIX;
  const backend = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/$/, "");
  return `${backend}${API_PREFIX}`;
}

type Primitive = string | number | boolean;
export type QueryValue = Primitive | null | undefined | readonly Primitive[];
export type QueryParams = Record<string, QueryValue>;

/** Serialises params; arrays become repeated keys (`bhk=1&bhk=2`), empty values are dropped. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  /** JSON body. */
  body?: unknown;
  /** Multipart body (takes precedence over `body`). */
  formData?: FormData;
  signal?: AbortSignal;
  /** Disable the refresh-and-retry behaviour on 401. */
  skipAuthRetry?: boolean;
}

function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json, application/problem+json" };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${apiBaseUrl()}${path}${buildQuery(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
    credentials: "include",
    cache: "no-store",
  });
}

async function sendSafely(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  try {
    return await send(path, options, token);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw ApiError.network(error);
  }
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request,
 * which matters because the backend rotates the refresh token on every call.
 */
export const refreshSession = singleFlight(async (): Promise<AuthResponse | null> => {
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      sessionStore.clear();
      return null;
    }
    const auth = (await res.json()) as AuthResponse;
    sessionStore.setSession(auth);
    return auth;
  } catch {
    // Network failure: keep an existing session; resolve a pending boot as anonymous.
    if (sessionStore.getState().status === "loading") sessionStore.clear();
    return null;
  }
});

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function execute(path: string, options: RequestOptions): Promise<Response> {
  // Don't race a refresh that's in flight (e.g. the silent session restore on boot).
  const pending = refreshSession.pending();
  if (pending) await pending;

  const token = sessionStore.getState().accessToken;
  let res = await sendSafely(path, options, token);

  if (res.status === 401 && token && !options.skipAuthRetry && !path.startsWith("/auth/")) {
    const session = await refreshSession();
    if (session) res = await sendSafely(path, options, session.accessToken);
  }
  if (!res.ok) throw await ApiError.fromResponse(res);
  return res;
}

/** Typed JSON request against `/api/v1`. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await execute(path, options);
  return parseBody<T>(res);
}

/**
 * Fetches a (possibly access-controlled) file as a Blob. Accepts the absolute-path `/api/v1/files/...`
 * URLs returned by the API; external URLs are fetched without credentials.
 */
export async function apiFetchBlob(url: string): Promise<Blob> {
  if (url.startsWith(API_PREFIX)) {
    const res = await execute(url.slice(API_PREFIX.length), {});
    return res.blob();
  }
  const res = await fetch(url);
  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.blob();
}
