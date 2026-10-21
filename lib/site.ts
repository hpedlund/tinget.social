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

/** The member's page on riksdagen.se (riksdagen.se redirects the id-only path). */
export function memberSourceUrl(memberId: string): string {
  return `https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_${encodeURIComponent(memberId)}/`;
}

/** Riksdagen's page for one vote, listing how every member voted. */
export function voteSourceUrl(voteId: string): string {
  return `https://data.riksdagen.se/votering/${encodeURIComponent(voteId)}/html`;
}
