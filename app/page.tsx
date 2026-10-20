import { REPOSITORY_URL } from "@/lib/site";

export default function Home() {
  return (
    <div className="max-w-2xl space-y-6">
      <p className="w-fit rounded-md border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Under uppbyggnad
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Närvaro i riksdagen
      </h1>
      <p className="text-xl text-muted-foreground">
        Vilka riksdagsledamöter är på plats och röstar — och vilka är det inte?
      </p>
      <p className="leading-7">
        Här kommer du snart kunna se hur ofta varje riksdagsledamot deltar i
        riksdagens voteringar. Allt bygger på riksdagens egna öppna data och
        sammanställs oberoende och partipolitiskt obundet.
      </p>
      <p className="leading-7">
        Följ arbetet eller lämna synpunkter på{" "}
        <a
          href={REPOSITORY_URL}
          className="font-medium underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
