import { describe, expect, it } from "vitest";
import { analyzeOutliers } from "./outliers";

describe("analyzeOutliers", () => {
  it("flags values far outside the column's IQR range", () => {
    const rows = [
      { price: "10" },
      { price: "12" },
      { price: "11" },
      { price: "13" },
      { price: "9" },
      { price: "10000" }, // extreme outlier
    ];
    const result = analyzeOutliers(rows, ["price"]);
    const outlierValues = result.byColumn.price.outliers.map((o) => o.value);
    expect(outlierValues).toContain(10000);
  });

  it("flags rare negative values in an otherwise non-negative column", () => {
    // 29 plausible quantities plus one negative (~3%), so the negative
    // is rare relative to the column the way it would be in a real export.
    const rows = [
      ...Array.from({ length: 29 }, (_, i) => ({ qty: String((i % 5) + 1) })),
      { qty: "-2" },
    ];
    const result = analyzeOutliers(rows, ["qty"]);
    expect(result.byColumn.qty.unexpectedNegatives).toHaveLength(1);
    expect(result.byColumn.qty.unexpectedNegatives[0].value).toBe(-2);
  });

  it("does not flag negatives when a column is legitimately mixed-sign", () => {
    const rows = [
      { balance: "10" },
      { balance: "-5" },
      { balance: "8" },
      { balance: "-3" },
      { balance: "6" },
      { balance: "-7" },
    ];
    const result = analyzeOutliers(rows, ["balance"]);
    expect(result.byColumn.balance?.unexpectedNegatives ?? []).toEqual([]);
  });

  it("skips columns with too few numeric values to compute quartiles", () => {
    const rows = [{ x: "1" }, { x: "" }, { x: "abc" }];
    const result = analyzeOutliers(rows, ["x"]);
    expect(result.byColumn.x).toBeUndefined();
  });
});
