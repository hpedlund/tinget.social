/** Party codes as they appear in Riksdagen vote data. */
const PARTY_NAMES: Readonly<Record<string, string>> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  L: "Liberalerna",
  MP: "Miljöpartiet",
  "-": "Politisk vilde",
};

/** Known party codes in the order the site lists them. */
export const PARTY_CODES: readonly string[] = Object.keys(PARTY_NAMES);

/** Full Swedish name; unknown codes fall back to the code itself. */
export function partyName(code: string): string {
  return Object.hasOwn(PARTY_NAMES, code) ? PARTY_NAMES[code]! : code;
}
