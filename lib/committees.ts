/** Riksdag committee codes (`organ`) → Swedish names. */
const COMMITTEES: Readonly<Record<string, string>> = {
  AU: "Arbetsmarknadsutskottet",
  CU: "Civilutskottet",
  FiU: "Finansutskottet",
  FöU: "Försvarsutskottet",
  JuU: "Justitieutskottet",
  KU: "Konstitutionsutskottet",
  KrU: "Kulturutskottet",
  MJU: "Miljö- och jordbruksutskottet",
  NU: "Näringsutskottet",
  SfU: "Socialförsäkringsutskottet",
  SkU: "Skatteutskottet",
  SoU: "Socialutskottet",
  TU: "Trafikutskottet",
  UbU: "Utbildningsutskottet",
  UU: "Utrikesutskottet",
  UFöU: "Sammansatta utrikes- och försvarsutskottet",
};

/** The committee's name, or the code itself when unknown. */
export function committeeName(code: string): string {
  return Object.hasOwn(COMMITTEES, code) ? COMMITTEES[code]! : code;
}
