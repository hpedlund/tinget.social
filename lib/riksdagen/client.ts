import type { z } from "zod";

import {
  MAX_RESPONSE_BYTES,
  MAX_RETRIES,
  MIN_REQUEST_INTERVAL_MS,
  REQUEST_TIMEOUT_MS,
  RIKSDAGEN_BASE_URL,
  USER_AGENT,
} from "./config";
import { formatZodError } from "./errors";

const BASE_ORIGIN = new URL(RIKSDAGEN_BASE_URL).origin;

let nextRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

/** Runs requests one at a time, at most one start per MIN_REQUEST_INTERVAL_MS. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = nextRequestAt - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

export function buildUrl(pathname: string, params: Record<string, string> = {}): URL {
  const url = new URL(pathname, RIKSDAGEN_BASE_URL);
  if (url.origin !== BASE_ORIGIN) {
    throw new Error(`Refusing to fetch outside ${RIKSDAGEN_BASE_URL}: ${url.href}`);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    url: URL,
  ) {
    super(`Riksdagen responded ${status} for ${url.href}`);
  }
}

async function request(url: URL): Promise<Uint8Array | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await throttled(async () => {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          redirect: "error",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new HttpError(response.status, url);

        const declared = Number(response.headers.get("content-length") ?? 0);
        if (declared > MAX_RESPONSE_BYTES) {
          throw new Error(`Response too large (${declared} bytes) for ${url.href}`);
        }
        const body = new Uint8Array(await response.arrayBuffer());
        if (body.byteLength > MAX_RESPONSE_BYTES) {
          throw new Error(`Response too large (${body.byteLength} bytes) for ${url.href}`);
        }
        return body;
      });
    } catch (error) {
      const retryable = !(error instanceof HttpError) || error.status >= 500;
      if (!retryable || attempt >= MAX_RETRIES) throw error;
      const delay = 2_000 * 2 ** attempt;
      console.warn(`  retrying in ${delay / 1000}s after: ${String(error)}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** Downloads a file; `null` when it does not exist (404). */
export async function fetchBinary(pathname: string): Promise<Uint8Array | null> {
  return request(buildUrl(pathname));
}

export function parseJson<T>(body: Uint8Array, schema: z.ZodType<T>, source: string): T {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch (error) {
    throw new Error(`Invalid JSON from ${source}: ${String(error)}`);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new Error(`Unexpected data shape from ${source}:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

/**
 * Fetches JSON (`utformat=json`) and validates it. Returns the validated data
 * and the raw body so callers can cache exactly what was downloaded.
 */
export async function fetchJson<T>(
  pathname: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<{ data: T; raw: Uint8Array }> {
  const url = buildUrl(pathname, { ...params, utformat: "json" });
  const raw = await request(url);
  if (raw === null) throw new HttpError(404, url);
  return { data: parseJson(raw, schema, url.href), raw };
}
