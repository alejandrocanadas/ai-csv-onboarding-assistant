import { classifyValue, isMissing } from "./valueTypes";

const ID_UNIQUENESS_THRESHOLD = 0.9; // distinct-non-empty / non-empty
const ID_COVERAGE_THRESHOLD = 0.5; // non-empty / total rows

/**
 * Finds exact full-row duplicates, plus duplicate values inside columns
 * that behave like identifiers (mostly unique, mostly filled) — without
 * assuming any column name. A column only counts as an "identifier
 * column" structurally, by its own uniqueness ratio.
 */
export function analyzeDuplicates(rows, columns) {
  const exactDuplicates = findExactDuplicateRows(rows, columns);
  const identifierColumns = columns.filter((col) =>
    looksLikeIdentifierColumn(rows, col)
  );

  const duplicateIdValues = {};
  for (const column of identifierColumns) {
    const groups = groupByValue(rows, column);
    const duplicates = groups.filter((g) => g.rowIndices.length > 1);
    if (duplicates.length > 0) {
      duplicateIdValues[column] = duplicates;
    }
  }

  return {
    exactDuplicates,
    identifierColumns,
    duplicateIdValues,
  };
}

function findExactDuplicateRows(rows, columns) {
  const seen = new Map();
  rows.forEach((row, index) => {
    const key = JSON.stringify(columns.map((col) => row[col] ?? ""));
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(index);
  });

  const groups = [...seen.values()].filter((indices) => indices.length > 1);
  const duplicateRowCount = groups.reduce(
    (sum, indices) => sum + (indices.length - 1),
    0
  );

  return { groupCount: groups.length, duplicateRowCount, groups };
}

function looksLikeIdentifierColumn(rows, column) {
  const values = rows.map((row) => row[column]).filter((v) => !isMissing(v));
  if (values.length === 0) return false;

  const coverage = values.length / rows.length;
  const distinctCount = new Set(values).size;
  const uniqueness = distinctCount / values.length;

  // A continuous numeric measurement (price, total) can be almost as
  // "unique" as a real identifier purely by chance. Identifiers are
  // structurally codes/text, not decimal quantities, so require the
  // column's dominant shape to not be a plain number.
  const dominantType = mostCommonType(values);
  const isContinuousNumeric = dominantType === "number" || dominantType === "percent";

  return (
    coverage >= ID_COVERAGE_THRESHOLD &&
    uniqueness >= ID_UNIQUENESS_THRESHOLD &&
    !isContinuousNumeric
  );
}

function mostCommonType(values) {
  const counts = {};
  for (const value of values) {
    const type = classifyValue(value);
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function groupByValue(rows, column) {
  const byValue = new Map();
  rows.forEach((row, index) => {
    const value = row[column];
    if (isMissing(value)) return;
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value).push(index);
  });

  return [...byValue.entries()].map(([value, rowIndices]) => ({
    value,
    rowIndices,
  }));
}
