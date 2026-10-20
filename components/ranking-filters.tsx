import type { ReactNode, Ref } from "react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { partyName } from "@/lib/parties";
import type { ExplorerData, Order, ViewState } from "@/lib/ranking/explorer";
import { cn } from "@/lib/utils";

const ALL = "";

function periodLabel(period: ExplorerData["periods"][number]): string {
  if (period.kind === "term") return `${period.label} (mandatperiod)`;
  return period.complete ? period.label : `${period.label} (pågår)`;
}

function partyLabel(code: string): string {
  if (code === "-") return "Politiska vildar (-)";
  const name = partyName(code);
  return name === code ? code : `${name} (${code})`;
}

/** Period, party, constituency and order; every change applies immediately. */
export function RankingFilters({
  data,
  state,
  onChange,
  onClear,
  periodRef,
}: {
  data: ExplorerData;
  state: ViewState;
  onChange: (next: ViewState) => void;
  onClear: () => void;
  periodRef: Ref<HTMLSelectElement>;
}) {
  return (
    <form
      role="search"
      aria-label="Filtrera rankningen"
      onSubmit={(event) => event.preventDefault()}
      className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))_auto]"
    >
      <Field id="filter-period" label="Period" className="col-span-2 lg:col-span-1">
        <NativeSelect
          id="filter-period"
          ref={periodRef}
          value={state.periodId}
          onChange={(event) => onChange({ ...state, periodId: event.target.value })}
        >
          {data.periods.map((period) => (
            <option key={period.id} value={period.id}>
              {periodLabel(period)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="filter-party" label="Parti">
        <NativeSelect
          id="filter-party"
          value={state.party ?? ALL}
          onChange={(event) => onChange({ ...state, party: event.target.value || null })}
        >
          <option value={ALL}>Alla partier</option>
          {data.parties.map((code) => (
            <option key={code} value={code}>
              {partyLabel(code)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="filter-constituency" label="Valkrets">
        <NativeSelect
          id="filter-constituency"
          value={state.constituency ?? ALL}
          onChange={(event) => onChange({ ...state, constituency: event.target.value || null })}
        >
          <option value={ALL}>Alla valkretsar</option>
          {data.constituencies.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="filter-order" label="Ordning">
        <NativeSelect
          id="filter-order"
          value={state.order}
          onChange={(event) => onChange({ ...state, order: event.target.value as Order })}
        >
          <option value="narvaro">Högst närvaro först</option>
          <option value="franvaro">Lägst närvaro först</option>
        </NativeSelect>
      </Field>
      <Button variant="outline" onClick={onClear}>
        Rensa filter
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
