"use client";

import { useSyncExternalStore } from "react";

import { type AgendaDay, groupAgenda, stockholmToday, weekday } from "@/lib/agenda/schedule";
import { committeeName } from "@/lib/committees";
import type { AgendaItem } from "@/lib/data/types";
import { formatDate, formatNumber } from "@/lib/format";
import { documentSourceUrl } from "@/lib/site";

const linkClassName =
  "underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

const noop = () => () => {};

/**
 * Prerendered with the build date, then regrouped with today's date in the
 * browser — the page stays correct between data refreshes.
 */
function useToday(buildDate: string): string {
  return useSyncExternalStore(noop, () => stockholmToday(new Date()), () => buildDate);
}

function Treats({ item }: { item: AgendaItem }) {
  if (item.documents.length === 0 && item.motions === 0) return null;
  const motions =
    item.motions > 0 && `${formatNumber(item.motions)} ${item.motions === 1 ? "motion" : "motioner"}`;
  return (
    <div className="text-sm leading-6">
      <span className="text-muted-foreground">Behandlar: </span>
      {item.documents.length > 0 ? (
        <ul className="inline">
          {item.documents.map((doc, index) => (
            <li key={doc.dokId} className="inline">
              {index > 0 && ", "}
              <a href={documentSourceUrl(doc.dokId)} className={linkClassName}>
                {doc.label}
              </a>
              {doc.title && doc.title !== item.title && (
                <span className="text-muted-foreground"> {doc.title}</span>
              )}
            </li>
          ))}
          {motions && <li className="inline"> och {motions}</li>}
        </ul>
      ) : (
        <span>{motions}</span>
      )}
    </div>
  );
}

function Item({ item }: { item: AgendaItem }) {
  return (
    <li className="space-y-1 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">
        Betänkande {item.beteckning}
        {item.committee && <> · {committeeName(item.committee)}</>}
        {item.debateDate && item.debateDate !== item.decisionDate && (
          <> · Debatt {formatDate(item.debateDate)}</>
        )}
      </p>
      <h4 className="font-medium leading-6">
        <a href={documentSourceUrl(item.dokId)} className={linkClassName}>
          {item.title}
        </a>
      </h4>
      <Treats item={item} />
    </li>
  );
}

function Day({ day, today }: { day: AgendaDay; today: string }) {
  const label = `${weekday(day.date)} ${formatDate(day.date)}`;
  return (
    <section aria-label={label} className="space-y-3">
      <h3 className="text-lg font-semibold first-letter:uppercase">
        {day.date === today ? `Idag, ${label}` : label}
        <span className="font-normal text-muted-foreground">
          {" "}
          — {formatNumber(day.items.length)} {day.items.length === 1 ? "betänkande" : "betänkanden"}
        </span>
      </h3>
      <ul className="space-y-3">
        {day.items.map((item) => (
          <Item key={item.dokId} item={item} />
        ))}
      </ul>
    </section>
  );
}

export function AgendaList({ items, buildDate }: { items: AgendaItem[]; buildDate: string }) {
  const today = useToday(buildDate);
  const { current, upcoming, unscheduled } = groupAgenda(items, today);

  return (
    <div className="space-y-10">
      <section aria-labelledby="aktuella" className="space-y-4">
        <h2 id="aktuella" className="text-2xl font-semibold tracking-tight">
          Aktuella
        </h2>
        {current.length === 0 ? (
          <p className="text-muted-foreground">Inga beslut är planerade idag.</p>
        ) : (
          current.map((day) => <Day key={day.date} day={day} today={today} />)
        )}
      </section>

      <section aria-labelledby="kommande" className="space-y-4">
        <h2 id="kommande" className="text-2xl font-semibold tracking-tight">
          Kommande
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">Inga fler beslut är planerade ännu.</p>
        ) : (
          upcoming.map((day) => <Day key={day.date} day={day} today={today} />)
        )}
      </section>

      {unscheduled.length > 0 && (
        <section aria-labelledby="ej-planerade" className="space-y-4">
          <h2 id="ej-planerade" className="text-2xl font-semibold tracking-tight">
            Ännu utan beslutsdag
          </h2>
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
              {formatNumber(unscheduled.length)}{" "}
              {unscheduled.length === 1 ? "betänkande" : "betänkanden"}
            </summary>
            <ul className="space-y-3 border-t p-3">
              {unscheduled.map((item) => (
                <Item key={item.dokId} item={item} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
