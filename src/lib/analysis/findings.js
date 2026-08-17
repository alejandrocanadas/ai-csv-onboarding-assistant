// Turns profileDataset()'s output into a flat, prioritized list of
// human-readable findings. Still pure computation — severity is assigned
// from thresholds on the numbers, not by an LLM. This is what the UI (and
// the LLM prompt) actually reads from, instead of a raw per-column table.

const CRITICAL_RATE = 0.25;
const WARNING_RATE = 0.05;

function severityForRate(rate) {
  if (rate > CRITICAL_RATE) return "critical";
  if (rate > WARNING_RATE) return "warning";
  return "info";
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const TYPE_LABELS = {
  number: "numbers",
  percent: "percentages",
  date: "dates",
  boolean: "yes/no values",
  text: "text",
  empty: "empty values",
};

function humanizeType(type) {
  return TYPE_LABELS[type] ?? type;
}

export function buildFindings(profile, columns) {
  const { rowCount, completeness, duplicates, consistency, outliers } = profile;
  const findings = [];

  if (duplicates.exactDuplicates.duplicateRowCount > 0) {
    const rate = duplicates.exactDuplicates.duplicateRowCount / rowCount;
    findings.push({
      id: "exact-duplicates",
      severity: rate > 0.01 ? "critical" : "warning",
      category: "Duplicates",
      column: null,
      title: `${duplicates.exactDuplicates.duplicateRowCount} exact duplicate row(s)`,
      description:
        "These rows are identical across every column — the same record appears to have been captured more than once.",
    });
  }

  for (const [column, dupes] of Object.entries(duplicates.duplicateIdValues)) {
    findings.push({
      id: `dup-id-${column}`,
      severity: dupes.length > 5 ? "critical" : "warning",
      category: "Duplicates",
      column,
      title: `${column} has ${dupes.length} value(s) that repeat`,
      description: `${column} looks like it should uniquely identify each row, but ${dupes.length} value(s) appear on more than one row.`,
    });
  }

  for (const column of columns) {
    const missing = completeness.byColumn[column];
    if (missing && missing.missingPct > WARNING_RATE) {
      findings.push({
        id: `missing-${column}`,
        severity: severityForRate(missing.missingPct),
        category: "Completeness",
        column,
        title: `${column} is missing ${(missing.missingPct * 100).toFixed(0)}% of values`,
        description: `${missing.missing} of ${missing.total} rows have no value in ${column}.`,
      });
    }

    const typeInfo = consistency.byColumn[column]?.typeInference;
    if (typeInfo && typeInfo.nonEmptyCount > 0 && typeInfo.mismatchPct > WARNING_RATE) {
      findings.push({
        id: `type-mismatch-${column}`,
        severity: severityForRate(typeInfo.mismatchPct),
        category: "Consistency",
        column,
        title: `${column} mixes formats`,
        description: `Most values in ${column} look like ${humanizeType(typeInfo.dominantType)}, but ${(typeInfo.mismatchPct * 100).toFixed(0)}% don't match that shape.`,
      });
    }

    if (typeInfo?.mixedNumericFormatting) {
      findings.push({
        id: `mixed-numeric-${column}`,
        severity: "warning",
        category: "Consistency",
        column,
        title: `${column} mixes number styles`,
        description: `${column} has some values written as plain numbers and others as percentages (e.g. "0.1" vs "10%") — it's ambiguous which is correct without asking the client.`,
      });
    }

    const variants = consistency.byColumn[column]?.valueVariants ?? [];
    if (variants.length > 0) {
      const examples = variants
        .slice(0, 3)
        .map((cluster) => cluster.variants.map((v) => `"${v.raw}"`).join(" / "))
        .join(", ");
      findings.push({
        id: `variants-${column}`,
        severity: variants.length > 3 ? "warning" : "info",
        category: "Consistency",
        column,
        title: `${column} has inconsistent spelling/casing`,
        description: `The same value is written differently across rows, e.g. ${examples}.`,
      });
    }

    const outlierInfo = outliers.byColumn[column];
    if (outlierInfo?.unexpectedNegatives.length > 0) {
      findings.push({
        id: `negatives-${column}`,
        severity: "critical",
        category: "Outliers",
        column,
        title: `${column} has negative values that shouldn't be possible`,
        description: `${outlierInfo.unexpectedNegatives.length} row(s) have a negative value in ${column}, which is almost always a data-entry or export error for this kind of field.`,
      });
    }
    if (outlierInfo && outlierInfo.outliers.length / rowCount > WARNING_RATE) {
      findings.push({
        id: `outliers-${column}`,
        severity: "info",
        category: "Outliers",
        column,
        title: `${column} has statistical outliers`,
        description: `${outlierInfo.outliers.length} value(s) in ${column} fall far outside the typical range for this column.`,
      });
    }
  }

  return findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
