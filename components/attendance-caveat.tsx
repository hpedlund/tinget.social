import Link from "next/link";

/** The fairness caveat every page with attendance figures must show. */
export function AttendanceCaveat() {
  return (
    <aside
      aria-label="Om siffrorna"
      className="rounded-lg border bg-muted/50 p-4 text-sm leading-6"
    >
      <p>
        <strong>Frånvaro har ofta godtagbara skäl,</strong> till exempel kvittning mellan partierna,
        föräldraledighet, sjukdom eller andra uppdrag. Siffrorna visar{" "}
        <em>att</em> någon var frånvarande, inte <em>varför</em>.{" "}
        <Link
          href="/sa-raknar-vi/"
          className="font-medium underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Så räknar vi
        </Link>
      </p>
    </aside>
  );
}
