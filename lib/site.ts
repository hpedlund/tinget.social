export const SITE_NAME = "tinget.social";

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
