import { partyColor } from "@/lib/parties";

/** Decorative party colour next to a party name; the name always carries the meaning. */
export function PartySwatch({ party }: { party: string }) {
  const color = partyColor(party);
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 shrink-0 rounded-sm border border-foreground/25"
      style={color ? { backgroundColor: color } : undefined}
    />
  );
}
