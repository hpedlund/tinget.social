"use client";

import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import type { CompactMissedGroup } from "@/lib/member/profile";
import { voteSourceUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * A Client Component only for page weight: the rows arrive as compact props
 * and are prerendered to HTML; nothing here is interactive beyond <details>.
 * Styled at table level like RankingTable, so rows carry no classes.
 */
const tableStyles = cn(
  "[&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0",
  "[&_tbody_td]:px-2 [&_tbody_td]:py-1.5 [&_tbody_td]:align-middle [&_tbody_td]:whitespace-nowrap",
  "[&_tbody_td:first-child]:text-muted-foreground",
  "[&_tbody_td:nth-child(3)]:hidden [&_tbody_td:nth-child(3)]:text-right sm:[&_tbody_td:nth-child(3)]:table-cell",
  "[&_tbody_a]:font-medium [&_tbody_a]:underline [&_tbody_a]:underline-offset-4 [&_tbody_a:hover]:text-muted-foreground",
  "[&_tbody_a:focus-visible]:outline-2 [&_tbody_a:focus-visible]:outline-offset-2",
);

const votes = (n: number) => `${formatNumber(n)} ${n === 1 ? "votering" : "voteringar"}`;

/** Missed votes per riksmöte, newest first, collapsed: the summary shows the count. */
export function MissedVotes({ groups, memberName }: { groups: CompactMissedGroup[]; memberName: string }) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <details key={group.riksmote} className="rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
            {group.riksmote}{" "}
            <span className="font-normal text-muted-foreground">— {votes(group.votes.length)}</span>
          </summary>
          <div className="border-t px-2 pb-2">
            <Table className={tableStyles}>
              <TableCaption className="sr-only">
                {`Voteringar ${group.riksmote} där ${memberName} var frånvarande, i datumordning.`}
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Datum</TableHead>
                  <TableHead scope="col">Votering hos riksdagen</TableHead>
                  <TableHead scope="col" className="hidden text-right sm:table-cell">
                    Frånvarande totalt
                  </TableHead>
                </TableRow>
              </TableHeader>
              <tbody className="tabular-nums">
                {group.votes.map(([id, date, beteckning, punkt, motiv, absent]) => (
                  <tr key={id}>
                    <td>{formatDate(date)}</td>
                    <td>
                      <a href={voteSourceUrl(id)}>
                        {beteckning}
                        {punkt > 0 && ` punkt ${punkt}`}
                        {motiv === 1 && " (motivfrågan)"}
                      </a>
                    </td>
                    <td>{formatNumber(absent)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </details>
      ))}
    </div>
  );
}
