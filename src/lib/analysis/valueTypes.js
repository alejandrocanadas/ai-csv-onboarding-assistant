// Shared, column-agnostic value parsing used by the analysis modules.
// Nothing in here knows about a specific column name — it only looks at
// the shape of the raw string value.

const DATE_PATTERNS = [
  /^\d{4}-\d{1,2}-\d{1,2}$/, // 2024-03-22
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, // 03/22/2024
  /^\d{1,2}-\d{1,2}-\d{4}$/, // 30-09-2024
  /^[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4}$/, // Mar 24, 2024
];

const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "y", "n"]);

export function isMissing(raw) {
  return raw === null || raw === undefined || String(raw).trim() === "";
}

export function normalizeText(raw) {
  return String(raw).trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Parses a numeric-looking string, including percent notation ("10%").
 * Returns { value, isPercent } where value is the number as written
 * (10% -> value 10, isPercent true) — callers decide how to reconcile
 * percent-vs-decimal formatting differences.
 */
export function parseNumeric(raw) {
  const trimmed = String(raw).trim();
  const percentMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return { value: Number(percentMatch[1]), isPercent: true };
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { value: Number(trimmed), isPercent: false };
  }
  return null;
}

export function isPlausibleDateString(raw) {
  const trimmed = String(raw).trim();
  return DATE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function parseDateValue(raw) {
  if (!isPlausibleDateString(raw)) return null;
  const date = new Date(String(raw).trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Classifies a single raw value into one of a small set of shapes.
 * Used to find each column's dominant type and flag values that
 * don't match it.
 */
export function classifyValue(raw) {
  if (isMissing(raw)) return "empty";
  const trimmed = String(raw).trim();

  const numeric = parseNumeric(trimmed);
  if (numeric) return numeric.isPercent ? "percent" : "number";

  if (BOOLEAN_VALUES.has(trimmed.toLowerCase())) return "boolean";
  if (isPlausibleDateString(trimmed)) return "date";

  return "text";
}
