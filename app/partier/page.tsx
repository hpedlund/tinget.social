import type { Metadata } from "next";

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
      <p className="w-fit rounded-md border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Kommer snart
      </p>
    </div>
  );
}
