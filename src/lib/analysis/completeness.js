import { isMissing } from "./valueTypes";

/**
 * Per-column and overall missingness. This is deliberately the simplest
 * analysis module — it's the baseline other findings (like cross-field
 * inconsistency) get compared against.
 */
export function analyzeCompleteness(rows, columns) {
  const byColumn = {};

  for (const column of columns) {
    let missing = 0;
    for (const row of rows) {
      if (isMissing(row[column])) missing += 1;
    }
    const total = rows.length;
    const filled = total - missing;
    byColumn[column] = {
      total,
      filled,
      missing,
      missingPct: total === 0 ? 0 : missing / total,
    };
  }

  const totalCells = rows.length * columns.length;
  const missingCells = Object.values(byColumn).reduce(
    (sum, col) => sum + col.missing,
    0
  );

  return {
    overall: {
      totalCells,
      missingCells,
      filledCells: totalCells - missingCells,
      completenessPct: totalCells === 0 ? 1 : 1 - missingCells / totalCells,
    },
    byColumn,
  };
}
