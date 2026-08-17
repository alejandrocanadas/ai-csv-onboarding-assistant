import { describe, expect, it } from "vitest";
import { summarizeProfile } from "./prompts";

describe("summarizeProfile", () => {
  it("condenses a profileDataset() result into compact per-column facts", () => {
    const profile = {
      rowCount: 4,
      columnCount: 2,
      completeness: {
        overall: { completenessPct: 0.875 },
        byColumn: {
          id: { missingPct: 0 },
          channel: { missingPct: 0.25 },
        },
      },
      duplicates: {
        exactDuplicates: { duplicateRowCount: 1 },
        identifierColumns: ["id"],
        duplicateIdValues: { id: [{ value: "1", rowIndices: [0, 2] }] },
      },
      consistency: {
        byColumn: {
          id: {
            typeInference: { dominantType: "text", mismatchPct: 0 },
            valueVariants: [],
          },
          channel: {
            typeInference: {
              dominantType: "text",
              mismatchPct: 0,
              mixedNumericFormatting: false,
            },
            valueVariants: [
              { normalized: "web", variants: [{ raw: "WEB" }, { raw: "web" }] },
            ],
          },
        },
      },
      outliers: {
        byColumn: {
          id: undefined,
        },
      },
    };

    const summary = summarizeProfile(profile, ["id", "channel"]);

    expect(summary.rowCount).toBe(4);
    expect(summary.overallCompletenessPct).toBe(87.5);
    expect(summary.exactDuplicateRowCount).toBe(1);
    expect(summary.identifierColumns).toEqual(["id"]);
    expect(summary.duplicateIdCounts).toEqual({ id: 1 });

    const channel = summary.columns.find((c) => c.column === "channel");
    expect(channel.missingPct).toBe(25);
    expect(channel.valueVariantExamples).toEqual([["WEB", "web"]]);
    expect(channel.outlierCount).toBe(0);
  });

  it("handles columns with no consistency/outlier data without throwing", () => {
    const profile = {
      rowCount: 1,
      columnCount: 1,
      completeness: {
        overall: { completenessPct: 1 },
        byColumn: { x: { missingPct: 0 } },
      },
      duplicates: {
        exactDuplicates: { duplicateRowCount: 0 },
        identifierColumns: [],
        duplicateIdValues: {},
      },
      consistency: { byColumn: {} },
      outliers: { byColumn: {} },
    };

    const summary = summarizeProfile(profile, ["x"]);
    expect(summary.columns[0]).toMatchObject({
      column: "x",
      dominantType: "empty",
      outlierCount: 0,
      unexpectedNegativeCount: 0,
    });
  });
});
