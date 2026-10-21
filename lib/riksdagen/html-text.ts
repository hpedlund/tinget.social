/**
 * Turns the small HTML fragments Riksdagen publishes (e.g. "Beslut i korthet")
 * into plain-text blocks. The site never renders source HTML: only these
 * blocks, as text, so markup, links and scripts in the source cannot reach it.
 */

export interface TextBlock {
  /** A paragraph or a bullet-list item. */
  type: "p" | "li";
  text: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", bull: "•", sect: "§", deg: "°", euro: "€",
  aring: "å", Aring: "Å", auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö",
  eacute: "é", Eacute: "É", uuml: "ü", Uuml: "Ü", aacute: "á", oslash: "ø", aelig: "æ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

/** Collapses whitespace (incl. no-break spaces) and trims. */
export function cleanText(text: string): string {
  return decodeEntities(text).replace(/[\s ]+/g, " ").trim();
}

/** Tags that start a new block; `br` splits the current one. */
const BLOCK_TAGS = new Set(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "div", "ul", "ol", "br", "table", "tr"]);
/** Tags whose content is dropped: struck-out text and anything executable or styling. */
const SKIP_TAGS = new Set(["del", "s", "script", "style", "head", "title"]);

export function htmlToBlocks(html: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let type: TextBlock["type"] = "p";
  let buffer = "";
  let skipDepth = 0;
  let inItem = false;

  const flush = () => {
    const text = cleanText(buffer);
    if (text) blocks.push({ type, text });
    buffer = "";
  };

  // Comments first, then split into tags and text.
  const tokens = html.replace(/<!--[\s\S]*?-->/g, "").split(/(<[^>]*>)/);
  for (const token of tokens) {
    const tag = /^<\s*(\/?)\s*([a-z][a-z0-9]*)/i.exec(token);
    if (!tag) {
      if (skipDepth === 0) buffer += token;
      continue;
    }
    const closing = tag[1] === "/";
    const name = tag[2]!.toLowerCase();
    if (SKIP_TAGS.has(name)) {
      if (!token.endsWith("/>")) skipDepth = Math.max(0, skipDepth + (closing ? -1 : 1));
      continue;
    }
    if (skipDepth > 0) continue;
    // Inline tags (span, a, strong, ins …) are dropped, keeping their text.
    if (BLOCK_TAGS.has(name)) {
      flush();
      if (name === "li") inItem = !closing;
      else if (name === "ul" || name === "ol") inItem = false;
      type = inItem ? "li" : "p";
    }
  }
  flush();
  return blocks;
}
