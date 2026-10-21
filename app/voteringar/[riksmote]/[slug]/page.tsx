import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { VoteEntry } from "@/lib/data/types";
import { formatDate, formatNumber } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { documentSourceUrl, voteSourceUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { documentPath, voteAnchor } from "@/lib/votes";
import { getDocumentPageParams, loadDocumentPage, type DocumentPageParams } from "@/lib/votes/load";

export const dynamicParams = false;

export async function generateStaticParams(): Promise<DocumentPageParams[]> {
  return getDocumentPageParams();
}

type Props = { params: Promise<DocumentPageParams> };

const KIND_LABEL = { betankande: "Betänkande", omrostning: "Omröstning" } as const;

function describe(text: string, max = 160): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).replace(/\s+\S*$/, "")} …`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadDocumentPage(await params);
  if (!loaded) return {};
  const { riksmote, document } = loaded;
  const first = document.summary?.blocks[0]?.text;
  return pageMetadata({
    title: `${document.title} (${document.beteckning})`,
    description: describe(
      first ?? `Riksdagens voteringar om ${KIND_LABEL[document.kind].toLowerCase()} ${riksmote}:${document.beteckning}.`,
    ),
    path: documentPath(riksmote, document.beteckning),
  });
}

const linkClassName =
  "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

function voteHeading(vote: VoteEntry): string {
  const point = vote.punkt > 0 ? `Punkt ${vote.punkt}` : "Omröstning";
  const topic = vote.rubrik ? `: ${vote.rubrik}` : "";
  return `${point}${topic}${vote.avser === "motivfrågan" ? " (motivfrågan)" : ""}`;
}

export default async function DocumentPage({ params }: Props) {
  const loaded = await loadDocumentPage(await params);
  if (!loaded) notFound();
  const { riksmote, document, votes } = loaded;
  const { summary } = document;
  const dates = [...new Set(votes.map((v) => v.date))].sort();

  return (
    <div className="space-y-10">
      <nav aria-label="Brödsmulor" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/" className={linkClassName}>
              Närvaro
            </Link>
            <span aria-hidden="true"> ›</span>
          </li>
          <li aria-current="page" className="text-foreground">
            {riksmote}:{document.beteckning}
          </li>
        </ol>
      </nav>

      <header className="max-w-2xl space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          {KIND_LABEL[document.kind]} {riksmote}:{document.beteckning}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>
        <p className="text-muted-foreground">
          {votes.length === 1 ? "Votering" : `${formatNumber(votes.length)} voteringar`}{" "}
          {dates.length === 1
            ? formatDate(dates[0]!)
            : `${formatDate(dates[0]!)} – ${formatDate(dates.at(-1)!)}`}
          .
        </p>
        <p>
          <a href={documentSourceUrl(document.dokId)} className={cn(linkClassName, "font-medium")}>
            Läs {document.kind === "omrostning" ? "omröstningen" : "betänkandet"} hos riksdagen
          </a>
        </p>
      </header>

      <section aria-labelledby="sammanfattning" className="max-w-2xl space-y-3">
        <h2 id="sammanfattning" className="text-2xl font-semibold tracking-tight">
          {summary?.source === "riksdagen" ? "Beslut i korthet" : "Sammanfattning"}
        </h2>
        {summary ? (
          <>
            {summary.heading && <p className="text-lg font-medium">{summary.heading}</p>}
            <SummaryBlocks blocks={summary.blocks} />
            {summary.source === "riksdagen" ? (
              <p className="text-sm text-muted-foreground">Källa: Sveriges riksdag, Beslut i korthet.</p>
            ) : (
              <aside aria-label="Om sammanfattningen" className="rounded-lg border bg-muted/50 p-4 text-sm leading-6">
                <strong>AI-genererad sammanfattning.</strong> Riksdagen har inte publicerat någon egen
                sammanfattning, så den här är skriven av en språkmodell utifrån riksdagens dokument. Den
                är inte granskad av riksdagen och kan innehålla fel; läs dokumentet för exakta uppgifter.{" "}
                <Link href="/sa-raknar-vi/#arenden" prefetch={false} className="font-medium underline underline-offset-4">
                  Om sammanfattningarna
                </Link>
              </aside>
            )}
          </>
        ) : (
          <p className="leading-7 text-muted-foreground">
            Det finns ännu ingen sammanfattning. Läs dokumentet hos riksdagen.
          </p>
        )}
      </section>

      <section aria-labelledby="voteringar" className="space-y-4">
        <h2 id="voteringar" className="text-2xl font-semibold tracking-tight">
          Voteringar
        </h2>
        <p className="max-w-2xl leading-7 text-muted-foreground">
          {document.kind === "betankande"
            ? "Ja är en röst för utskottets förslag, Nej för motförslaget (oftast en reservation). Motivfrågan gäller utskottets motivering, inte själva beslutet."
            : "Vad Ja och Nej betyder framgår av omröstningen hos riksdagen."}{" "}
          Länken under varje votering visar hur varje ledamot röstade.
        </p>
        <ol className="space-y-4">
          {votes.map((vote) => (
            <li key={vote.id} id={voteAnchor(vote.id)} className="scroll-mt-4 rounded-lg border p-4">
              <h3 className="font-semibold">{voteHeading(vote)}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(vote.date)}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["Ja", vote.counts.ja],
                    ["Nej", vote.counts.nej],
                    ["Avstår", vote.counts.avstar],
                    ["Frånvarande", vote.counts.franvarande],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-md bg-muted/50 px-3 py-2">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-xl font-semibold tabular-nums">{formatNumber(value)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm">
                <a href={voteSourceUrl(vote.id)} className={linkClassName}>
                  Så röstade varje ledamot (riksdagen)
                </a>
              </p>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">Källa: Sveriges riksdag.</p>
      </section>
    </div>
  );
}

/** Plain-text paragraphs and bullet lists; consecutive items form one list. */
function SummaryBlocks({ blocks }: { blocks: { type: "p" | "li"; text: string }[] }) {
  const groups: { type: "p" | "li"; texts: string[] }[] = [];
  for (const block of blocks) {
    const last = groups.at(-1);
    if (block.type === "li" && last?.type === "li") last.texts.push(block.text);
    else groups.push({ type: block.type, texts: [block.text] });
  }
  return (
    <div className="space-y-3 leading-7">
      {groups.map((group, index) =>
        group.type === "li" ? (
          <ul key={index} className="list-disc space-y-1 pl-6">
            {group.texts.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{group.texts[0]}</p>
        ),
      )}
    </div>
  );
}
