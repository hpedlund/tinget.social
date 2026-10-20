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

/** Party colours, for party contexts only and never as the sole carrier of meaning. */
const PARTY_COLORS: Readonly<Record<string, string>> = {
  S: "#e8112d",
  M: "#52bdec",
  SD: "#dddd00",
  C: "#009933",
  V: "#da291c",
  KD: "#000077",
  L: "#006ab3",
  MP: "#83cf39",
};

/** `null` for codes without a party colour (e.g. "-"). */
export function partyColor(code: string): string | null {
  return Object.hasOwn(PARTY_COLORS, code) ? PARTY_COLORS[code]! : null;
}
