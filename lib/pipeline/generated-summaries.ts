/** data/generated-summaries.json: read by `data:compute`, written by `data:summarize`. */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { DATA_DIR } from "@/lib/data";
import { generatedSummariesFileSchema } from "@/lib/data/schemas";
import type { GeneratedSummariesFile } from "@/lib/data/types";
import { compare } from "@/lib/riksdagen/compare";
import { formatZodError } from "@/lib/riksdagen/errors";

export const GENERATED_SUMMARIES_PATH = path.join(DATA_DIR, "generated-summaries.json");

/** An empty list when the file does not exist yet. */
export async function readGeneratedSummaries(): Promise<GeneratedSummariesFile> {
  let raw: string;
  try {
    raw = await readFile(GENERATED_SUMMARIES_PATH, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { schemaVersion: 1, summaries: [] };
    throw error;
  }
  const result = generatedSummariesFileSchema.safeParse(JSON.parse(raw));
  if (!result.success) {
    throw new Error(`Invalid ${GENERATED_SUMMARIES_PATH}:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

/** Deterministic serialisation: sorted by riksmöte, then beteckning. */
export function serializeGeneratedSummaries(file: GeneratedSummariesFile): string {
  const summaries = [...file.summaries].sort(
    (a, b) => compare(a.riksmote, b.riksmote) || compare(a.beteckning, b.beteckning),
  );
  return `${JSON.stringify(generatedSummariesFileSchema.parse({ ...file, summaries }), null, 2)}\n`;
}
