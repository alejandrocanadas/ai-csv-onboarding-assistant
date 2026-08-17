import { describe, expect, it } from "vitest";
import { analyzeCompleteness } from "./completeness";

describe("analyzeCompleteness", () => {
  const columns = ["name", "email"];
  const rows = [
    { name: "Ines", email: "ines@example.com" },
    { name: "", email: "hugo@example.com" },
    { name: "Leila", email: "" },
    { name: "  ", email: "aisha@example.com" }, // whitespace-only counts as missing
  ];

  it("counts missing values per column", () => {
    const result = analyzeCompleteness(rows, columns);
    expect(result.byColumn.name).toEqual({
      total: 4,
      filled: 2,
      missing: 2,
      missingPct: 0.5,
    });
    expect(result.byColumn.email.missing).toBe(1);
  });

  it("computes overall completeness across all cells", () => {
    const result = analyzeCompleteness(rows, columns);
    expect(result.overall.totalCells).toBe(8);
    expect(result.overall.missingCells).toBe(3);
    expect(result.overall.completenessPct).toBeCloseTo(5 / 8);
  });

  it("handles an empty dataset without dividing by zero", () => {
    const result = analyzeCompleteness([], columns);
    expect(result.overall.completenessPct).toBe(1);
    expect(result.byColumn.name.missingPct).toBe(0);
  });
});
