import Link from "next/link";

import { PartySwatch } from "@/components/party-swatch";
import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { PartyRow } from "@/lib/party-overview/overview";
import { cn } from "@/lib/utils";

const tableStyles = cn(
  "[&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0",
  "[&_tbody_td]:p-2 [&_tbody_td]:align-middle [&_tbody_td]:whitespace-nowrap",
  "[&_tbody_th]:p-2 [&_tbody_th]:text-left [&_tbody_th]:font-medium [&_tbody_th]:whitespace-nowrap",
  "[&_.num]:text-right [&_.dim]:text-muted-foreground",
  "[&_.sm-col]:hidden sm:[&_.sm-col]:table-cell",
  "[&_.bar]:mt-1 [&_.bar]:ml-auto [&_.bar]:block [&_.bar]:h-1 [&_.bar]:w-20 [&_.bar]:overflow-hidden [&_.bar]:rounded-full [&_.bar]:bg-muted",
  "[&_.bar>span]:block [&_.bar>span]:h-full [&_.bar>span]:bg-primary",
);

const linkClassName =
  "underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

/** Attendance per party in one period, best first; names link to the filtered ranking. */
export function PartyTable({ rows, caption }: { rows: readonly PartyRow[]; caption: string }) {
  return (
    <Table className={tableStyles}>
      <TableCaption className="text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Parti</TableHead>
          <TableHead scope="col" className="text-right">
            Närvaro
          </TableHead>
          <TableHead scope="col" className="text-right">
            Median
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Lägst–högst
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Ledamöter
          </TableHead>
        </TableRow>
      </TableHeader>
      <tbody className="tabular-nums">
        {rows.map((row) => (
          <tr key={row.party}>
            <th scope="row">
              <span className="flex items-center gap-2">
                <PartySwatch party={row.party} />
                <Link href={row.rankingHref} prefetch={false} className={linkClassName}>
                  {row.name}
                </Link>
                {row.name !== row.party && <span className="dim hidden font-normal sm:inline">{row.party}</span>}
              </span>
            </th>
            <td className="num">
              {formatPercent(row.attendance)}
              <span aria-hidden="true" className="bar">
                <span style={{ width: `${row.attendance * 100}%` }} />
              </span>
            </td>
            <td className="num">{row.spread ? formatPercent(row.spread.median) : "–"}</td>
            <td className="sm-col num dim">
              {row.spread ? (
                <>
                  {formatPercent(row.spread.min).replace(/\s%$/u, "")}–{formatPercent(row.spread.max)}
                </>
              ) : (
                "–"
              )}
            </td>
            <td className="sm-col num">
              {formatNumber(row.memberCount)}
              {row.rankedMembers !== row.memberCount && (
                <span className="dim"> ({formatNumber(row.rankedMembers)} rankade)</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
