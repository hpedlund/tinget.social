import Link from "next/link";

import { PartyLabel } from "@/components/party-label";
import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { RankingRow } from "@/lib/ranking/explorer";
import { cn } from "@/lib/utils";

/**
 * Body cells are styled once at table level and carry at most a short
 * marker class (`sm-col`, `md-col`, `num`): with ~450 rows, per-cell
 * utility strings would make the page several times larger.
 */
const tableStyles = cn(
  "[&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0 [&_tbody_tr]:hover:bg-muted/50",
  "[&_tbody_td]:p-2 [&_tbody_td]:align-middle [&_tbody_td]:whitespace-nowrap",
  "[&_tbody_th]:p-2 [&_tbody_th]:text-left [&_tbody_th]:font-medium",
  "[&_th_a]:underline [&_th_a]:decoration-muted-foreground/50 [&_th_a]:underline-offset-4 [&_th_a:hover]:decoration-foreground",
  "[&_th_a:focus-visible]:outline-2 [&_th_a:focus-visible]:outline-offset-2",
  "[&_.num]:text-right [&_.dim]:text-muted-foreground [&_abbr]:no-underline",
  "[&_.sm-col]:hidden sm:[&_.sm-col]:table-cell [&_.md-col]:hidden md:[&_.md-col]:table-cell",
  "[&_.sm-only]:block [&_.sm-only]:text-xs [&_.sm-only]:font-normal [&_.sm-only]:text-muted-foreground sm:[&_.sm-only]:hidden",
  "[&_.bar]:mt-1 [&_.bar]:ml-auto [&_.bar]:hidden [&_.bar]:h-1 [&_.bar]:w-20 [&_.bar]:overflow-hidden [&_.bar]:rounded-full [&_.bar]:bg-muted sm:[&_.bar]:block",
  "[&_.bar>span]:block [&_.bar>span]:h-full [&_.bar>span]:bg-primary",
);

/**
 * One responsive table: on mobile, party and constituency move under the
 * name and the vote counts are hidden, so there is a single table for
 * screen readers instead of a second, duplicated card list.
 */
export function RankingTable({
  rows,
  caption,
  sortDirection,
}: {
  rows: readonly RankingRow[];
  caption: string;
  /** Sets `aria-sort` on Närvaro: "descending" = most present first. */
  sortDirection?: "ascending" | "descending";
}) {
  const showRank = rows.some((row) => row.rank !== null);
  return (
    <Table className={tableStyles}>
      <TableCaption className="text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {showRank && (
            <TableHead scope="col" className="w-12 text-right">
              Plats
            </TableHead>
          )}
          <TableHead scope="col">Ledamot</TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">
            Parti
          </TableHead>
          <TableHead scope="col" className="hidden md:table-cell">
            Valkrets
          </TableHead>
          <TableHead scope="col" className="text-right" aria-sort={sortDirection}>
            Närvaro
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Voteringar
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Frånvarande
          </TableHead>
        </TableRow>
      </TableHeader>
      <tbody className="tabular-nums">
        {rows.map((row) => (
          <tr key={row.memberId}>
            {showRank && <td className="num dim">{row.rank}</td>}
            <th scope="row">
              <Link href={`/ledamoter/${row.memberId}/`} prefetch={false}>
                {row.name}
              </Link>
              <span className="sm-only">
                <PartyLabel party={row.party} /> · {row.constituency}
              </span>
            </th>
            <td className="sm-col">
              <PartyLabel party={row.party} />
            </td>
            <td className="md-col dim">{row.constituency}</td>
            <td className="num">
              {formatPercent(row.attendance)}
              <span aria-hidden="true" className="bar">
                <span style={{ width: `${row.attendance * 100}%` }} />
              </span>
            </td>
            <td className="sm-col num">{formatNumber(row.eligible)}</td>
            <td className="sm-col num">{formatNumber(row.absent)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
