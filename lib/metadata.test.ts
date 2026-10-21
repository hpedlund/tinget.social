import { describe, expect, it } from "vitest";

import { DEFAULT_TITLE, OG_IMAGE, pageMetadata } from "./metadata";

describe("pageMetadata", () => {
  it("builds title, canonical URL and a full Open Graph block", () => {
    expect(pageMetadata({ title: "Partier", description: "D", path: "/partier/" })).toEqual({
      title: "Partier",
      description: "D",
      alternates: { canonical: "/partier/" },
      openGraph: {
        type: "website",
        locale: "sv_SE",
        siteName: "tinget.social",
        images: [OG_IMAGE],
        url: "/partier/",
        title: "Partier — tinget.social",
        description: "D",
      },
    });
  });

  it("uses the site title for the start page", () => {
    const metadata = pageMetadata({ description: "D", path: "/" });
    expect(metadata.title).toBeUndefined();
    expect(metadata.openGraph?.title).toBe(DEFAULT_TITLE);
  });

  it("rejects paths without the trailing slash", () => {
    expect(() => pageMetadata({ description: "D", path: "/partier" })).toThrow(/must start and end/);
  });
});
