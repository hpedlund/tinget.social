import { PartyLabel } from "@/components/party-label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RankedRow, UnrankedRow } from "@/lib/data";
import { formatNumber, formatPercent } from "@/lib/format";

/**
 * One responsive table: on mobile, party and constituency move under the
 * name and the vote counts are hidden, so there is a single table for
 * screen readers instead of a second, duplicated card list.
 */
export function RankingTable({
  rows,
  caption,
}: {
  rows: readonly (RankedRow | UnrankedRow)[];
  caption: string;
}) {
  const showRank = rows.some((row) => "rank" in row);
  return (
    <Table>
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
          <TableHead scope="col" className="text-right">
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
      <TableBody className="tabular-nums">
        {rows.map((row) => (
          <TableRow key={row.memberId}>
            {showRank && (
              <TableCell className="text-right text-muted-foreground">
                {"rank" in row ? row.rank : null}
              </TableCell>
            )}
            <TableHead scope="row" className="h-auto py-2 font-medium whitespace-normal">
              {row.name}
              <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                <PartyLabel party={row.party} /> · {row.constituency}
              </span>
            </TableHead>
            <TableCell className="hidden sm:table-cell">
              <PartyLabel party={row.party} />
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">
              {row.constituency}
            </TableCell>
            <TableCell className="text-right">
              <span className="font-medium">{formatPercent(row.attendance)}</span>
              <span
                aria-hidden="true"
                className="mt-1 ml-auto hidden h-1 w-20 overflow-hidden rounded-full bg-muted sm:block"
              >
                <span
                  className="block h-full bg-primary"
                  style={{ width: `${row.attendance * 100}%` }}
                />
              </span>
            </TableCell>
            <TableCell className="hidden text-right sm:table-cell">
              {formatNumber(row.eligible)}
            </TableCell>
            <TableCell className="hidden text-right sm:table-cell">
              {formatNumber(row.counts.franvarande)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
