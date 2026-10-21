"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { VoteCounts } from "@/lib/data/types";
import { formatDate, formatNumber } from "@/lib/format";
import { filterVoteRows, memberVoteRows, type MemberVoteRow } from "@/lib/member/votes";
import { cn } from "@/lib/utils";
import { documentPath, ROST_LABELS, type BallotCode, type VoteList } from "@/lib/votes";

export interface MemberRiksmoteBallots {
  riksmote: string;
  /** The riksmöte's vote list (static JSON), base path included. */
  url: string;
  /** The member's ballot string for the riksmöte. */
  codes: string;
  counts: VoteCounts;
}

const PAGE_SIZE = 50;

const COUNT_KEY: Record<BallotCode, keyof VoteCounts> = { J: "ja", N: "nej", A: "avstar", F: "franvarande" };

const tableStyles = cn(
  "[&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0",
  "[&_tbody_td]:px-2 [&_tbody_td]:py-2 [&_tbody_td]:align-top",
  "[&_tbody_td:first-child]:hidden [&_tbody_td:first-child]:whitespace-nowrap [&_tbody_td:first-child]:text-muted-foreground sm:[&_tbody_td:first-child]:table-cell",
  "[&_tbody_td:last-child]:whitespace-nowrap",
  "[&_tbody_a]:font-medium [&_tbody_a]:underline [&_tbody_a]:underline-offset-4 [&_tbody_a:hover]:text-muted-foreground",
  "[&_tbody_a:focus-visible]:outline-2 [&_tbody_a:focus-visible]:outline-offset-2",
);

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; rows: MemberVoteRow[] };
const LOADING: Load = { status: "loading" };

/** Fetches each riksmöte's vote list once per page view. */
const cache = new Map<string, Promise<VoteList>>();
function loadVoteList(url: string): Promise<VoteList> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      return response.json() as Promise<VoteList>;
    });
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Every vote the member could take part in, per riksmöte, newest first:
 * how they voted and what the vote was about. Rows come from a shared
 * static JSON file per riksmöte; the member's ballots arrive as props.
 */
export function MemberVotes({
  riksmoten,
  memberName,
}: {
  /** Newest first. */
  riksmoten: MemberRiksmoteBallots[];
  memberName: string;
}) {
  const ids = useId();
  const [riksmote, setRiksmote] = useState(riksmoten[0]?.riksmote ?? "");
  const [code, setCode] = useState<BallotCode | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loads, setLoads] = useState<Record<string, Load>>({});

  const selected = riksmoten.find((r) => r.riksmote === riksmote) ?? riksmoten[0];
  const load: Load = (selected && loads[selected.riksmote]) ?? LOADING;

  useEffect(() => {
    if (!selected) return;
    let active = true;
    loadVoteList(selected.url)
      .then((list) => memberVoteRows(list, selected.codes))
      .then(
        (rows) => active && setLoads((prev) => ({ ...prev, [selected.riksmote]: { status: "ready", rows } })),
        () => active && setLoads((prev) => ({ ...prev, [selected.riksmote]: { status: "error" } })),
      );
    return () => {
      active = false;
    };
  }, [selected]);

  const filtered = useMemo(
    () => (load.status === "ready" ? filterVoteRows(load.rows, { code, query }) : []),
    [load, code, query],
  );
  const shown = filtered.slice(0, limit);

  if (!selected) return null;

  const resetPaging = () => setLimit(PAGE_SIZE);

  return (
    <div className="space-y-4">
      <form
        role="search"
        aria-label={`Filtrera voteringar för ${memberName}`}
        onSubmit={(event) => event.preventDefault()}
        className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2fr)]"
      >
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${ids}-rm`} className="text-sm font-medium">
            Riksmöte
          </label>
          <NativeSelect
            id={`${ids}-rm`}
            value={selected.riksmote}
            onChange={(event) => {
              setRiksmote(event.target.value);
              resetPaging();
            }}
          >
            {riksmoten.map((r) => (
              <option key={r.riksmote} value={r.riksmote}>
                {r.riksmote}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${ids}-rost`} className="text-sm font-medium">
            Röst
          </label>
          <NativeSelect
            id={`${ids}-rost`}
            value={code ?? ""}
            onChange={(event) => {
              setCode((event.target.value || null) as BallotCode | null);
              resetPaging();
            }}
          >
            <option value="">Alla ({formatNumber(Object.values(selected.counts).reduce((a, b) => a + b, 0))})</option>
            {(Object.keys(ROST_LABELS) as BallotCode[]).map((key) => (
              <option key={key} value={key}>
                {ROST_LABELS[key]} ({formatNumber(selected.counts[COUNT_KEY[key]])})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
          <label htmlFor={`${ids}-q`} className="text-sm font-medium">
            Sök ärende
          </label>
          <input
            id={`${ids}-q`}
            type="search"
            value={query}
            placeholder="t.ex. skatt eller JuU41"
            onChange={(event) => {
              setQuery(event.target.value);
              resetPaging();
            }}
            className={cn(
              "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none dark:bg-input/30",
              "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          />
        </div>
      </form>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {load.status === "loading" && "Hämtar voteringar …"}
        {load.status === "error" && "Voteringarna kunde inte hämtas. Ladda om sidan för att försöka igen."}
        {load.status === "ready" &&
          `${formatNumber(filtered.length)} ${filtered.length === 1 ? "votering" : "voteringar"} ${selected.riksmote}` +
            (filtered.length > shown.length ? `, visar de ${formatNumber(shown.length)} senaste` : "") +
            "."}
      </p>

      {load.status === "ready" && shown.length > 0 && (
        <Table className={tableStyles}>
          <TableCaption className="sr-only">
            {`Hur ${memberName} röstade ${selected.riksmote}, senaste först. Ärendet länkar till en sida med sammanfattning och dokument.`}
          </TableCaption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="hidden sm:table-cell">
                Datum
              </TableHead>
              <TableHead scope="col">Ärende</TableHead>
              <TableHead scope="col">Röst</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.date)}</td>
                <td className="min-w-0">
                  {row.hasPage ? (
                    <Link href={documentPath(selected.riksmote, row.beteckning, row.id)} prefetch={false}>
                      {row.topic}
                    </Link>
                  ) : (
                    row.topic
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="sm:hidden">{formatDate(row.date)} · </span>
                    {row.beteckning}
                    {row.punkt > 0 && ` punkt ${row.punkt}`}
                    {row.motivfragan && " (motivfrågan)"}
                    {row.title && ` · ${row.title}`}
                  </div>
                </td>
                <td className={cn(row.code === "F" ? "text-muted-foreground" : "font-medium")}>{row.rost}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {load.status === "ready" && filtered.length > shown.length && (
        <Button variant="outline" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Visa fler ({formatNumber(filtered.length - shown.length)} kvar)
        </Button>
      )}
    </div>
  );
}
