/**
 * zod schemas for raw Riksdagen responses. Riksdagen data is untrusted input:
 * anything that does not match these shapes aborts the pipeline.
 *
 * Unknown fields are stripped. Fields that decide the attendance metric
 * (`rost`, `avser`, `votering`) use strict enums so a new value stops the
 * run instead of silently skewing the numbers.
 */
import { z } from "zod";

export const ROST_VALUES = ["Ja", "Nej", "Avstår", "Frånvarande"] as const;
export const AVSER_VALUES = ["sakfrågan", "motivfrågan", "frågan"] as const;

const riksmote = z.string().regex(/^\d{4}\/\d{2}$/, "expected riksmöte like 2025/26");
const voteringId = z
  .string()
  .regex(/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i, "expected GUID");
const intressentId = z.string().regex(/^\d{6,16}$/, "expected numeric intressent_id");
const punkt = z.string().regex(/^\d{1,4}$/, "expected numeric punkt");
const nonEmpty = z.string().trim().min(1);
/** "2026-01-28" or "2026-01-28 00:00:00" */
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/, "expected date");
/** Counts in grouped responses: "264" or "" (zero). */
const count = z
  .string()
  .regex(/^\d*$/, "expected count")
  .transform((value) => (value === "" ? 0 : Number(value)));

/** Riksdagen returns a single object instead of an array when there is one hit. */
function listOf<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (value) => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]),
    z.array(item),
  );
}

const voteRowBase = z.object({
  rm: riksmote,
  beteckning: nonEmpty,
  votering_id: voteringId,
  punkt,
  intressent_id: intressentId,
  namn: nonEmpty,
  parti: z.string(),
  valkrets: z.string(),
  rost: z.enum(ROST_VALUES),
  avser: z.enum(AVSER_VALUES),
  votering: z.literal("huvud"),
});

/** A row in the bulk dataset and in `/votering/{id}/json`. */
export const voteRowSchema = voteRowBase.extend({
  datum: dateTime.nullable(),
});
export type RawVoteRow = z.infer<typeof voteRowSchema>;

/** One file inside `votering-{rm}.json.zip`. */
export const datasetVoteFileSchema = z.object({
  dokvotering: z.object({
    votering: z.array(voteRowSchema).min(1),
  }),
});

/** `/votering/{id}/json` — `dokvotering` is absent for omröstningar. */
export const voteringDetailSchema = z.object({
  votering: z.object({
    dokument: z.object({
      rm: riksmote,
      beteckning: nonEmpty,
      datum: dateTime,
    }),
    dokvotering: z
      .object({
        votering: listOf(voteRowSchema),
      })
      .optional(),
  }),
});

/** A row in `/voteringlista/` (no `datum`). */
export const voteringlistaRowSchema = voteRowBase;
export type RawVoteringlistaRow = z.infer<typeof voteringlistaRowSchema>;

function voteringlista<T extends z.ZodType>(row: T) {
  return z.object({
    voteringlista: z.object({
      "@villkor": z.string(),
      "@antal": count,
      votering: listOf(row),
    }),
  });
}

export const voteringlistaSchema = voteringlista(voteringlistaRowSchema);

/** `/voteringlista/?gruppering=votering_id` — one row per votering with counts. */
export const voteringlistaByVoteSchema = voteringlista(
  z.object({
    votering_id: voteringId,
    Ja: count,
    Nej: count,
    Avstår: count,
    Frånvarande: count,
  }),
);

const assignmentSchema = z.object({
  organ_kod: z.string(),
  roll_kod: z.string(),
  status: z.string(),
  typ: z.string(),
  from: dateTime,
  tom: z.union([dateTime, z.literal("")]),
});

const personSchema = z.object({
  /** Empty for people who never sat in the chamber (e.g. Riksbank or JO officials). */
  intressent_id: z.union([intressentId, z.literal("")]),
  tilltalsnamn: z.string(),
  efternamn: z.string(),
  sorteringsnamn: z.string(),
  parti: z.string(),
  valkrets: z.string(),
  status: z.string(),
  fodd_ar: z.string().regex(/^(\d{4})?$/, "expected birth year"),
  kon: z.string(),
  bild_url_192: z.union([z.url({ protocol: /^https$/, hostname: /^data\.riksdagen\.se$/ }), z.literal("")]),
  personuppdrag: z.object({
    uppdrag: listOf(assignmentSchema),
  }),
});
export type RawPerson = z.infer<typeof personSchema>;

export const personlistaSchema = z.object({
  personlista: z.object({
    "@hits": count,
    person: listOf(personSchema),
  }),
});

/** "HE01FiU1", "HE01UFöU1", "HD03285" — used in cache file names and links, so restricted. */
export const dokId = z.string().regex(/^[0-9A-Za-zÅÄÖåäö]{1,32}$/, "expected dok_id");
/** "2026-12-09" or "" (not yet scheduled) */
const optionalDate = z.union([dateTime, z.literal("")]);

/** A betänkande in `/dokumentlista/?doktyp=bet`. */
const betankandeSchema = z.object({
  dok_id: dokId,
  rm: riksmote,
  doktyp: z.literal("bet"),
  beteckning: nonEmpty,
  titel: nonEmpty,
  organ: z.string(),
  beslutsdag: optionalDate,
  debattdag: optionalDate,
  beslutad: z.enum(["0", "1"]),
});
export type RawBetankande = z.infer<typeof betankandeSchema>;

export const dokumentlistaSchema = z.object({
  dokumentlista: z.object({
    "@sida": count,
    "@sidor": count,
    "@traffar": count,
    dokument: listOf(betankandeSchema),
  }),
});

/** `/dokumentstatus/{dok_id}.json` — only the documents a betänkande treats. */
export const dokumentstatusSchema = z.object({
  dokumentstatus: z.object({
    dokument: z.object({ dok_id: dokId }),
    dokreferens: z
      .object({
        referens: listOf(
          z.object({
            referenstyp: z.string(),
            ref_dok_id: z.union([dokId, z.literal("")]),
            ref_dok_typ: z.string(),
            ref_dok_rm: z.string(),
            ref_dok_bet: z.string(),
            ref_dok_titel: z.string(),
            ref_dok_dokumentnamn: z.string(),
          }),
        ),
      })
      .nullish(),
  }),
});
