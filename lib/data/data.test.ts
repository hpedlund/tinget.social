import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeFileAtomic } from "@/lib/riksdagen/cache";
import { buildDataFiles } from "@/lib/pipeline/build";
import { FIXTURE_INPUT } from "@/lib/pipeline/fixtures";

import { createDataSource } from "./index";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tinget-data-"));
  for (const file of buildDataFiles(FIXTURE_INPUT)) {
    await writeFileAtomic(path.join(dir, file.path), file.content);
  }
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createDataSource", () => {
  it("reads periods and the default period", async () => {
    const data = createDataSource(dir);
    expect((await data.getPeriods()).map((p) => p.id)).toEqual([
      "2022-2024",
      "2022-23",
      "2023-24",
      "2024-25",
    ]);
    expect((await data.getDefaultPeriod()).id).toBe("2022-2024");
    expect((await data.getMeta()).lastVoteDate).toBe("2024-10-01");
  });

  it("reads rankings and parties per period", async () => {
    const data = createDataSource(dir);
    const ranking = await data.getRanking("2022-2024");
    expect(ranking.ranked.map((r) => r.memberId)).toEqual(["100001", "100004", "100002"]);
    const parties = await data.getParties("2023-24");
    expect(parties.map((p) => p.party)).toEqual(["-", "SD", "M", "S"]); // M and S tie at 50 %
  });

  it("throws for an unknown period", async () => {
    const data = createDataSource(dir);
    await expect(data.getRanking("1999-00")).rejects.toThrow(/Unknown period/);
    await expect(data.getParties("../meta")).rejects.toThrow(/Unknown period/);
  });

  it("lists members", async () => {
    const data = createDataSource(dir);
    expect(await data.getAllMemberIds()).toEqual(["100001", "100002", "100003", "100004"]);
    expect((await data.getMembers())[0]).toEqual({
      id: "100001",
      name: "Anna Andersson",
      party: "S",
      constituency: "Stockholms län",
    });
  });

  it("reads a member with ballot strings that match the vote files", async () => {
    const member = await createDataSource(dir).getMember("100002");
    expect(member?.ballots.map((b) => b.riksmote)).toEqual(["2022/23", "2023/24", "2024/25"]);
  });

  it("reads votes and documents per riksmöte", async () => {
    const data = createDataSource(dir);
    expect(await data.getRiksmoten()).toEqual(["2022/23", "2023/24", "2024/25"]);
    expect((await data.getVotes("2023/24")).map((v) => v.id)).toEqual(["V4", "V5"]);
    const loaded = await data.getDocument("2022/23", "AU1");
    expect(loaded?.document.title).toBe("Betänkande AU1");
    expect(loaded?.votes.map((v) => v.id)).toEqual(["V1", "F1"]);
    expect(await data.getDocument("2022/23", "XX9")).toBeNull();
    expect(await data.getDocument("1999/00", "AU1")).toBeNull();
    expect(await data.getDocument("2022/23", "../meta")).toBeNull();
    await expect(data.getVotes("1999/00")).rejects.toThrow(/Unknown riksmöte/);
  });

  it("returns null for unknown or malformed member ids", async () => {
    const data = createDataSource(dir);
    expect(await data.getMember("999999")).toBeNull();
    expect(await data.getMember("../meta")).toBeNull();
    expect(await data.getMember("")).toBeNull();
  });

  it("fails when a file is missing", async () => {
    await unlink(path.join(dir, "ranking", "2022-23.json"));
    await expect(createDataSource(dir).getRanking("2022-23")).rejects.toThrow(
      /Invalid data file .*2022-23\.json.*ENOENT/,
    );
  });

  it("fails when a file does not match the contract", async () => {
    await writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify({ schemaVersion: 1, source: "Sveriges riksdag" }),
    );
    await expect(createDataSource(dir).getPeriods()).rejects.toThrow(
      /Invalid data file .*meta\.json:\n.*schemaVersion/,
    );
  });

  it("fails when a member's ballots do not line up with the vote file", async () => {
    await writeFile(
      path.join(dir, "votes", "2023-24.json"),
      JSON.stringify({ schemaVersion: 2, source: "Sveriges riksdag", riksmote: "2023/24", votes: [] }),
    );
    await expect(createDataSource(dir).getMember("100002")).rejects.toThrow(/2 ballots for 2023\/24/);
  });

  it("fails when a member's ballots disagree with their figures", async () => {
    const file = path.join(dir, "members", "100002.json");
    const member = JSON.parse(await readFile(file, "utf-8"));
    member.ballots[1].votes = "JJ";
    await writeFile(file, JSON.stringify(member));
    await expect(createDataSource(dir).getMember("100002")).rejects.toThrow(/disagree with byRiksmote/);
  });
});
