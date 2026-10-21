import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendanceCaveat } from "@/components/attendance-caveat";
import { MemberTrendTable } from "@/components/member-trend-table";
import { MissedVotes } from "@/components/missed-votes";
import { getAllMemberIds } from "@/lib/data";
import { formatNumber, formatPercent } from "@/lib/format";
import { loadMemberProfile } from "@/lib/member/load";
import { compactMissedVotes } from "@/lib/member/profile";
import { partyName } from "@/lib/parties";
import { memberSourceUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return (await getAllMemberIds()).map((id) => ({ id }));
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadMemberProfile((await params).id);
  if (!loaded) return {};
  const { member, profile } = loaded;
  const where = [member.party, member.constituency].filter(Boolean);
  return {
    title: member.name,
    description:
      `Närvaro i riksdagens voteringar för ${member.name}` +
      (where.length > 0 ? ` (${where.join(", ")})` : "") +
      `: ${formatPercent(profile.headline.attendance)} ${profile.headline.label}.`,
  };
}

const linkClassName =
  "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export default async function MemberPage({ params }: Props) {
  const loaded = await loadMemberProfile((await params).id);
  if (!loaded) notFound();
  const { member, profile } = loaded;
  const { headline } = profile;

  const facts = [
    member.party && (
      <span key="party">
        {partyName(member.party)}
        {partyName(member.party) !== member.party && <> ({member.party})</>}
      </span>
    ),
    member.constituency && <span key="constituency">{member.constituency}</span>,
    member.status && !member.status.startsWith("Avliden") && <span key="status">{member.status}</span>,
  ].filter(Boolean);

  const tiles = [
    ["Voteringar", headline.eligible],
    ["Ja", headline.counts.ja],
    ["Nej", headline.counts.nej],
    ["Avstår", headline.counts.avstar],
    ["Frånvarande", headline.counts.franvarande],
  ] as const;

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
            {member.name}
          </li>
        </ol>
      </nav>

      <header className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{member.name}</h1>
        {facts.length > 0 && (
          <p className="text-lg text-muted-foreground">
            {facts.map((fact, index) => (
              <span key={index}>
                {index > 0 && " · "}
                {fact}
              </span>
            ))}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Källa: Sveriges riksdag,{" "}
          <a href={memberSourceUrl(member.id)} className={linkClassName}>
            {member.name} hos riksdagen
          </a>
          .
        </p>
        <AttendanceCaveat />
      </header>

      <section aria-labelledby="narvaro" className="space-y-4">
        <h2 id="narvaro" className="text-2xl font-semibold tracking-tight">
          Närvaro {headline.label}
          {!headline.complete && " (pågår)"}
        </h2>
        <div className="space-y-1">
          <p className="text-5xl font-bold tracking-tight tabular-nums">
            {formatPercent(headline.attendance)}
          </p>
          <p className="text-muted-foreground">
            {headline.rank !== null ? (
              <>
                Plats {formatNumber(headline.rank)} av {formatNumber(headline.rankedCount)} rankade
                ledamöter. Lika närvaro ger delad plats.
              </>
            ) : (
              <>
                Rankas inte: tjänstgjorde under färre än {formatNumber(headline.minEligibleVotes)}{" "}
                voteringar (en tiondel av perioden).{" "}
                <Link href="/sa-raknar-vi/#ranking" prefetch={false} className={linkClassName}>
                  Om gränsen för ranking
                </Link>
              </>
            )}
          </p>
          {headline.partyAttendance !== null && (
            <p className="text-muted-foreground">
              Snitt för {partyName(headline.party)}:{" "}
              <span className="tabular-nums">{formatPercent(headline.partyAttendance)}</span>.
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {tiles.map(([label, value], index) => (
            <div key={label} className={cn("rounded-lg border p-3", index === 0 && "col-span-2 sm:col-span-1")}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Voteringar är de voteringar ledamoten kunde delta i under perioden. Närvaro är andelen
          där ledamoten röstade Ja, Nej eller Avstår.
        </p>
      </section>

      {profile.riksmoten.length > 0 && (
        <section aria-labelledby="per-riksmote" className="space-y-3">
          <h2 id="per-riksmote" className="text-2xl font-semibold tracking-tight">
            Per riksmöte
          </h2>
          <MemberTrendTable
            rows={profile.riksmoten}
            caption={`Närvaro för ${member.name} per riksmöte, äldst först. Plats gäller hela riksdagen; partiets snitt är partiets samlade närvaro samma riksmöte.`}
          />
        </section>
      )}

      <section aria-labelledby="missade" className="space-y-3">
        <h2 id="missade" className="text-2xl font-semibold tracking-tight">
          Missade voteringar
        </h2>
        {profile.missedCount === 0 ? (
          <p>Inga missade voteringar.</p>
        ) : (
          <>
            <p className="max-w-2xl leading-7 text-muted-foreground">
              {formatNumber(profile.missedCount)}{" "}
              {profile.missedCount === 1 ? "votering" : "voteringar"} där {member.name} var
              frånvarande, per riksmöte. Länkarna går till voteringen hos riksdagen, där det framgår
              hur alla ledamöter röstade.
            </p>
            <MissedVotes groups={compactMissedVotes(profile.missed)} memberName={member.name} />
          </>
        )}
      </section>
    </div>
  );
}
