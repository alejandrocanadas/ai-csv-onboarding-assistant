import { useState } from "react";

/**
 * The full per-column table — kept, but demoted to opt-in detail behind a
 * toggle. This is for someone who wants to dig in, not the primary view;
 * the findings list above it is the actual "assessment."
 */
function ColumnDetail({ profile }) {
  const [open, setOpen] = useState(false);
  const { completeness, consistency, outliers } = profile;

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-ink-muted">
          Column-by-column detail
        </h2>
        <span className="text-sm text-accent">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead>
              <tr className="bg-bg">
                {[
                  "Column",
                  "Missing",
                  "Dominant type",
                  "Type mismatch",
                  "Value variants",
                  "Outliers",
                  "Unexpected negatives",
                ].map((h) => (
                  <th
                    key={h}
                    className="border-b border-border px-3 py-2 font-medium text-ink-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(completeness.byColumn).map((column) => {
                const missing = completeness.byColumn[column];
                const typeInfo = consistency.byColumn[column]?.typeInference;
                const variants = consistency.byColumn[column]?.valueVariants ?? [];
                const outlierInfo = outliers.byColumn[column];

                return (
                  <tr key={column} className="odd:bg-surface even:bg-bg/40">
                    <td className="border-b border-border/30 px-3 py-2 font-medium">
                      {column}
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {(missing.missingPct * 100).toFixed(1)}%
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {typeInfo?.dominantType ?? "—"}
                      {typeInfo?.mixedNumericFormatting && (
                        <span className="ml-1 text-warn">(mixed %/number)</span>
                      )}
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {typeInfo ? `${(typeInfo.mismatchPct * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {variants.length > 0 ? `${variants.length} cluster(s)` : "—"}
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {outlierInfo ? outlierInfo.outliers.length : "—"}
                    </td>
                    <td className="border-b border-border/30 px-3 py-2">
                      {outlierInfo?.unexpectedNegatives.length > 0
                        ? outlierInfo.unexpectedNegatives.length
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ColumnDetail;
