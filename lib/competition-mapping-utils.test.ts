import { describe, expect, it } from "vitest";
import {
  compareCompetitionStreams,
  competitionStreamSortOrder,
  parseMappingLevelOrder,
} from "./competition-mapping-utils";

describe("competition-mapping-utils", () => {
  it("orders streams Regular → Elementary → Grandmaster", () => {
    expect(competitionStreamSortOrder("Regular")).toBeLessThan(
      competitionStreamSortOrder("Elementary"),
    );
    expect(competitionStreamSortOrder("Elementary")).toBeLessThan(
      competitionStreamSortOrder("Grandmaster"),
    );
    expect(compareCompetitionStreams("Regular", "Elementary")).toBeLessThan(0);
    expect(compareCompetitionStreams("Elementary", "Grandmaster")).toBeLessThan(0);
  });

  it("parses level numbers from mapping labels", () => {
    expect(parseMappingLevelOrder("Level 3")).toBe(3);
    expect(parseMappingLevelOrder("Grand Level 2")).toBe(2);
  });
});
