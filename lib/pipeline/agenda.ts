/**
 * Pure builder for data/agenda.json: the betänkanden the chamber has yet to
 * decide on, with the documents each one treats. Deterministic.
 */
import { DATA_SCHEMA_VERSION, DATA_SOURCE, agendaFileSchema } from "@/lib/data/schemas";
import type { AgendaItem } from "@/lib/data/types";
import { compare } from "@/lib/riksdagen/compare";
import type { Agenda, TreatedDocument } from "@/lib/riksdagen/types";

import { file, type DataFile } from "./build";

/** Fallback names for when Riksdagen leaves `ref_dok_dokumentnamn` empty. */
const TYPE_NAMES: Record<string, string> = {
  prop: "Proposition",
  skr: "Skrivelse",
  rskr: "Riksdagsskrivelse",
  frsrdg: "Framställning/redogörelse",
  rfr: "Rapport från riksdagen",
  ds: "Departementsserien",
  sou: "Statens offentliga utredningar",
  komm: "EU-förslag",
};

/** Propositions first, then skrivelser, then everything else. */
const TYPE_ORDER = ["prop", "skr"];
const typeRank = (type: string) => {
  const index = TYPE_ORDER.indexOf(type);
  return index === -1 ? TYPE_ORDER.length : index;
};

function label(doc: TreatedDocument): string {
  const name = doc.name || TYPE_NAMES[doc.type] || doc.type;
  const number = [doc.riksmote, doc.number].filter(Boolean).join(":");
  return number ? `${name} ${number}` : name;
}

function documents(treats: readonly TreatedDocument[]): AgendaItem["documents"] {
  return treats
    .filter((doc) => doc.type !== "mot")
    .sort(
      (a, b) =>
        typeRank(a.type) - typeRank(b.type) ||
        compare(a.type, b.type) ||
        compare(a.riksmote, b.riksmote) ||
        Number(a.number) - Number(b.number) ||
        compare(a.number, b.number) ||
        compare(a.dokId, b.dokId),
    )
    .map((doc) => ({ dokId: doc.dokId, label: label(doc), title: doc.title }));
}

export function buildAgendaFile(agenda: Agenda): DataFile {
  const items = agenda.items
    .map((item) => ({
      dokId: item.dokId,
      beteckning: item.beteckning,
      title: item.title,
      committee: item.committee,
      decisionDate: item.decisionDate,
      debateDate: item.debateDate,
      documents: documents(item.treats),
      motions: item.treats.filter((doc) => doc.type === "mot").length,
    }))
    .sort(
      (a, b) =>
        compare(a.decisionDate ?? "9999", b.decisionDate ?? "9999") ||
        compare(a.beteckning, b.beteckning) ||
        compare(a.dokId, b.dokId),
    );
  return file("agenda.json", agendaFileSchema, {
    schemaVersion: DATA_SCHEMA_VERSION,
    source: DATA_SOURCE,
    riksmote: agenda.riksmote,
    items,
  });
}
