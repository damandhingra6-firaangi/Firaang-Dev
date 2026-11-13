type FetchOptions = {
  timeoutMs?: number;
  maxAttempts?: number;
  retrySafe?: boolean;
  operation?: string;
};

type HostState = {
  failures: number;
  openUntil: number;
  active: number;
};

const hosts = new Map<string, HostState>();
const RETRY_CODES = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"]);
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

export function getUpstreamErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "UNKNOWN";
  const record = error as { code?: unknown; name?: string; cause?: unknown; errors?: unknown[] };
  if (record.name === "TimeoutError") return "ETIMEDOUT";
  if (typeof record.code === "string") return record.code;
  if (record.cause) return getUpstreamErrorCode(record.cause);
  return record.errors?.map(getUpstreamErrorCode).find((code) => RETRY_CODES.has(code)) ?? "UNKNOWN";
}

export class UpstreamError extends Error {
  constructor(
    public readonly host: string,
    public readonly code: string,
    public readonly status: number = code === "ETIMEDOUT" ? 504 : 502,
  ) {
    super(`Upstream request failed (${host}, ${code})`);
    this.name = "UpstreamError";
  }
}

export function upstreamErrorResponse(error: unknown): Response {
  const status = error instanceof UpstreamError ? error.status : getUpstreamErrorCode(error) === "ETIMEDOUT" ? 504 : 502;
  return Response.json({ error: status === 504 ? "Upstream request timed out" : "Upstream service unavailable" }, { status });
}

async function withSignal<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([operation(), aborted]);
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}

export async function fetchUpstream(
  input: string | URL,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<Response> {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported upstream protocol");
  const host = url.hostname;
  let state = hosts.get(host);
  if (!state) {
    if (hosts.size >= 128) {
      for (const [key, value] of hosts) {
        if (value.active === 0 && value.openUntil <= Date.now()) hosts.delete(key);
      }
      if (hosts.size >= 128) throw new UpstreamError(host, "UPSTREAM_CAPACITY");
    }
    state = { failures: 0, openUntil: 0, active: 0 };
    hosts.set(host, state);
  }
  if (state.openUntil > Date.now() || state.active >= 8 || (state.failures >= 3 && state.active > 0)) {
    console.warn("[upstream-fetch] blocked", { host, attempt: 0, code: "CIRCUIT_OPEN" });
    throw new UpstreamError(host, "CIRCUIT_OPEN");
  }

  const safe = options.retrySafe ?? ["GET", "HEAD"].includes((init.method ?? "GET").toUpperCase());
  const attempts = safe ? Math.max(1, Math.min(3, options.maxAttempts ?? 3)) : 1;
  state.active += 1;
  try {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      init.signal?.throwIfAborted();
      const deadline = AbortSignal.timeout(options.timeoutMs ?? 10_000);
      const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
      let phase = "headers";
      try {
        const response = await withSignal(async () => {
          const upstream = await fetch(input, { ...init, signal });
          phase = "body";
          const body = await upstream.arrayBuffer();
          return new Response([204, 205, 304].includes(upstream.status) || init.method?.toUpperCase() === "HEAD" ? null : body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: upstream.headers,
          });
        }, signal);
        if (RETRY_STATUSES.has(response.status)) {
          throw new UpstreamError(host, `HTTP_${response.status}`, response.status === 504 ? 504 : 502);
        }
        state.failures = 0;
        state.openUntil = 0;
        return response;
      } catch (error) {
        if (init.signal?.aborted) throw error;
        const code = error instanceof UpstreamError ? error.code : getUpstreamErrorCode(error);
        console.warn("[upstream-fetch] failed", { host, attempt, code, operation: options.operation, phase, deadlineExceeded: deadline.aborted });
        const retryable = RETRY_CODES.has(code) || /^HTTP_(429|502|503|504)$/.test(code);
        if (!retryable || attempt === attempts) {
          state.failures += 1;
          if (state.failures >= 3) state.openUntil = Date.now() + 30_000;
          throw error instanceof UpstreamError ? error : new UpstreamError(host, code);
        }
        const delay = 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
        const backoff = () => new Promise((resolve) => setTimeout(resolve, delay));
        if (init.signal) await withSignal(backoff, init.signal);
        else await backoff();
      }
    }
    throw new UpstreamError(host, "UNKNOWN");
  } finally {
    state.active -= 1;
  }
}