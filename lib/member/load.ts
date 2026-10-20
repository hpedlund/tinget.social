/** Server-only: loads a member and builds their profile through lib/data/. */
import { getDefaultPeriod, getMember, getParties, getPeriods, getRanking } from "@/lib/data";
import type { MemberDetail } from "@/lib/data/types";

import { buildMemberProfile, type MemberProfile } from "./profile";

/** `null` for an unknown member id. */
export async function loadMemberProfile(
  id: string,
): Promise<{ member: MemberDetail; profile: MemberProfile } | null> {
  const member = await getMember(id);
  if (!member) return null;

  const [defaultPeriod, periods] = await Promise.all([getDefaultPeriod(), getPeriods()]);
  const ids = member.periods.map((p) => p.periodId);
  const [rankings, parties] = await Promise.all([
    Promise.all(ids.map((periodId) => getRanking(periodId))),
    Promise.all(ids.map((periodId) => getParties(periodId))),
  ]);

  const profile = buildMemberProfile(member, {
    defaultPeriodId: defaultPeriod.id,
    periods,
    rankings: new Map(ids.map((periodId, index) => [periodId, rankings[index]!])),
    parties: new Map(ids.map((periodId, index) => [periodId, parties[index]!])),
  });
  return { member, profile };
}
