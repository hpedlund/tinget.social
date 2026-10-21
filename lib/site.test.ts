import { describe, expect, it } from "vitest";

import { documentSourceUrl, memberSourceUrl, voteSourceUrl } from "./site";

describe("source URLs", () => {
  it("builds riksdagen.se links on fixed hosts", () => {
    expect(memberSourceUrl("0103624617217")).toBe(
      "https://www.riksdagen.se/sv/ledamoter-och-partier/ledamot/_0103624617217/",
    );
    expect(voteSourceUrl("F5FF37F9-143B-4790-BDD5-67FF3B1BE49F")).toBe(
      "https://data.riksdagen.se/votering/F5FF37F9-143B-4790-BDD5-67FF3B1BE49F/html",
    );
    expect(documentSourceUrl("HE01UFöU1")).toBe(
      "https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_HE01UF%C3%B6U1/",
    );
  });

  it("encodes ids so they cannot leave the path segment", () => {
    expect(voteSourceUrl("../x?y#z")).toBe("https://data.riksdagen.se/votering/..%2Fx%3Fy%23z/html");
    expect(documentSourceUrl("../x")).toBe("https://www.riksdagen.se/sv/dokument-och-lagar/dokument/_..%2Fx/");
  });
});
