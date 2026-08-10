import { describe, expect, it } from "vitest";
import { normalizeSelectionRange } from "./selection";

describe("normalizeSelectionRange", () => {
  it("defaults an omitted end position to the cursor position", () => {
    expect(normalizeSelectionRange(4, undefined, 10)).toEqual([4, 4]);
  });

  it("clamps invalid and out-of-range positions", () => {
    expect(normalizeSelectionRange(Number.NaN, 99, 10)).toEqual([0, 10]);
    expect(normalizeSelectionRange(-4, 3, 10)).toEqual([0, 3]);
  });

  it("never creates a backwards selection", () => {
    expect(normalizeSelectionRange(8, 2, 10)).toEqual([8, 8]);
  });
});
