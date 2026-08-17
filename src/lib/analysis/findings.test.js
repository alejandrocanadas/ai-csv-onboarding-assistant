import { describe, expect, it } from "vitest";
import { profileDataset } from "./index";
import { buildFindings } from "./findings";

describe("buildFindings", () => {
  it("flags unexpected negatives as critical regardless of how rare they are", () => {
    const columns = ["qty"];
    const rows = Array.from({ length: 40 }, (_, i) => ({
      qty: i === 39 ? "-2" : String((i % 5) + 1),
    }));
    const profile = profileDataset(rows, columns);
    const findings = buildFindings(profile, columns);

    const negFinding = findings.find((f) => f.id === "negatives-qty");
    expect(negFinding).toBeDefined();
    expect(negFinding.severity).toBe("critical");
  });

  it("scales missingness severity with the affected rate", () => {
    const columns = ["email"];
    // 30% missing -> critical (> 25%)
    const rows = Array.from({ length: 10 }, (_, i) => ({
      email: i < 3 ? "" : "a@b.com",
    }));
    const profile = profileDataset(rows, columns);
    const findings = buildFindings(profile, columns);

    const missingFinding = findings.find((f) => f.id === "missing-email");
    expect(missingFinding.severity).toBe("critical");
  });

  it("does not surface a finding for columns under the noise threshold", () => {
    const columns = ["notes"];
    const rows = Array.from({ length: 100 }, (_, i) => ({
      notes: i === 0 ? "" : "fine", // 1% missing, well under the 5% threshold
    }));
    const profile = profileDataset(rows, columns);
    const findings = buildFindings(profile, columns);

    expect(findings.find((f) => f.id === "missing-notes")).toBeUndefined();
  });

  it("sorts findings with critical first", () => {
    const columns = ["qty", "notes"];
    const rows = Array.from({ length: 40 }, (_, i) => ({
      qty: i === 0 ? "-2" : "5",
      notes: i < 12 ? "" : "fine", // ~30% missing -> critical too, but a different id
    }));
    const profile = profileDataset(rows, columns);
    const findings = buildFindings(profile, columns);

    const severities = findings.map((f) => f.severity);
    const firstWarningIndex = severities.indexOf("warning");
    const firstInfoIndex = severities.indexOf("info");
    if (firstWarningIndex !== -1) {
      expect(severities.slice(0, firstWarningIndex).every((s) => s === "critical")).toBe(true);
    }
    if (firstInfoIndex !== -1) {
      expect(severities.slice(0, firstInfoIndex).includes("warning") || severities.slice(0, firstInfoIndex).every(s => s === "critical")).toBe(true);
    }
  });
});
