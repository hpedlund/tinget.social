import path from "node:path";

import { writeFileAtomic } from "./cache";
import { fetchJson } from "./client";
import { compare } from "./compare";
import { RAW_DIR } from "./config";
import { NORMALIZED_SCHEMA_VERSION } from "./normalized";
import { personlistaSchema, type RawPerson } from "./schemas";
import type { Member, Members } from "./types";

/**
 * Downloads everyone who has served in the chamber since 2018
 * (`rdlstatus=tjanst`) and keeps only the people in `memberIds` —
 * i.e. those who appear in the vote data. Other people in the list
 * (e.g. Riksbank or JO officials) are dropped.
 */
export async function fetchMembers(memberIds: ReadonlySet<string>): Promise<Members> {
  const { data, raw } = await fetchJson(
    "/personlista/",
    { rdlstatus: "tjanst", sort: "sorteringsnamn", sortorder: "asc" },
    personlistaSchema,
  );
  await writeFileAtomic(path.join(RAW_DIR, "personlista-tjanst.json"), raw);

  const people = data.personlista.person;
  if (people.length < 349) {
    throw new Error(`personlista returned only ${people.length} people — expected at least 349`);
  }

  const byId = new Map<string, RawPerson>();
  for (const person of people) {
    if (person.intressent_id === "" || !memberIds.has(person.intressent_id)) continue;
    if (byId.has(person.intressent_id)) {
      throw new Error(`personlista: ${person.intressent_id} appears twice`);
    }
    byId.set(person.intressent_id, person);
  }

  const missing = [...memberIds].filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(
      `personlista lacks ${missing.length} people who voted: ${missing.slice(0, 10).join(", ")}`,
    );
  }

  const members = [...byId.values()]
    .map(toMember)
    .sort((a, b) => compare(a.id, b.id));
  return { schemaVersion: NORMALIZED_SCHEMA_VERSION, fetchedAt: new Date().toISOString(), members };
}

function toMember(person: RawPerson): Member {
  return {
    id: person.intressent_id,
    firstName: person.tilltalsnamn,
    lastName: person.efternamn,
    sortName: person.sorteringsnamn,
    party: person.parti,
    constituency: person.valkrets,
    status: person.status,
    birthYear: person.fodd_ar === "" ? null : Number(person.fodd_ar),
    gender: person.kon,
    imageUrl: person.bild_url_192 === "" ? null : person.bild_url_192,
    chamberAssignments: person.personuppdrag.uppdrag
      .filter((assignment) => assignment.organ_kod === "kam")
      .map((assignment) => ({
        role: assignment.roll_kod,
        status: assignment.status,
        from: assignment.from.slice(0, 10),
        to: assignment.tom === "" ? null : assignment.tom.slice(0, 10),
      }))
      .sort((a, b) => compare(a.from, b.from) || compare(a.role, b.role) || compare(a.status, b.status)),
  };
}
