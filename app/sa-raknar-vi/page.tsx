import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Så räknar vi",
  description:
    "Hur närvaron i riksdagens voteringar räknas fram, och vad siffrorna inte visar.",
};

export default function MethodologyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Så räknar vi</h1>
      <p className="text-lg text-muted-foreground">
        Vid varje votering i riksdagen registreras varje ledamot som Ja, Nej,
        Avstår eller Frånvarande.
      </p>
      <p className="leading-7">
        <strong>Närvaro</strong> är andelen voteringar där ledamoten röstade Ja,
        Nej eller Avstår. Bara voteringar under den tid personen faktiskt
        tjänstgjorde räknas.
      </p>
      <p className="leading-7">
        Frånvaro är inte alltid detsamma som att inte göra sitt jobb.
        Ledamöter kan vara borta av godtagbara skäl, till exempel kvittning
        mellan partierna, föräldraledighet, sjukdom eller andra uppdrag.
        Siffrorna visar <em>att</em> någon var frånvarande, inte <em>varför</em>.
      </p>
      <Badge variant="outline" className="text-muted-foreground">
        Fullständig metodbeskrivning kommer
      </Badge>
    </div>
  );
}
