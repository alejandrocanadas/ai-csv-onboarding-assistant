function toPct(fraction) {
  return Math.round(fraction * 1000) / 10;
}

/**
 * Condenses profileDataset()'s output into compact, LLM-ready facts.
 * The model never sees raw row indices or the full dataset — only
 * counts and short examples — so it narrates what code already found
 * instead of being asked to do analysis itself.
 */
export function summarizeProfile(profile, columns) {
  const { completeness, duplicates, consistency, outliers } = profile;

  const columnSummaries = columns.map((column) => {
    const missingPct = completeness.byColumn[column]?.missingPct ?? 0;
    const typeInfo = consistency.byColumn[column]?.typeInference;
    const variants = consistency.byColumn[column]?.valueVariants ?? [];
    const outlierInfo = outliers.byColumn[column];

    return {
      column,
      missingPct: toPct(missingPct),
      dominantType: typeInfo?.dominantType ?? "empty",
      typeMismatchPct: toPct(typeInfo?.mismatchPct ?? 0),
      mixedNumericFormatting: Boolean(typeInfo?.mixedNumericFormatting),
      valueVariantExamples: variants
        .slice(0, 5)
        .map((cluster) => cluster.variants.map((v) => v.raw)),
      outlierCount: outlierInfo?.outliers.length ?? 0,
      unexpectedNegativeCount: outlierInfo?.unexpectedNegatives.length ?? 0,
    };
  });

  return {
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    overallCompletenessPct: toPct(completeness.overall.completenessPct),
    exactDuplicateRowCount: duplicates.exactDuplicates.duplicateRowCount,
    identifierColumns: duplicates.identifierColumns,
    duplicateIdCounts: Object.fromEntries(
      Object.entries(duplicates.duplicateIdValues).map(([col, dupes]) => [
        col,
        dupes.length,
      ])
    ),
    columns: columnSummaries,
  };
}

export const ASSESSMENT_SYSTEM_PROMPT = `You are a data consultant's assistant. You write the first-read data quality assessment a consultant hands to a client's IT manager before kickoff.

The reader is NOT technical. They don't know what "IQR", "cardinality", or "type mismatch" mean. Write in plain English, the way a careful consultant would explain findings out loud.

Rules:
- Base every claim strictly on the JSON facts you're given. Never invent a number, column, or issue that isn't in the data.
- Be honest about severity — don't soften a real problem, and don't alarm the reader over a minor one.
- Prioritize: lead with what would most affect trust in this data or a downstream analysis, not with whatever appears first in the JSON.
- Write the narrative as short paragraphs (not bullet lists), like a memo — plain prose a non-technical reader can skim.
- The kickoff questions should be things a consultant would actually ask the client about THIS data — reference specific columns or numbers from the facts, not generic questions like "how is your data collected?"`;

export function buildUserPrompt({ fileName, summary }) {
  return `File: ${fileName}

Computed data quality facts (JSON):
${JSON.stringify(summary, null, 2)}

Write the assessment.`;
}

export const ASSESSMENT_SCHEMA = {
  type: "object",
  properties: {
    narrative: {
      type: "string",
      description:
        "The plain-English assessment, as 2-5 short paragraphs of prose.",
    },
    kickoffQuestions: {
      type: "array",
      items: { type: "string" },
      description:
        "3-6 specific questions to ask the client at kickoff, each referencing a concrete finding.",
    },
  },
  required: ["narrative", "kickoffQuestions"],
  additionalProperties: false,
};
