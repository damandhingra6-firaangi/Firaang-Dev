import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("bounded upstream fetch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retries nested ETIMEDOUT errors at most three times and returns 504 JSON", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed", {
      cause: new AggregateError([Object.assign(new Error(), { code: "ETIMEDOUT" })], "connect failed"),
    }));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    const result = fetchUpstream("https://example.com/private?token=secret").catch(upstreamErrorResponse);
    await vi.runAllTimersAsync();
    const response = await result;
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: "Upstream request timed out" });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("secret");
  });

  it("does not retry a 400 response or unsafe writes", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    expect((await fetchUpstream("https://example.com")).status).toBe(400);
    fetch.mockRejectedValue(Object.assign(new Error(), { code: "ECONNRESET" }));
    const response = await fetchUpstream("https://example.com", { method: "POST" }).catch(upstreamErrorResponse);
    expect(response.status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries transient HTTP statuses with exponential backoff and jitter", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response('{"ok":true}'));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream } = await import("./upstream-fetch");
    const result = fetchUpstream("https://example.com");
    await vi.advanceTimersByTimeAsync(374);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(624);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await (await result).json()).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("preserves gateway timeout status and blocks repeated 502 failures", async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(null, { status: 504 }));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    const response = await fetchUpstream("https://example.com", {}, { maxAttempts: 1 }).catch(upstreamErrorResponse);
    expect(response.status).toBe(504);
    fetch.mockImplementation(async () => new Response(null, { status: 502 }));
    expect((await fetchUpstream("https://example.com", {}, { maxAttempts: 1 }).catch(upstreamErrorResponse)).status).toBe(502);
  });

  it("times out stalled requests and fails fast after repeated failures", async () => {
    const fetch = vi.fn().mockRejectedValue(Object.assign(new Error(), { code: "ETIMEDOUT" }));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    for (let request = 0; request < 3; request += 1) {
      await fetchUpstream("https://example.com", {}, { maxAttempts: 1 }).catch(upstreamErrorResponse);
    }
    expect((await fetchUpstream("https://example.com").catch(upstreamErrorResponse)).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(30_001);
    fetch.mockResolvedValue(new Response("recovered"));
    expect(await (await fetchUpstream("https://example.com")).text()).toBe("recovered");
  });

  it("uses an abort deadline even when a mocked fetch never settles", async () => {
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    })));
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    const response = await fetchUpstream("https://example.com", {}, { timeoutMs: 20, maxAttempts: 1 }).catch(upstreamErrorResponse);
    expect(response.status).toBe(504);
  });

  it("bounds response-body consumption before returning a response", async () => {
    vi.useRealTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start() {} }))));
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    const response = await fetchUpstream("https://example.com", {}, { timeoutMs: 20, maxAttempts: 1 }).catch(upstreamErrorResponse);
    expect(response.status).toBe(504);
  });

  it("does not retry or consume circuit capacity for caller cancellation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream } = await import("./upstream-fetch");
    await expect(fetchUpstream("https://example.com", { signal: AbortSignal.abort() })).rejects.toHaveProperty("name", "AbortError");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caps concurrent operations so a dead host cannot pile up requests", async () => {
    const releases: Array<(response: Response) => void> = [];
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>((resolve) => releases.push(resolve)));
    vi.stubGlobal("fetch", fetch);
    const { fetchUpstream, upstreamErrorResponse } = await import("./upstream-fetch");
    const active = Array.from({ length: 8 }, () => fetchUpstream("https://example.com"));
    const blocked = await fetchUpstream("https://example.com").catch(upstreamErrorResponse);
    expect(blocked.status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(8);
    releases.forEach((release) => release(new Response("ok")));
    expect(await Promise.all(active.map(async (response) => (await response).status))).toEqual(Array(8).fill(200));
  });
});