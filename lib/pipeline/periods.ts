import { CURRENT_RIKSMOTE, riksmoteSlug, TERM_RIKSMOTEN } from "@/lib/riksdagen/config";

export interface PeriodDefinition {
  /** "2022-2026" or "2025-26"; used in file names */
  id: string;
  /** "2022–2026" or "2025/26" */
  label: string;
  kind: "term" | "riksmote";
  riksmoten: readonly string[];
  /** False while it contains the riksmöte in progress */
  complete: boolean;
}

/** "2022/23" → 2022, "2025/26" → 2026 */
const startYear = (riksmote: string) => Number(riksmote.slice(0, 4));
const endYear = (riksmote: string) => startYear(riksmote) + 1;

/** A whole electoral term followed by each riksmöte, oldest first. */
export function definePeriods(
  termRiksmoten: readonly string[],
  currentRiksmote: string,
): PeriodDefinition[] {
  const first = termRiksmoten[0];
  const last = termRiksmoten.at(-1);
  if (!first || !last) throw new Error("A term needs at least one riksmöte");

  const term: PeriodDefinition = {
    id: `${startYear(first)}-${endYear(last)}`,
    label: `${startYear(first)}–${endYear(last)}`,
    kind: "term",
    riksmoten: termRiksmoten,
    complete: !termRiksmoten.includes(currentRiksmote),
  };
  const riksmoten = [...new Set([...termRiksmoten, currentRiksmote])].map(
    (riksmote): PeriodDefinition => ({
      id: riksmoteSlug(riksmote),
      label: riksmote,
      kind: "riksmote",
      riksmoten: [riksmote],
      complete: riksmote !== currentRiksmote,
    }),
  );
  return [term, ...riksmoten];
}

export const PERIODS = definePeriods(TERM_RIKSMOTEN, CURRENT_RIKSMOTE);

/** Shown by default: the full term. */
export const DEFAULT_PERIOD_ID = PERIODS[0]!.id;
