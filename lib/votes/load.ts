/** Server-only: resolves the document pages' URL segments through lib/data/. */
import { getDocument, getDocuments, getRiksmoten } from "@/lib/data";

import { documentSlug, riksmoteUrlSlug } from ".";

export interface DocumentPageParams {
  riksmote: string;
  slug: string;
}

/** Every document page; throws if two beteckningar of a riksmöte share a slug. */
export async function getDocumentPageParams(): Promise<DocumentPageParams[]> {
  const params: DocumentPageParams[] = [];
  for (const riksmote of await getRiksmoten()) {
    const seen = new Map<string, string>();
    for (const { beteckning } of await getDocuments(riksmote)) {
      const slug = documentSlug(beteckning);
      const other = seen.get(slug);
      if (other) throw new Error(`${riksmote}: ${other} and ${beteckning} share the URL slug ${slug}`);
      seen.set(slug, beteckning);
      params.push({ riksmote: riksmoteUrlSlug(riksmote), slug });
    }
  }
  return params;
}

/** `null` for unknown segments. */
export async function loadDocumentPage({ riksmote: rmSlug, slug }: DocumentPageParams) {
  const riksmote = (await getRiksmoten()).find((rm) => riksmoteUrlSlug(rm) === rmSlug);
  if (!riksmote) return null;
  const entry = (await getDocuments(riksmote)).find((d) => documentSlug(d.beteckning) === slug);
  if (!entry) return null;
  const loaded = await getDocument(riksmote, entry.beteckning);
  if (!loaded) return null;
  const votes = [...loaded.votes].sort(
    (a, b) => a.punkt - b.punkt || a.date.localeCompare(b.date) || a.avser.localeCompare(b.avser, "sv"),
  );
  return { riksmote, document: loaded.document, votes };
}
