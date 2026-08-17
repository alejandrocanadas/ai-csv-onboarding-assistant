import { describe, expect, it } from "vitest";
import { analyzeConsistency } from "./consistency";

describe("analyzeConsistency", () => {
  it("infers the dominant type and flags mismatches", () => {
    const rows = [
      { qty: "4" },
      { qty: "250" },
      { qty: "not-a-number" },
      { qty: "" }, // missing, excluded from the mismatch calc
    ];
    const result = analyzeConsistency(rows, ["qty"]);
    const { typeInference } = result.byColumn.qty;

    expect(typeInference.dominantType).toBe("number");
    expect(typeInference.nonEmptyCount).toBe(3);
    expect(typeInference.mismatchPct).toBeCloseTo(1 / 3);
  });

  it("flags mixed percent vs plain-number formatting in the same column", () => {
    const rows = [{ disc: "0.1" }, { disc: "10%" }, { disc: "5%" }];
    const result = analyzeConsistency(rows, ["disc"]);
    expect(result.byColumn.disc.typeInference.mixedNumericFormatting).toBe(true);
  });

  it("clusters categorical values that differ only by case/whitespace", () => {
    // A realistic categorical column: a handful of distinct values,
    // heavily repeated, so it clears the "looks categorical" thresholds.
    const rows = [
      ...Array.from({ length: 6 }, () => ({ channel: "WEB" })),
      ...Array.from({ length: 3 }, () => ({ channel: "web" })),
      { channel: " Web " },
      ...Array.from({ length: 10 }, () => ({ channel: "store" })),
    ];
    const result = analyzeConsistency(rows, ["channel"]);
    const variants = result.byColumn.channel.valueVariants;

    expect(variants).toHaveLength(1);
    expect(variants[0].normalized).toBe("web");
    expect(variants[0].variants.map((v) => v.raw).sort()).toEqual([
      " Web ",
      "WEB",
      "web",
    ]);
  });

  it("does not cluster long free-text columns even with repeats", () => {
    const rows = [
      { notes: "Customer asked for a price match on this order." },
      { notes: "Customer asked for a price match on this order." },
      { notes: "Tracking confusion, shipped to wrong address entirely." },
    ];
    const result = analyzeConsistency(rows, ["notes"]);
    expect(result.byColumn.notes.valueVariants).toEqual([]);
  });
});
