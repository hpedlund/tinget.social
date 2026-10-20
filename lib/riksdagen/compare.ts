/** Locale-independent string ordering so output is identical on every machine. */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
