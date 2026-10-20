import path from "node:path";

/** The only host the pipeline talks to. Never built from input. */
export const RIKSDAGEN_BASE_URL = "https://data.riksdagen.se";

/** Riksmöten of the 2022–2026 electoral term, oldest first. */
export const TERM_RIKSMOTEN = ["2022/23", "2023/24", "2024/25", "2025/26"] as const;

/** The riksmöte in progress — always re-fetched, never marked complete. */
export const CURRENT_RIKSMOTE = "2026/27";

export const RIKSMOTEN: readonly string[] = [...TERM_RIKSMOTEN, CURRENT_RIKSMOTE];

/** Minimum time between request starts: at most 5 requests per second. */
export const MIN_REQUEST_INTERVAL_MS = 200;
export const REQUEST_TIMEOUT_MS = 120_000;
export const MAX_RETRIES = 2;
export const MAX_RESPONSE_BYTES = 128 * 1024 * 1024;
export const MAX_UNZIPPED_BYTES = 1024 * 1024 * 1024;

/** `voteringlista` silently truncates at this many rows. */
export const VOTERINGLISTA_ROW_CAP = 10_000;

export const USER_AGENT =
  "tinget.social data pipeline (+https://github.com/hpedlund/tinget.social)";

export const CACHE_DIR = path.join(process.cwd(), ".cache", "riksdagen");
export const RAW_DIR = path.join(CACHE_DIR, "raw");

/** "2025/26" → "2025-26" (file names) */
export function riksmoteSlug(riksmote: string): string {
  return riksmote.replace("/", "-");
}

/** "2025/26" → "202526" (dataset file names) */
export function riksmoteCompact(riksmote: string): string {
  return riksmote.replace("/", "");
}
