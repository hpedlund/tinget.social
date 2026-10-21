import type { Metadata } from "next";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_THRESHOLD_SHARE } from "@/lib/attendance";
import { getMeta } from "@/lib/data";
import type { Period } from "@/lib/data";
import { formatDate, formatNumber, formatShare } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { REPOSITORY_URL, RIKSDAGEN_OPEN_DATA_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Så räknar vi",
  description:
    "Hur närvaron i riksdagens voteringar räknas, vilka voteringar som ingår och vad siffrorna inte visar.",
  path: "/sa-raknar-vi/",
});

const linkClassName =
  "underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

const SECTIONS = [
  { id: "narvaro", title: "Vad närvaro betyder" },
  { id: "voteringar", title: "Vilka voteringar som räknas" },
  { id: "perioder", title: "Perioder" },
  { id: "ranking", title: "Rankingen" },
  { id: "partier", title: "Partierna" },
  { id: "arenden", title: "Hur ledamöterna röstade och vad det gällde" },
  { id: "begransningar", title: "Vad siffrorna inte visar" },
  { id: "kallor", title: "Källor och rådata" },
  { id: "fel", title: "Hittat ett fel?" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const title = SECTIONS.find((section) => section.id === id)!.title;
  return (
    <section aria-labelledby={id} className="max-w-2xl space-y-4 leading-7">
      <h2 id={id} className="text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function periodName(period: Period): string {
  const name = period.kind === "term" ? `${period.label}, hela mandatperioden` : period.label;
  return period.complete ? name : `${name} (pågår)`;
}

function PeriodTable({ periods }: { periods: readonly Period[] }) {
  return (
    <Table className="[&_td]:py-2 [&_th]:h-auto [&_th]:py-2">
      <TableCaption className="text-left">
        Gräns för ranking: det minsta antal voteringar en ledamot måste ha kunnat delta i för att rankas under perioden.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Period</TableHead>
          <TableHead scope="col" className="text-right whitespace-normal">
            Voteringar
          </TableHead>
          <TableHead scope="col" className="text-right whitespace-normal">
            Gräns för ranking
          </TableHead>
          <TableHead scope="col" className="hidden sm:table-cell">
            Första–senaste votering
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="tabular-nums">
        {periods.map((period) => (
          <TableRow key={period.id}>
            <TableHead scope="row" className="font-medium whitespace-normal">
              {periodName(period)}
            </TableHead>
            <TableCell className="text-right">{formatNumber(period.totalVotes)}</TableCell>
            <TableCell className="text-right">{formatNumber(period.minEligibleVotes)}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {period.firstVoteDate && period.lastVoteDate
                ? `${formatDate(period.firstVoteDate)} – ${formatDate(period.lastVoteDate)}`
                : "–"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function MethodologyPage() {
  const meta = await getMeta();
  const defaultPeriod = meta.periods.find((period) => period.id === meta.defaultPeriodId)!;
  const threshold = formatShare(DEFAULT_THRESHOLD_SHARE);

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Så räknar vi</h1>
        <p className="text-lg text-muted-foreground">
          När riksdagen röstar, i en votering, registreras varje plats i kammaren som Ja, Nej,
          Avstår eller Frånvarande. Den här sidan förklarar hur vi gör om de uppgifterna till
          siffror, och vad siffrorna inte säger.
        </p>
        <p className="text-sm text-muted-foreground">
          Källa:{" "}
          <a href={RIKSDAGEN_OPEN_DATA_URL} className={linkClassName}>
            Sveriges riksdag
          </a>
          .
          {meta.lastVoteDate && (
            <> Uppgifterna gäller voteringar till och med {formatDate(meta.lastVoteDate)}.</>
          )}
        </p>
        <nav aria-labelledby="innehall-rubrik" className="rounded-lg border p-4 text-sm">
          <h2 id="innehall-rubrik" className="font-semibold">
            På den här sidan
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className={linkClassName}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <Section id="narvaro">
        <p>
          <strong>Närvaro</strong> är andelen av de voteringar en ledamot kunde delta i där hen
          röstade Ja, Nej eller Avstår. En votering där ledamoten var Frånvarande räknas som
          frånvaro.
        </p>
        <p>
          Exempel: en ledamot som kunde delta i 2 000 voteringar och var frånvarande vid 150 av dem
          röstade i 1 850. Närvaron är 1 850 av 2 000, alltså 92,5 %.
        </p>
        <p>
          <strong>Avstår räknas som närvaro.</strong> Den som avstår är på plats och tar ställning
          genom att inte välja sida.
        </p>
        <p>
          Närvaron visas med en decimal. Vi stryker resten i stället för att avrunda, så 100,0 %
          betyder att ledamoten inte missat en enda votering.
        </p>
      </Section>

      <Section id="voteringar">
        <p>
          Alla voteringar i kammaren som riksdagen redovisar räknas, även omröstningar som
          statsministeromröstningar och misstroendeomröstningar.
        </p>
        <p>
          En ledamot räknas bara för de voteringar där hen hade en plats i kammaren, det vill säga
          tjänstgjorde. Den som kom in eller lämnade riksdagen under perioden mäts på sin egen tid.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Ersättare.</strong> När en ledamot är ledig en längre tid, eller är statsråd
            (minister), tar en ersättare platsen. Ersättaren mäts på sina egna voteringar. Den
            ordinarie ledamoten räknas inte alls för de voteringarna, varken som närvarande eller
            frånvarande.
          </li>
          <li>
            <strong>Talmannen</strong> röstar inte och finns inte med i riksdagens uppgifter om
            voteringar. En ersättare har talmannens plats i kammaren och mäts som andra ledamöter.
          </li>
          <li>
            <strong>Ogiltiga voteringar.</strong> Ett fåtal voteringar finns i riksdagens
            nedladdningsbara filer men inte i riksdagens lista över voteringar. Det är i praktiken
            ogiltiga voteringar eller voteringar som gjorts om. De räknas inte.{" "}
            <a href={`${REPOSITORY_URL}/blob/main/data/README.md`} className={linkClassName}>
              Se listan över kända avvikelser
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section id="perioder">
        <p>
          Ett <strong>riksmöte</strong> är riksdagens arbetsår, från september till sommaren året
          efter, till exempel 2025/26. En <strong>mandatperiod</strong> är de fyra år mellan två
          val. Som standard visar vi hela mandatperioden {defaultPeriod.label}. Varje riksmöte
          kan också väljas för sig. Varje period räknas och rankas för sig, med sin egen gräns.
          Ett riksmöte som inte är avslutat markeras med &rdquo;pågår&rdquo;.
        </p>
        <PeriodTable periods={meta.periods} />
      </Section>

      <Section id="ranking">
        <p>
          För att rankas måste en ledamot ha kunnat delta i minst {threshold} av periodens
          voteringar (avrundat uppåt, se tabellen ovan). Med få voteringar säger andelen lite: en
          enda missad votering kan ge stort utslag. Övriga, till exempel ersättare med korta
          inhopp, statsråd eller ledamöter som lämnat riksdagen, visas i en egen lista,
          &rdquo;Ledamöter med få voteringar&rdquo;, med sin närvaro men utan placering.
        </p>
        <p>
          Rankingen går från högst till lägst närvaro. Ledamöter med exakt samma närvaro delar
          plats och visas i bokstavsordning. Jämförelsen görs på den exakta andelen, så två
          ledamöter som båda visas med 99,8 % kan ha olika placering.
        </p>
        <p>
          Eftersom varje ledamot mäts på sina egna voteringar kan en ledamot som tjänstgjort en
          kortare tid utan att missa någon votering hamna före en ledamot som suttit hela perioden
          och missat ett par. Det är metoden, inte ett fel.
        </p>
      </Section>

      <Section id="partier">
        <p>
          <strong>Partiets närvaro</strong> räknas på alla voteringar som partiets ledamöter
          kunde delta i, tillsammans. Det är inte ett medelvärde av ledamöternas procentsatser: en
          ledamot som tjänstgjort hela perioden väger tyngre än en som bara var med i några
          voteringar. Alla som tjänstgjort räknas, även ledamöter som har för få voteringar för
          att rankas och ersättare för de voteringar de deltog i.
        </p>
        <p>
          Varje votering räknas till det parti ledamoten tillhörde vid voteringen. En ledamot som
          bytt parti finns därför med i båda partiernas närvaro, för sina voteringar i respektive
          parti.
        </p>
        <p>
          På sidan Partier visas också <strong>median, lägst och högst</strong> bland partiets
          rankade ledamöter. Där räknas varje ledamot till sitt senaste parti under perioden.
          Medianen visar en typisk ledamot och påverkas inte av några få med mycket hög eller låg
          närvaro.
        </p>
        <p>
          <strong>Politiska vildar</strong> är ledamöter som lämnat sitt parti utan att gå med i
          ett annat. De är ingen grupp som samarbetar och visas därför för sig, och på deras egna
          sidor jämförs de inte med något partisnitt.
        </p>
      </Section>

      <Section id="arenden">
        <p>
          På varje ledamots sida finns alla voteringar ledamoten kunde delta i, med hur hen
          röstade och vilket ärende voteringen gällde. Uppgifterna kommer från samma filer som
          närvaron.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Ja och Nej.</strong> I de flesta voteringar är Ja en röst för utskottets förslag
            och Nej en röst för motförslaget, oftast en reservation från ett eller flera partier.
            Det säger alltså inte i sig om ledamoten var för eller emot en viss förändring: läs
            vad förslaget och motförslaget gick ut på.
          </li>
          <li>
            <strong>Ärendet.</strong> Varje votering gäller en punkt i ett betänkande från ett av
            riksdagens utskott. Vi visar punktens rubrik och betänkandets titel som riksdagen
            publicerar dem, och länkar till betänkandet hos riksdagen.
          </li>
          <li>
            <strong>Sammanfattningar.</strong> Sammanfattningen av ett ärende är riksdagens egen
            text <em>Beslut i korthet</em>. När riksdagen inte har publicerat någon, till exempel
            för omröstningar om statsminister eller innan texten har kommit, kan sidan visa en
            sammanfattning skriven av en AI-språkmodell utifrån riksdagens dokument. Den är
            tydligt märkt, är inte granskad av riksdagen och kan innehålla fel. Den ersätts av
            riksdagens text när den publiceras. Ledamöternas röster och alla siffror påverkas
            aldrig av sammanfattningarna.
          </li>
        </ul>
      </Section>

      <Section id="begransningar">
        <p>
          Uppgifterna visar <em>att</em> någon var frånvarande, inte <em>varför</em>. Frånvaro
          har ofta godtagbara skäl:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Kvittning.</strong> Partierna kommer överens om att en ledamot på ena sidan
            avstår från att rösta när en ledamot på andra sidan måste vara borta. Då ändras inte
            styrkeförhållandet i kammaren. Båda registreras som frånvarande.
          </li>
          <li>
            <strong>Föräldraledighet och sjukdom.</strong> Vid längre ledighet tar en ersättare
            platsen, men kortare frånvaro syns som Frånvarande.
          </li>
          <li>
            <strong>Andra uppdrag.</strong> Till exempel resor för riksdagen, internationella
            uppdrag eller möten på annat håll.
          </li>
        </ul>
        <p>
          Voteringar är bara en del av en ledamots arbete. Arbete i utskott, i valkretsen eller
          i partiet syns inte här. Närvaron räknar bara <em>om</em> någon röstade, inte
          <em> hur</em>.
        </p>
        <p>
          Siffrorna är en sammanställning av offentliga uppgifter om ledamöternas uppdrag. De är
          inte ett omdöme om någon enskild person.
        </p>
      </Section>

      <Section id="kallor">
        <p>
          Allt bygger på{" "}
          <a href={RIKSDAGEN_OPEN_DATA_URL} className={linkClassName}>
            riksdagens öppna data
          </a>
          : riksdagens listor över voteringar, filerna med hur varje ledamot röstade i varje
          votering, uppgifter om ledamöterna och riksdagens dokumentlistor med betänkandenas
          titlar, förslagspunkter och sammanfattningar. Uppgifterna hämtas från data.riksdagen.se varje
          dag, och siffrorna räknas om när det har hållits nya voteringar.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            På varje ledamots sida finns en länk till ledamoten hos riksdagen. Varje ärende har
            en sida med länkar till betänkandet och till riksdagens uppgifter om varje votering,
            där det framgår hur alla ledamöter röstade.
          </li>
          <li>
            Alla uträknade siffror finns som filer i{" "}
            <a href={`${REPOSITORY_URL}/tree/main/data`} className={linkClassName}>
              projektets data på GitHub
            </a>
            , med historik över varje ändring.
          </li>
          <li>
            Koden som räknar finns också öppet, bland annat{" "}
            <a href={`${REPOSITORY_URL}/blob/main/lib/attendance/index.ts`} className={linkClassName}>
              beräkningen av närvaro
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section id="fel">
        <p>
          Om en siffra ser fel ut eller något på sidan är otydligt vill vi gärna veta det.{" "}
          <a href={`${REPOSITORY_URL}/issues`} className={linkClassName}>
            Skapa ett ärende på GitHub
          </a>{" "}
          och berätta vilken sida det gäller och vad som ser fel ut. Det kräver ett gratis
          GitHub-konto.
        </p>
        <p>
          Tillbaka till{" "}
          <Link href="/" prefetch={false} className={linkClassName}>
            rankingen
          </Link>{" "}
          eller{" "}
          <Link href="/partier/" prefetch={false} className={linkClassName}>
            partierna
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
