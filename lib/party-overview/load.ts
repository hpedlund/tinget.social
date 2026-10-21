/** Server-only: loads every period's party figures through lib/data/ and builds the overview. */
import { getDefaultPeriod, getParties, getPeriods } from "@/lib/data";

import { buildPartyOverview, type PartyOverview } from "./overview";

export async function loadPartyOverview(): Promise<PartyOverview> {
  const [defaultPeriod, periods] = await Promise.all([getDefaultPeriod(), getPeriods()]);
  const parties = await Promise.all(periods.map((period) => getParties(period.id)));
  return buildPartyOverview({
    defaultPeriodId: defaultPeriod.id,
    periods,
    parties: new Map(periods.map((period, index) => [period.id, parties[index]!])),
  });
}
