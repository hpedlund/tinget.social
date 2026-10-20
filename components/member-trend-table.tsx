import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber, formatPercent } from "@/lib/format";
import type { MemberPeriodRow } from "@/lib/member/profile";
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

/** Attendance per riksmöte, oldest first. */
export function MemberTrendTable({ rows, caption }: { rows: readonly MemberPeriodRow[]; caption: string }) {
  return (
    <Table className={tableStyles}>
      <TableCaption className="text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Riksmöte</TableHead>
          <TableHead scope="col" className="text-right">
            Närvaro
          </TableHead>
          <TableHead scope="col" className="text-right">
            Plats
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Voteringar
          </TableHead>
          <TableHead scope="col" className="hidden text-right sm:table-cell">
            Frånvarande
          </TableHead>
          <TableHead scope="col" className="text-right">
            Partiets snitt
          </TableHead>
        </TableRow>
      </TableHeader>
      <tbody className="tabular-nums">
        {rows.map((row) => (
          <tr key={row.periodId}>
            <th scope="row">
              {row.label}
              {!row.complete && <span className="font-normal text-muted-foreground"> (pågår)</span>}
            </th>
            <td className="num">
              {formatPercent(row.attendance)}
              <span aria-hidden="true" className="bar">
                <span style={{ width: `${row.attendance * 100}%` }} />
              </span>
            </td>
            <td className="num">
              {row.rank !== null ? (
                <>
                  {formatNumber(row.rank)}
                  <span className="dim"> av {formatNumber(row.rankedCount)}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="dim">
                    –
                  </span>
                  <span className="sr-only">rankas inte</span>
                </>
              )}
            </td>
            <td className="sm-col num">{formatNumber(row.eligible)}</td>
            <td className="sm-col num">{formatNumber(row.counts.franvarande)}</td>
            <td className="num dim">
              {row.partyAttendance !== null ? formatPercent(row.partyAttendance) : "–"}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
