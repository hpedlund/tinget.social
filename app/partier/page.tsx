import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Partier",
  description: "Genomsnittlig närvaro i riksdagens voteringar per parti.",
};

export default function PartiesPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Partier</h1>
      <p className="text-lg text-muted-foreground">
        Här kommer du kunna jämföra den genomsnittliga närvaron i voteringar
        mellan riksdagspartierna.
      </p>
      <Badge variant="outline" className="text-muted-foreground">
        Kommer snart
      </Badge>
    </div>
  );
}
