/**
 * npm run data:summarize [-- --dry-run] [-- --limit N]
 *
 * Writes short summaries for voted documents that Riksdagen has not
 * summarised ("Beslut i korthet" missing — omröstningar, and new betänkanden
 * before Riksdagen publishes one) to data/generated-summaries.json, using
 * the Claude API. Runs after `data:fetch`, before `data:compute`.
 *
 * A summary is generated once per document and kept; entries are dropped
 * when Riksdagen's own summary appears. Without ANTHROPIC_API_KEY (or with
 * --dry-run) it only lists what it would generate and exits 0, so the data
 * refresh never depends on it.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import {
  GENERATED_SUMMARIES_PATH,
  readGeneratedSummaries,
  serializeGeneratedSummaries,
} from "@/lib/pipeline/generated-summaries";
import {
  buildPrompt,
  MAX_SOURCE_CHARS,
  SUMMARY_MODEL,
  SYSTEM_PROMPT,
  summaryOutputSchema,
  toGeneratedSummary,
} from "@/lib/pipeline/summarize";
import { readRiksmoteDocuments, readRiksmoteVotes, writeFileAtomic } from "@/lib/riksdagen/cache";
import { fetchBinary } from "@/lib/riksdagen/client";
import { RIKSMOTEN } from "@/lib/riksdagen/config";
import type { Rost, VoteDocument } from "@/lib/riksdagen/types";

const DEFAULT_LIMIT = 20;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** A betänkande's full text; `null` for omröstningar (their text is only the vote table). */
async function sourceText(doc: VoteDocument): Promise<string | null> {
  if (doc.kind === "omrostning") return null;
  const body = await fetchBinary(`/dokument/${encodeURIComponent(doc.dokId)}.text`);
  if (body === null) return null;
  return new TextDecoder("utf-8").decode(body);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run") || !process.env.ANTHROPIC_API_KEY;
  const limit = Number(option("--limit") ?? DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit < 0) throw new Error("--limit must be a non-negative integer");

  const file = await readGeneratedSummaries();
  const existing = new Map(file.summaries.map((s) => [`${s.riksmote} ${s.beteckning}`, s]));
  const kept = new Map<string, (typeof file.summaries)[number]>();
  const todo: { riksmote: string; doc: VoteDocument }[] = [];

  for (const riksmote of RIKSMOTEN) {
    for (const doc of (await readRiksmoteDocuments(riksmote)).documents) {
      const key = `${riksmote} ${doc.beteckning}`;
      if (doc.summary.length > 0) continue; // Riksdagen's own summary: nothing to generate, drop ours
      const previous = existing.get(key);
      if (previous && previous.dokId === doc.dokId) kept.set(key, previous);
      else todo.push({ riksmote, doc });
    }
  }
  const dropped = file.summaries.length - kept.size;
  console.log(
    `${kept.size} generated summaries kept, ${dropped} dropped, ${todo.length} documents without a summary`,
  );

  if (dryRun) {
    for (const { riksmote, doc } of todo) console.log(`  would summarise ${riksmote}:${doc.beteckning} ${doc.title}`);
    if (!process.env.ANTHROPIC_API_KEY) console.log("ANTHROPIC_API_KEY is not set — nothing generated.");
    if (dropped > 0 && !process.argv.includes("--dry-run")) {
      await writeFileAtomic(GENERATED_SUMMARIES_PATH, serializeGeneratedSummaries({ ...file, summaries: [...kept.values()] }));
    }
    return;
  }

  const client = new Anthropic();
  const generatedAt = new Date().toISOString().slice(0, 10);
  const counts = (rost: Rost[]) => ({
    ja: rost.filter((r) => r === "Ja").length,
    nej: rost.filter((r) => r === "Nej").length,
    avstar: rost.filter((r) => r === "Avstår").length,
    franvarande: rost.filter((r) => r === "Frånvarande").length,
  });

  let made = 0;
  for (const { riksmote, doc } of todo.slice(0, limit)) {
    const votes = (await readRiksmoteVotes(riksmote)).votes
      .filter((v) => v.beteckning === doc.beteckning)
      .map((v) => ({
        date: v.date,
        punkt: v.punkt,
        rubrik: doc.punkter.find((p) => p.punkt === v.punkt)?.rubrik ?? null,
        counts: counts(v.ballots.map((b) => b.rost)),
      }));
    const text = await sourceText(doc);
    if (text && text.length > MAX_SOURCE_CHARS) {
      console.warn(`  ${riksmote}:${doc.beteckning}: text is ${text.length} characters — skipped`);
      continue;
    }

    const response = await client.beta.messages.parse({
      model: SUMMARY_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(summaryOutputSchema) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(riksmote, doc, votes, text) }],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !response.parsed_output) {
      console.warn(`  ${riksmote}:${doc.beteckning}: no summary (stop reason ${response.stop_reason})`);
      continue;
    }
    const summary = toGeneratedSummary(riksmote, doc, response.parsed_output, response.model, generatedAt);
    if (!summary) {
      console.log(`  ${riksmote}:${doc.beteckning}: the source is too thin for a summary`);
      continue;
    }
    kept.set(`${riksmote} ${doc.beteckning}`, summary);
    made++;
    console.log(`  summarised ${riksmote}:${doc.beteckning} (${response.model})`);
  }
  if (todo.length > limit) console.log(`  ${todo.length - limit} left for later runs (--limit ${limit})`);

  await writeFileAtomic(
    GENERATED_SUMMARIES_PATH,
    serializeGeneratedSummaries({ schemaVersion: 1, summaries: [...kept.values()] }),
  );
  console.log(`Wrote ${made} new summaries to ${GENERATED_SUMMARIES_PATH}`);
}

main().catch((error: unknown) => {
  console.error(`data:summarize failed.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
