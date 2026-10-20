import { partyName } from "@/lib/parties";

/** Party code with its full name for hover and assistive technology. */
export function PartyLabel({ party }: { party: string }) {
  const name = partyName(party);
  if (name === party) return <span>{party}</span>;
  return (
    <abbr title={name} className="no-underline">
      {party}
    </abbr>
  );
}
