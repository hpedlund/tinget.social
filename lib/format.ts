/** Swedish number and date formatting for the site. Pure; safe at build time. */

const percent = new Intl.NumberFormat("sv-SE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const integer = new Intl.NumberFormat("sv-SE");

const MONTHS = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];

/**
 * 0.92345 → "92,3 %". Truncated, not rounded, so "100,0 %" means no missed
 * vote and the shown value never contradicts the ranking order.
 */
export function formatPercent(share: number): string {
  // The epsilon absorbs float noise such as 0.29 * 1000 = 289.99999999999994.
  return percent.format(Math.floor(share * 1000 + 1e-9) / 1000);
}

/** 2610 → "2 610" */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** "2026-10-15" → "15 oktober 2026" (no time zone involved) */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || !MONTHS[month - 1]) throw new Error(`Invalid date: ${iso}`);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
