import { parseNumeric } from "./valueTypes";

const NEGATIVE_RARITY_THRESHOLD = 0.05; // negatives are "unexpected" if <5% of values

/**
 * Statistical outlier detection for numeric columns. Two distinct signals:
 *  - IQR outliers: values far outside the column's own typical range.
 *  - unexpected negatives: a column that's almost always >= 0 (like a
 *    quantity or price) but has a handful of negative values — those are
 *    a stronger, more specific signal than "just" a statistical outlier.
 * Both are computed from the data itself, not a hardcoded rule about
 * what a "quantity" column should look like.
 */
export function analyzeOutliers(rows, columns) {
  const byColumn = {};

  for (const column of columns) {
    const numericEntries = [];
    rows.forEach((row, rowIndex) => {
      const parsed = parseNumeric(row[column]);
      if (parsed) numericEntries.push({ rowIndex, value: parsed.value });
    });

    if (numericEntries.length < 4) continue; // not enough data for quartiles

    const iqrOutliers = findIqrOutliers(numericEntries);
    const unexpectedNegatives = findUnexpectedNegatives(numericEntries);

    if (iqrOutliers.outliers.length > 0 || unexpectedNegatives.length > 0) {
      byColumn[column] = {
        sampleSize: numericEntries.length,
        bounds: iqrOutliers.bounds,
        outliers: iqrOutliers.outliers,
        unexpectedNegatives,
      };
    }
  }

  return { byColumn };
}

function quartile(sortedValues, q) {
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

function findIqrOutliers(entries) {
  const sorted = [...entries].sort((a, b) => a.value - b.value).map((e) => e.value);
  const q1 = quartile(sorted, 0.25);
  const q3 = quartile(sorted, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const outliers = entries.filter((e) => e.value < lower || e.value > upper);
  return { bounds: { lower, upper }, outliers };
}

function findUnexpectedNegatives(entries) {
  const negatives = entries.filter((e) => e.value < 0);
  if (negatives.length === 0) return [];
  const negativeRatio = negatives.length / entries.length;
  return negativeRatio < NEGATIVE_RARITY_THRESHOLD ? negatives : [];
}
