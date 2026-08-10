import { describe, expect, it } from "vitest";
import { formatMemoTime } from "./time";

describe("formatMemoTime", () => {
  const now = Date.UTC(2026, 7, 10, 12, 0, 0);

  it("shows now only for genuinely recent timestamps", () => {
    expect(formatMemoTime(new Date(now - 10_000), "zh-CN", now)).toBe("现在");
    expect(formatMemoTime(new Date(now - 2 * 60_000), "zh-CN", now)).toContain("2分钟前");
  });

  it("does not collapse future timestamps to now", () => {
    const label = formatMemoTime(new Date(now + 5 * 60_000), "zh-CN", now);
    expect(label).toContain("5分钟后");
    expect(label).not.toBe("现在");
  });

  it("uses an absolute timestamp after one day", () => {
    const label = formatMemoTime(new Date(now - 2 * 24 * 60 * 60_000), "en-US", now);
    expect(label).toContain("2026");
    expect(label).not.toContain("ago");
  });

  it("rejects invalid dates", () => {
    expect(formatMemoTime(new Date(Number.NaN), "en-US", now)).toBeNull();
  });
});
