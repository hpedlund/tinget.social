import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeFileAtomic } from "@/lib/riksdagen/cache";
import { buildAgendaFile } from "@/lib/pipeline/agenda";
import { buildDataFiles } from "@/lib/pipeline/build";
import { FIXTURE_INPUT } from "@/lib/pipeline/fixtures";

import { createDataSource } from "./index";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "tinget-data-"));
  const agenda = buildAgendaFile({ schemaVersion: 1, riksmote: "2024/25", fetchedAt: "", items: [] });
  for (const file of [...buildDataFiles(FIXTURE_INPUT), agenda]) {
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

  it("joins a member's missed votes with their details", async () => {
    const member = await createDataSource(dir).getMember("100002");
    expect(member).not.toHaveProperty("missedVoteIds");
    expect(member?.missedVotes).toEqual([
      {
        id: "V1",
        riksmote: "2022/23",
        date: "2022-10-01",
        beteckning: "AU1",
        punkt: 1,
        avser: "sakfrågan",
        counts: { ja: 1, nej: 1, avstar: 0, franvarande: 1 },
      },
      expect.objectContaining({ id: "V4", riksmote: "2023/24", date: "2023-10-01" }),
    ]);
  });

  it("returns null for unknown or malformed member ids", async () => {
    const data = createDataSource(dir);
    expect(await data.getMember("999999")).toBeNull();
    expect(await data.getMember("../meta")).toBeNull();
    expect(await data.getMember("")).toBeNull();
  });

  it("reads the agenda", async () => {
    expect(await createDataSource(dir).getAgenda()).toEqual({
      schemaVersion: 1,
      source: "Sveriges riksdag",
      riksmote: "2024/25",
      items: [],
    });
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
      JSON.stringify({ schemaVersion: 2, source: "Sveriges riksdag" }),
    );
    await expect(createDataSource(dir).getPeriods()).rejects.toThrow(
      /Invalid data file .*meta\.json:\n.*schemaVersion/,
    );
  });

  it("fails when a member's missed vote is not in the vote index", async () => {
    await writeFile(
      path.join(dir, "votes", "2023-24.json"),
      JSON.stringify({ schemaVersion: 1, source: "Sveriges riksdag", riksmote: "2023/24", votes: [] }),
    );
    await expect(createDataSource(dir).getMember("100002")).rejects.toThrow(/V4/);
  });
});
