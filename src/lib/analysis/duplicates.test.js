import { describe, expect, it } from "vitest";
import { analyzeDuplicates } from "./duplicates";

describe("analyzeDuplicates", () => {
  it("finds exact full-row duplicates", () => {
    const columns = ["order_id", "note"];
    const rows = [
      { order_id: "A1", note: "first" },
      { order_id: "A2", note: "second" },
      { order_id: "A1", note: "first" }, // exact dup of row 0
    ];
    const result = analyzeDuplicates(rows, columns);
    expect(result.exactDuplicates.groupCount).toBe(1);
    expect(result.exactDuplicates.duplicateRowCount).toBe(1);
    expect(result.exactDuplicates.groups[0].sort()).toEqual([0, 2]);
  });

  it("detects identifier-like columns structurally and flags repeated ids", () => {
    const columns = ["order_id", "category"];
    // 20 mostly-unique ids (one repeated) vs. a low-cardinality category
    // column, to clear the uniqueness threshold the way a real column would.
    const rows = Array.from({ length: 20 }, (_, i) => ({
      order_id: i === 19 ? "ORD-1" : `ORD-${i + 1}`, // ORD-1 appears twice
      category: i % 2 === 0 ? "home" : "electronics",
    }));
    const result = analyzeDuplicates(rows, columns);

    // order_id is ~unique and fully populated -> identifier column
    expect(result.identifierColumns).toContain("order_id");
    // category repeats heavily -> not identifier-like
    expect(result.identifierColumns).not.toContain("category");

    expect(result.duplicateIdValues.order_id).toHaveLength(1);
    expect(result.duplicateIdValues.order_id[0].value).toBe("ORD-1");
    expect(result.duplicateIdValues.order_id[0].rowIndices).toEqual([0, 19]);
  });

  it("does not treat a highly-unique continuous numeric column as an identifier", () => {
    // Prices are almost all distinct across 30 rows, the way a real
    // "unit_price" column is — but they're a measurement, not an id.
    const columns = ["unit_price"];
    const rows = Array.from({ length: 30 }, (_, i) => ({
      unit_price: (10 + i * 1.37).toFixed(2),
    }));
    const result = analyzeDuplicates(rows, columns);
    expect(result.identifierColumns).not.toContain("unit_price");
  });

  it("ignores missing values when checking identifier columns", () => {
    const columns = ["id"];
    const rows = [{ id: "1" }, { id: "" }, { id: "2" }, { id: null }];
    const result = analyzeDuplicates(rows, columns);
    expect(result.duplicateIdValues.id).toBeUndefined();
  });
});
