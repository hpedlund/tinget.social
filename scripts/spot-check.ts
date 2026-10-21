/**
 * npm run data:spot-check
 *
 * Checks a sample of members' figures in data/ against Riksdagen, using a
 * different source than the pipeline: `/voteringlista/` filtered by member
 * (`iid`), one request per member and riksmöte. Compares the Ja/Nej/Avstår/
 * Frånvarande counts per riksmöte and exits 1 on any mismatch. Read-only.
 * The sample is chosen from data/ by rule, so it adapts as the data changes.
 */
import { getMeta, getMember, getRanking } from "@/lib/data";
import type { RankedRow, UnrankedRow, VoteCounts } from "@/lib/data";
import { fetchJson } from "@/lib/riksdagen/client";
import { VOTERINGLISTA_ROW_CAP } from "@/lib/riksdagen/config";
import { voteringlistaSchema } from "@/lib/riksdagen/schemas";
import { memberSourceUrl } from "@/lib/site";

interface Sample {
  reason: string;
  id: string;
}

const KEYS = ["ja", "nej", "avstar", "franvarande"] as const;

async function chooseSample(): Promise<Sample[]> {
  const meta = await getMeta();
  const term = await getRanking(meta.defaultPeriodId);
  const riksmoteRankings = await Promise.all(
    meta.periods.filter((p) => p.kind === "riksmote").map((p) => getRanking(p.id)),
  );

  // Party per riksmöte (latest in that riksmöte) → anyone with more than one
  const parties = new Map<string, Set<string>>();
  for (const ranking of riksmoteRankings) {
    for (const row of [...ranking.ranked, ...ranking.belowThreshold]) {
      const set = parties.get(row.memberId) ?? new Set<string>();
      set.add(row.party);
      parties.set(row.memberId, set);
    }
  }
  // Each rule picks a member not already in the sample.
  const picked = new Set<string>([term.ranked[0]!.memberId, term.ranked.at(-1)!.memberId]);
  const pick = <T extends { memberId: string }>(row: T | undefined) => {
    if (row) picked.add(row.memberId);
    return row;
  };
  const fresh = (row: { memberId: string }) => !picked.has(row.memberId);

  const switcher = pick(
    term.ranked.find((row) => fresh(row) && (parties.get(row.memberId)?.size ?? 0) > 1),
  );

  const largestParty = (() => {
    const counts = new Map<string, number>();
    for (const row of term.ranked) counts.set(row.party, (counts.get(row.party) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  })();
  const partyRows = term.ranked.filter((row) => row.party === largestParty);
  const median = pick(partyRows[Math.floor(partyRows.length / 2)]);

  const vilde = pick(term.ranked.find((row) => fresh(row) && row.party === "-"));
  const substitute = pick([...term.belowThreshold].sort((a, b) => b.eligible - a.eligible)[0]);

  let leftDuringTerm: RankedRow | undefined;
  for (const row of term.ranked.filter(fresh)) {
    const member = await getMember(row.memberId);
    if (member?.status === "Tidigare riksdagsledamot") {
      leftDuringTerm = pick(row);
      break;
    }
  }

  const candidates: [string, RankedRow | UnrankedRow | undefined][] = [
    [`highest attendance ${meta.defaultPeriodId}`, term.ranked[0]],
    [`lowest attendance ${meta.defaultPeriodId}`, term.ranked.at(-1)],
    ["changed party", switcher],
    ["politisk vilde", vilde],
    ["below the threshold, most votes", substitute],
    ["left the Riksdag during the term", leftDuringTerm],
    [`median ranked member of ${largestParty}`, median],
  ];
  const seen = new Set<string>();
  return candidates.flatMap(([reason, row]) => {
    if (!row || seen.has(row.memberId)) return [];
    seen.add(row.memberId);
    return [{ reason, id: row.memberId }];
  });
}

async function riksdagenCounts(memberId: string, riksmote: string): Promise<VoteCounts> {
  const { data } = await fetchJson(
    "/voteringlista/",
    { iid: memberId, rm: riksmote, sz: String(VOTERINGLISTA_ROW_CAP), gruppering: "" },
    voteringlistaSchema,
  );
  const list = data.voteringlista;
  if (!list["@villkor"].includes(`iid=${memberId}`)) {
    throw new Error(`voteringlista ignored the member filter: ${list["@villkor"]}`);
  }
  if (list["@antal"] >= VOTERINGLISTA_ROW_CAP) {
    throw new Error(`voteringlista truncated for ${memberId} ${riksmote}`);
  }
  const counts: VoteCounts = { ja: 0, nej: 0, avstar: 0, franvarande: 0 };
  for (const row of list.votering) {
    if (row.intressent_id !== memberId) throw new Error(`Row for ${row.intressent_id} in ${memberId}'s list`);
    if (row.rost === "Ja") counts.ja += 1;
    else if (row.rost === "Nej") counts.nej += 1;
    else if (row.rost === "Avstår") counts.avstar += 1;
    else counts.franvarande += 1;
  }
  return counts;
}

const show = (c: VoteCounts) => KEYS.map((key) => String(c[key]).padStart(4)).join(" ");

async function main() {
  const meta = await getMeta();
  const riksmoten = [...new Set(meta.periods.flatMap((p) => p.riksmoten))];
  const sample = await chooseSample();
  let mismatches = 0;

  console.log(`Spot check against /voteringlista/?iid=…, data up to ${meta.lastVoteDate}`);
  console.log("Counts: Ja Nej Avstår Frånvarande\n");

  for (const { reason, id } of sample) {
    const member = await getMember(id);
    if (!member) throw new Error(`Member ${id} missing from data/`);
    console.log(`${member.name} (${member.party || "–"}, ${id}) — ${reason}`);
    console.log(`  ${memberSourceUrl(id)}`);
    for (const riksmote of riksmoten) {
      const ours = member.byRiksmote.find((r) => r.riksmote === riksmote)?.counts ?? {
        ja: 0,
        nej: 0,
        avstar: 0,
        franvarande: 0,
      };
      const theirs = await riksdagenCounts(id, riksmote);
      const same = KEYS.every((key) => ours[key] === theirs[key]);
      if (!same) mismatches += 1;
      console.log(
        `  ${riksmote}  data/ ${show(ours)}   riksdagen ${show(theirs)}  ${same ? "OK" : "MISMATCH"}`,
      );
    }
    console.log("");
  }

  console.log(mismatches === 0 ? "All figures match." : `${mismatches} mismatches.`);
  if (mismatches > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(`\ndata:spot-check failed.\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
