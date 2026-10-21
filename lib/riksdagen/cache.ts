import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

import { CACHE_DIR, riksmoteSlug } from "./config";
import { formatZodError } from "./errors";
import { agendaSchema, manifestSchema, membersSchema, riksmoteVotesSchema } from "./normalized";
import type { Agenda, Manifest, Members, RiksmoteVotes } from "./types";

export const votesPath = (riksmote: string) =>
  path.join(CACHE_DIR, `votes-${riksmoteSlug(riksmote)}.json`);
export const MEMBERS_PATH = path.join(CACHE_DIR, "members.json");
export const AGENDA_PATH = path.join(CACHE_DIR, "agenda.json");
export const MANIFEST_PATH = path.join(CACHE_DIR, "manifest.json");
export const OBSERVED_PATH = path.join(CACHE_DIR, "observed.json");

/** Writes via a temp file + rename so an aborted run never leaves a partial file. */
export async function writeFileAtomic(filePath: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, filePath);
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFileAtomic(filePath, `${JSON.stringify(value)}\n`);
}

/** Reads a cached file; `null` when it does not exist. */
export async function readCached(filePath: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(filePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readValidated<T>(filePath: string, schema: z.ZodType<T>): Promise<T> {
  const raw = await readFile(filePath, "utf-8");
  const result = schema.safeParse(JSON.parse(raw));
  if (!result.success) {
    throw new Error(`Invalid cache file ${filePath}:\n${formatZodError(result.error)}`);
  }
  return result.data;
}

/** Validated votes for one riksmöte, as written by `npm run data:fetch`. */
export function readRiksmoteVotes(riksmote: string): Promise<RiksmoteVotes> {
  return readValidated(votesPath(riksmote), riksmoteVotesSchema);
}

/** Validated members, as written by `npm run data:fetch`. */
export function readMembers(): Promise<Members> {
  return readValidated(MEMBERS_PATH, membersSchema);
}

/** Validated upcoming decisions, as written by `npm run data:fetch`. */
export function readAgenda(): Promise<Agenda> {
  return readValidated(AGENDA_PATH, agendaSchema);
}

export async function readManifest(): Promise<Manifest> {
  try {
    return await readValidated(MANIFEST_PATH, manifestSchema);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { riksmoten: {} };
    throw error;
  }
}
