import { PartyLabel } from "@/components/party-label";
import { PartySwatch } from "@/components/party-swatch";
import { Table, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent } from "@/lib/format";
import type { Period } from "@/lib/data/types";
import type { PartyTrendRow } from "@/lib/party-overview/overview";
import { cn } from "@/lib/utils";

const tableStyles = cn(
  "[&_tbody_tr]:border-b [&_tbody_tr:last-child]:border-0",
  "[&_tbody_td]:px-1.5 [&_tbody_td]:py-2 sm:[&_tbody_td]:px-2 [&_tbody_td]:text-right [&_tbody_td]:align-middle [&_tbody_td]:whitespace-nowrap",
  "[&_tbody_th]:px-1.5 [&_tbody_th]:py-2 sm:[&_tbody_th]:px-2 [&_tbody_th]:text-left [&_tbody_th]:font-medium [&_tbody_th]:whitespace-nowrap",
);

/** Pooled attendance per party and riksmöte, oldest riksmöte first. */
export function PartyTrendTable({
  riksmoten,
  rows,
  caption,
}: {
  riksmoten: readonly Period[];
  rows: readonly PartyTrendRow[];
  caption: string;
}) {
  return (
    <Table className={cn(tableStyles, "text-xs sm:text-sm")}>
      <TableCaption className="text-left">{caption}</TableCaption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col" className="h-auto px-1.5 py-2 align-bottom sm:px-2">
            Parti
          </TableHead>
          {riksmoten.map((rm) => (
            <TableHead key={rm.id} scope="col" className="h-auto px-1.5 py-2 text-right align-bottom sm:px-2">
              {rm.label}
              {!rm.complete && <span className="block font-normal sm:inline"> (pågår)</span>}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <tbody className="tabular-nums">
        {rows.map((row) => (
          <tr key={row.party}>
            <th scope="row">
              <span className="flex items-center gap-2">
                <PartySwatch party={row.party} />
                <PartyLabel party={row.party} />
              </span>
            </th>
            {row.cells.map((cell, index) =>
              cell !== null ? (
                <td key={riksmoten[index]!.id}>{formatPercent(cell)}</td>
              ) : (
                <td key={riksmoten[index]!.id} className="text-muted-foreground">
                  <span aria-hidden="true">–</span>
                  <span className="sr-only">inga ledamöter</span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
