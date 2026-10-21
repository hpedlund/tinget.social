import { describe, expect, it } from "vitest";

import { cleanText, htmlToBlocks } from "./html-text";

describe("htmlToBlocks", () => {
  it("turns paragraphs and list items into text blocks", () => {
    expect(
      htmlToBlocks(
        "<p>Riksdagen sa ja.</p>\n<p>Beslutet innebär:</p>\n<ul>\n<li>Straffet höjs.</li>\n<li><p>Reglerna skärps.</p></li>\n</ul>\n<p> </p>",
      ),
    ).toEqual([
      { type: "p", text: "Riksdagen sa ja." },
      { type: "p", text: "Beslutet innebär:" },
      { type: "li", text: "Straffet höjs." },
      { type: "li", text: "Reglerna skärps." },
    ]);
  });

  it("keeps the text of inline tags, drops struck-out text, scripts and attributes", () => {
    expect(
      htmlToBlocks(
        '<p>Läs <a href="javascript:alert(1)" onclick="x()">mer</a> om <strong>det</strong>.<del>gammalt</del></p><script>alert(1)</script><style>p{}</style>',
      ),
    ).toEqual([{ type: "p", text: "Läs mer om det." }]);
  });

  it("splits on line breaks and decodes entities", () => {
    expect(htmlToBlocks("Ett&nbsp;&amp;&#160;tv&aring;<br/>tre &lt;b&gt; &#x2013; fyra")).toEqual([
      { type: "p", text: "Ett & två" },
      { type: "p", text: "tre <b> – fyra" },
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(htmlToBlocks("")).toEqual([]);
    expect(htmlToBlocks("<p>&nbsp;</p><!-- x -->")).toEqual([]);
  });
});

describe("cleanText", () => {
  it("collapses whitespace and decodes entities", () => {
    expect(cleanText("  F&ouml;rslag om\n ungdomsv&aring;rd ")).toBe("Förslag om ungdomsvård");
  });
});
