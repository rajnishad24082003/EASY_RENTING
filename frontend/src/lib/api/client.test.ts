import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionStore } from "@/lib/auth/session-store";
import type { AuthResponse, UserDto } from "./types";
import { apiRequest, buildQuery, refreshSession } from "./client";
import { ApiError } from "./errors";
import { singleFlight } from "./single-flight";

const user: UserDto = {
  id: "u1",
  name: "Tia Tenant",
  email: "tenant@easyrenting.in",
  phone: "9876543210",
  role: "TENANT",
  verificationStatus: "UNVERIFIED",
  avatarUrl: null,
  createdAt: "2026-01-01T00:00:00Z",
};

const auth = (token: string): AuthResponse => ({ accessToken: token, expiresIn: 900, user });
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function authHeader(call: unknown[]): string | undefined {
  const init = call[1] as RequestInit;
  return (init.headers as Record<string, string>).Authorization;
}

describe("singleFlight", () => {
  it("shares one in-flight invocation between concurrent callers", async () => {
    let resolve!: (v: number) => void;
    const fn = vi.fn(() => new Promise<number>((r) => (resolve = r)));
    const run = singleFlight(fn);

    const a = run();
    const b = run();
    expect(run.pending()).toBe(a);
    expect(fn).toHaveBeenCalledTimes(1);
    resolve(42);
    await expect(Promise.all([a, b])).resolves.toEqual([42, 42]);
    expect(run.pending()).toBeNull();

    const c = run();
    resolve(7);
    await expect(c).resolves.toBe(7);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("clears the in-flight promise after a rejection", async () => {
    const run = singleFlight(vi.fn().mockRejectedValueOnce(new Error("nope")).mockResolvedValueOnce("ok"));
    await expect(run()).rejects.toThrow("nope");
    await expect(run()).resolves.toBe("ok");
  });
});

describe("buildQuery", () => {
  it("repeats array keys and skips empty values", () => {
    expect(buildQuery({ bhk: [1, 2], city: "Pune", q: "", lat: undefined, upcoming: false })).toBe(
      "?bhk=1&bhk=2&city=Pune&upcoming=false",
    );
    expect(buildQuery({})).toBe("");
  });
});

describe("apiRequest auth handling", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    sessionStore.setSession(auth("expired-token"));
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    sessionStore.reset();
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) return json(200, auth("fresh-token"));
      const token = (init?.headers as Record<string, string>).Authorization;
      return token === "Bearer fresh-token" ? json(200, { ok: true }) : json(401, { code: "UNAUTHORIZED" });
    });

    await expect(apiRequest("/users/me")).resolves.toEqual({ ok: true });
    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual(["/api/v1/users/me", "/api/v1/auth/refresh", "/api/v1/users/me"]);
    expect(authHeader(fetchMock.mock.calls[2])).toBe("Bearer fresh-token");
    expect(sessionStore.getState().accessToken).toBe("fresh-token");
  });

  it("dedupes the refresh across concurrent 401s", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        await new Promise((r) => setTimeout(r, 10));
        return json(200, auth("fresh-token"));
      }
      const token = (init?.headers as Record<string, string>).Authorization;
      return token === "Bearer fresh-token" ? json(200, { url }) : json(401, {});
    });

    const results = await Promise.all([apiRequest("/a"), apiRequest("/b"), apiRequest("/c")]);
    expect(results).toHaveLength(3);
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("logs out when the refresh fails", async () => {
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith("/auth/refresh") ? json(401, {}) : json(401, { code: "UNAUTHORIZED" }),
    );
    await expect(apiRequest("/users/me")).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.getState()).toMatchObject({ status: "anonymous", accessToken: null, user: null });
  });

  it("does not attempt a refresh for anonymous requests", async () => {
    sessionStore.clear();
    fetchMock.mockResolvedValue(json(401, {}));
    await expect(apiRequest("/shortlist")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[0])).toBeUndefined();
  });

  it("waits for an in-flight session restore before sending", async () => {
    sessionStore.reset();
    let releaseRefresh!: () => void;
    fetchMock.mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/refresh")) {
        await new Promise<void>((r) => (releaseRefresh = r));
        return json(200, auth("boot-token"));
      }
      return json(200, []);
    });

    const boot = refreshSession();
    const request = apiRequest("/shortlist");
    await Promise.resolve();
    releaseRefresh();
    await boot;
    await request;
    expect(authHeader(fetchMock.mock.calls[1])).toBe("Bearer boot-token");
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest("/shortlist/p1", { method: "PUT" })).resolves.toBeUndefined();
  });
});
