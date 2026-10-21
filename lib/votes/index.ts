/**
 * Votes and what they are about, shaped for the site. Pure: shared by the
 * document pages, the per-riksmöte vote lists (static JSON) and the member
 * page's vote list (a Client Component).
 */
import type { DocumentEntry, VoteEntry } from "@/lib/data/types";

/** "2025/26" → "2025-26" (URL segment) */
export function riksmoteUrlSlug(riksmote: string): string {
  return riksmote.replace("/", "-");
}

const TRANSLITERATE: Record<string, string> = { å: "a", ä: "a", ö: "o", é: "e", ü: "u" };

/** "JuU41" → "juu41", "FöU9" → "fou9": ASCII-only URL segment for a beteckning. */
export function documentSlug(beteckning: string): string {
  return beteckning
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, (char) => TRANSLITERATE[char] ?? "-");
}

/** The site's page about one beteckning; `voteId` anchors one vote on it. */
export function documentPath(riksmote: string, beteckning: string, voteId?: string): string {
  const base = `/voteringar/${riksmoteUrlSlug(riksmote)}/${documentSlug(beteckning)}/`;
  return voteId ? `${base}#${voteAnchor(voteId)}` : base;
}

export function voteAnchor(voteId: string): string {
  return `votering-${voteId.toLowerCase()}`;
}

/** The vote list of a riksmöte as static JSON, fetched by the member page. */
export function voteListPath(riksmote: string): string {
  return `/data/voteringar/${riksmoteUrlSlug(riksmote)}.json`;
}

/** [vote id, date, beteckning, punkt, motivfrågan (1) or not (0), point heading or null] */
export type VoteListRow = [string, string, string, number, 0 | 1, string | null];

export interface VoteList {
  riksmote: string;
  /** In the order of the members' ballot strings. */
  votes: VoteListRow[];
  /** Document title by beteckning. */
  titles: Record<string, string>;
}

export function buildVoteList(
  riksmote: string,
  votes: readonly VoteEntry[],
  documents: readonly DocumentEntry[],
): VoteList {
  return {
    riksmote,
    votes: votes.map((v) => [v.id, v.date, v.beteckning, v.punkt, v.avser === "motivfrågan" ? 1 : 0, v.rubrik]),
    titles: Object.fromEntries(documents.map((d) => [d.beteckning, d.title])),
  };
}

/** Ballot codes in members' ballot strings (see data/README.md). */
export const ROST_LABELS = { J: "Ja", N: "Nej", A: "Avstår", F: "Frånvarande" } as const;
export type BallotCode = keyof typeof ROST_LABELS;
