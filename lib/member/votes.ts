/**
 * The member page's vote list: joins a member's ballot string with the
 * riksmöte's vote list. Pure; runs in the browser on precomputed data.
 */
import { ROST_LABELS, type BallotCode, type VoteList } from "@/lib/votes";

export interface MemberVoteRow {
  id: string;
  date: string;
  beteckning: string;
  punkt: number;
  motivfragan: boolean;
  /** The proposal point's heading, or the document title when there is none. */
  topic: string;
  /** Document title; `null` when it is the topic itself or unknown. */
  title: string | null;
  /** Whether the site has a page for the document (every identified document does). */
  hasPage: boolean;
  code: BallotCode;
  rost: (typeof ROST_LABELS)[BallotCode];
}

export interface VoteFilter {
  /** `null` = every ballot. */
  code: BallotCode | null;
  query: string;
}

const isCode = (code: string): code is BallotCode => code in ROST_LABELS;

/** The member's ballots in the riksmöte, newest first; throws if the data does not line up. */
export function memberVoteRows(list: VoteList, codes: string): MemberVoteRow[] {
  if (codes.length !== list.votes.length) {
    throw new Error(`${codes.length} ballots but ${list.votes.length} votes in ${list.riksmote}`);
  }
  const rows: MemberVoteRow[] = [];
  list.votes.forEach(([id, date, beteckning, punkt, motiv, rubrik], index) => {
    const code = codes[index]!;
    if (!isCode(code)) return; // "-": not serving
    const title = list.titles[beteckning] ?? null;
    const topic = rubrik ?? title ?? beteckning;
    rows.push({
      id,
      date,
      beteckning,
      punkt,
      motivfragan: motiv === 1,
      topic,
      title: title === topic ? null : title,
      hasPage: title !== null,
      code,
      rost: ROST_LABELS[code],
    });
  });
  return rows.reverse();
}

export function filterVoteRows(rows: readonly MemberVoteRow[], filter: VoteFilter): MemberVoteRow[] {
  const words = filter.query.toLocaleLowerCase("sv-SE").split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (filter.code && row.code !== filter.code) return false;
    if (words.length === 0) return true;
    const text = `${row.topic} ${row.title ?? ""} ${row.beteckning}`.toLocaleLowerCase("sv-SE");
    return words.every((word) => text.includes(word));
  });
}
