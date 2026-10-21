export const SITE_NAME = "tinget.social";

/** Canonical origin, for absolute URLs (metadata, sitemap). No trailing slash. */
export const SITE_URL = "https://tinget.social";

export const REPOSITORY_URL = "https://github.com/hpedlund/tinget.social";

export const RIKSDAGEN_OPEN_DATA_URL =
  "https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/";

export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Närvaro" },
  { href: "/partier/", label: "Partier" },
  { href: "/sa-raknar-vi/", label: "Så räknar vi" },
];

/**
 * A path under the site's base path, for URLs Next.js does not prefix itself
 * (e.g. fetch() of a static file). Empty base path on tinget.social.
 */
export function withBasePath(path: string): string {
  return `${process.env.PAGES_BASE_PATH ?? ""}${path}`;
}

/** A document on riksdagen.se (riksdagen.se redirects the id-only path). */
export function documentSourceUrl(dokId: string): string {
  return `https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_${encodeURIComponent(dokId)}/`;
}

/** The member's page on riksdagen.se (riksdagen.se redirects the id-only path). */
export function memberSourceUrl(memberId: string): string {
  return `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_${encodeURIComponent(memberId)}/`;
}

/** Riksdagen's page for one vote, listing how every member voted. */
export function voteSourceUrl(voteId: string): string {
  return `https://data.riksdagen.se/votering/${encodeURIComponent(voteId)}/html`;
}
