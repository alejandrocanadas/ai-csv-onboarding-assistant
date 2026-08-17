import { classifyValue, isMissing, normalizeText } from "./valueTypes";

const VARIANT_MAX_AVG_LENGTH = 40; // skip long free-text columns (notes, addresses)
const VARIANT_MAX_CARDINALITY_RATIO = 0.5; // categorical-like: values repeat a lot

/**
 * Two column-agnostic consistency checks:
 *  - type inference: does every value in a column share the same shape
 *    (number, date, text, ...), and what fraction don't?
 *  - value variants: for columns that look categorical, are there
 *    values that are "the same" once you normalize case/whitespace
 *    (e.g. "Web", "web", " WEB ")?
 */
export function analyzeConsistency(rows, columns) {
  const byColumn = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column]);
    byColumn[column] = {
      typeInference: inferColumnType(values),
      valueVariants: findValueVariants(values),
    };
  }

  return { byColumn };
}

function inferColumnType(values) {
  const counts = {};
  let nonEmptyCount = 0;

  for (const raw of values) {
    const type = classifyValue(raw);
    if (type === "empty") continue;
    nonEmptyCount += 1;
    counts[type] = (counts[type] ?? 0) + 1;
  }

  if (nonEmptyCount === 0) {
    return { dominantType: "empty", counts, nonEmptyCount, mismatchPct: 0 };
  }

  const dominantType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const mismatchCount = nonEmptyCount - counts[dominantType];

  return {
    dominantType,
    counts,
    nonEmptyCount,
    mismatchPct: mismatchCount / nonEmptyCount,
    // A column classed mostly "number" that also has "percent" values
    // (or vice versa) is the "0.1 vs 10%" mixed-formatting case.
    mixedNumericFormatting:
      (counts.number ?? 0) > 0 && (counts.percent ?? 0) > 0,
  };
}

function findValueVariants(values) {
  const nonEmpty = values.filter((v) => !isMissing(v)).map((v) => String(v));
  if (nonEmpty.length === 0) return [];

  const avgLength =
    nonEmpty.reduce((sum, v) => sum + v.length, 0) / nonEmpty.length;
  const distinctCount = new Set(nonEmpty).size;
  const cardinalityRatio = distinctCount / nonEmpty.length;

  const looksCategorical =
    avgLength <= VARIANT_MAX_AVG_LENGTH &&
    cardinalityRatio <= VARIANT_MAX_CARDINALITY_RATIO;
  if (!looksCategorical) return [];

  const groups = new Map();
  for (const raw of nonEmpty) {
    const normalized = normalizeText(raw);
    if (!groups.has(normalized)) groups.set(normalized, new Map());
    const variants = groups.get(normalized);
    variants.set(raw, (variants.get(raw) ?? 0) + 1);
  }

  const clusters = [];
  for (const [normalized, variants] of groups.entries()) {
    if (variants.size > 1) {
      clusters.push({
        normalized,
        variants: [...variants.entries()].map(([raw, count]) => ({
          raw,
          count,
        })),
      });
    }
  }

  return clusters;
}
