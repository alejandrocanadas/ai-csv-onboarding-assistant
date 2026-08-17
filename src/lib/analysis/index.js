import { analyzeCompleteness } from "./completeness";
import { analyzeDuplicates } from "./duplicates";
import { analyzeConsistency } from "./consistency";
import { analyzeOutliers } from "./outliers";

/** Runs all four analysis modules over the same (rows, columns) and combines them. */
export function profileDataset(rows, columns) {
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    completeness: analyzeCompleteness(rows, columns),
    duplicates: analyzeDuplicates(rows, columns),
    consistency: analyzeConsistency(rows, columns),
    outliers: analyzeOutliers(rows, columns),
  };
}
