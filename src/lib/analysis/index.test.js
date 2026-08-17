import { describe, expect, it } from "vitest";
import { profileDataset } from "./index";

describe("profileDataset", () => {
  it("combines all four analysis modules into one result", () => {
    const columns = ["id", "channel", "qty"];
    const rows = [
      { id: "1", channel: "web", qty: "4" },
      { id: "2", channel: "WEB", qty: "3" },
      { id: "1", channel: "store", qty: "2" }, // duplicate id
      { id: "3", channel: "", qty: "" }, // missing values
    ];

    const profile = profileDataset(rows, columns);

    expect(profile.rowCount).toBe(4);
    expect(profile.columnCount).toBe(3);
    expect(profile.completeness.byColumn.qty.missing).toBe(1);
    // Identifier-detection thresholds are unit-tested in duplicates.test.js
    // with realistically-sized fixtures; here we just check the shape wires through.
    expect(profile.duplicates.exactDuplicates).toBeDefined();
    expect(profile.consistency.byColumn.channel.valueVariants).toBeDefined();
    expect(profile.outliers.byColumn).toBeDefined();
  });
});
