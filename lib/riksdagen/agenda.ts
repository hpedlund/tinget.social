import path from "node:path";

import { writeFileAtomic } from "./cache";
import { fetchBinary, fetchJson, parseJson } from "./client";
import { compare } from "./compare";
import { RAW_DIR, riksmoteSlug } from "./config";
import { NORMALIZED_SCHEMA_VERSION } from "./normalized";
import { dokumentlistaSchema, dokumentstatusSchema, type RawBetankande } from "./schemas";
import type { Agenda, AgendaItem, TreatedDocument } from "./types";

const PAGE_SIZE = 200;
/** A riksmöte has a few hundred betänkanden; more pages than this means the paging is broken. */
const MAX_PAGES = 20;

/**
 * Downloads every betänkande of the riksmöte and keeps those the chamber has
 * not decided on yet (`beslutad = 0`): the votes that are coming up. For each
 * of them `/dokumentstatus/` gives the documents it treats (propositions,
 * motions, skrivelser …), which is what the vote is ultimately about.
 */
export async function fetchAgenda(riksmote: string): Promise<Agenda> {
  const betankanden: RawBetankande[] = [];
  for (let page = 1; ; page++) {
    const { data, raw } = await fetchJson(
      "/dokumentlista/",
      { doktyp: "bet", rm: riksmote, sz: String(PAGE_SIZE), p: String(page), sort: "beteckning", sortorder: "asc" },
      dokumentlistaSchema,
    );
    await writeFileAtomic(path.join(RAW_DIR, "dokumentlista", `bet-${riksmoteSlug(riksmote)}-${page}.json`), raw);
    const list = data.dokumentlista;
    betankanden.push(...list.dokument);
    if (list["@sida"] >= list["@sidor"]) {
      if (betankanden.length !== list["@traffar"]) {
        throw new Error(`dokumentlista: got ${betankanden.length} betänkanden, expected ${list["@traffar"]}`);
      }
      break;
    }
    if (page >= MAX_PAGES) throw new Error(`dokumentlista: more than ${MAX_PAGES} pages for ${riksmote}`);
  }

  const seen = new Set<string>();
  const items: AgendaItem[] = [];
  for (const bet of betankanden) {
    if (bet.rm !== riksmote) throw new Error(`dokumentlista: ${bet.dok_id} is from ${bet.rm}, not ${riksmote}`);
    if (seen.has(bet.dok_id)) throw new Error(`dokumentlista: ${bet.dok_id} appears twice`);
    seen.add(bet.dok_id);
    if (bet.beslutad === "1") continue;
    items.push({
      dokId: bet.dok_id,
      riksmote: bet.rm,
      beteckning: bet.beteckning,
      title: bet.titel,
      committee: bet.organ,
      decisionDate: bet.beslutsdag === "" ? null : bet.beslutsdag.slice(0, 10),
      debateDate: bet.debattdag === "" ? null : bet.debattdag.slice(0, 10),
      treats: await fetchTreatedDocuments(bet.dok_id),
    });
  }

  items.sort(
    (a, b) =>
      compare(a.decisionDate ?? "9999", b.decisionDate ?? "9999") ||
      compare(a.beteckning, b.beteckning) ||
      compare(a.dokId, b.dokId),
  );
  return { schemaVersion: NORMALIZED_SCHEMA_VERSION, riksmote, fetchedAt: new Date().toISOString(), items };
}

/** The documents a betänkande treats; empty while it is not yet published. */
async function fetchTreatedDocuments(dokId: string): Promise<TreatedDocument[]> {
  const pathname = `/dokumentstatus/${encodeURIComponent(dokId)}.json`;
  const raw = await fetchBinary(pathname);
  if (raw === null) return [];
  await writeFileAtomic(path.join(RAW_DIR, "dokumentstatus", `${dokId}.json`), raw);

  const status = parseJson(raw, dokumentstatusSchema, pathname).dokumentstatus;
  if (status.dokument.dok_id !== dokId) {
    throw new Error(`dokumentstatus for ${dokId} describes ${status.dokument.dok_id}`);
  }

  const byId = new Map<string, TreatedDocument>();
  for (const ref of status.dokreferens?.referens ?? []) {
    if (ref.referenstyp !== "behandlar" || ref.ref_dok_id === "") continue;
    byId.set(ref.ref_dok_id, {
      dokId: ref.ref_dok_id,
      type: ref.ref_dok_typ,
      riksmote: ref.ref_dok_rm,
      number: ref.ref_dok_bet,
      title: ref.ref_dok_titel,
      name: ref.ref_dok_dokumentnamn,
    });
  }
  return [...byId.values()].sort((a, b) => compare(a.dokId, b.dokId));
}
