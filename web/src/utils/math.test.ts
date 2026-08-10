import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters } from "./math";

describe("normalizeMathDelimiters", () => {
  it("supports inline and display LaTeX delimiters", () => {
    expect(normalizeMathDelimiters("Inline \\(x^2\\)\n\\[y = mx + b\\]")).toBe("Inline $x^2$\n$$y = mx + b$$");
  });

  it("leaves inline code unchanged", () => {
    expect(normalizeMathDelimiters("Use `\\(not math\\)` here")).toBe("Use `\\(not math\\)` here");
  });

  it("leaves fenced code unchanged", () => {
    const content = "```tex\n\\[not math\\]\n```\n\\(math\\)";
    expect(normalizeMathDelimiters(content)).toBe("```tex\n\\[not math\\]\n```\n$math$");
  });

  it("preserves escaped backslashes", () => {
    const escaped = String.raw`\\(literal\\)`;
    expect(normalizeMathDelimiters(escaped)).toBe(escaped);
  });
});
