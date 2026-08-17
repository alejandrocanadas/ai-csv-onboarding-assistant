import { useMemo, useState } from "react";
import FileUpload from "./components/FileUpload";
import { profileDataset } from "./lib/analysis";

function App() {
  // App is the "closest common ancestor" of everything that needs to know
  // about the loaded CSV, so it owns this state. Later, the analysis
  // results and LLM narrative will live here too and flow down as props.
  const [parsed, setParsed] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState(null);

  function handleParsed(result, file) {
    setError(null);
    setParsed(result);
    setFileMeta({ name: file.name, size: file.size });
  }

  function handleError(message, file) {
    setParsed(null);
    setFileMeta(file ? { name: file.name, size: file.size } : null);
    setError(message);
  }

  // useMemo re-runs profileDataset only when `parsed` changes, not on
  // every render (e.g. this component re-renders on error state changes
  // that have nothing to do with the analysis itself).
  const profile = useMemo(() => {
    if (!parsed) return null;
    return profileDataset(parsed.rows, parsed.columns);
  }, [parsed]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="border-b border-border/15 bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight">
            CSV Onboarding Assistant
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Drop in a client export to get a first-read data quality assessment.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <FileUpload onParsed={handleParsed} onError={handleError} />

        {fileMeta && <UploadStatus fileMeta={fileMeta} isValid={!error} error={error} />}

        {parsed && <RawPreview result={parsed} />}
        {profile && <AnalysisSummary profile={profile} />}
      </main>
    </div>
  );
}

/** Confirms which file was picked up, and flags immediately if it wasn't a CSV. */
function UploadStatus({ fileMeta, isValid, error }) {
  if (!isValid) {
    return (
      <p className="mt-4 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
        {error}
      </p>
    );
  }

  return (
    <p className="mt-4 flex items-center gap-2 rounded-lg border border-good/30 bg-good-soft px-4 py-3 text-sm text-good">
      <span aria-hidden="true">&#10003;</span>
      <span>
        CSV uploaded: <span className="font-medium">{fileMeta.name}</span>
        <span className="text-good/70"> ({formatBytes(fileMeta.size)})</span>
      </span>
    </p>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Confirms parsing worked before any analysis logic goes on top of it. */
function RawPreview({ result }) {
  const previewRows = result.rows.slice(0, 5);

  return (
    <section className="mt-8 rounded-xl border border-border/15 bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Raw preview</h2>
        <p className="text-sm text-ink-muted">
          {result.rowCount.toLocaleString()} rows &middot; {result.columns.length} columns
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border/15">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr className="bg-bg">
              {result.columns.map((col) => (
                <th
                  key={col}
                  className="border-b border-border/15 px-3 py-2 font-medium text-ink-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="odd:bg-surface even:bg-bg/40">
                {result.columns.map((col) => (
                  <td key={col} className="border-b border-border/10 px-3 py-2">
                    {row[col] || <span className="text-ink-muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.errors.length > 0 && (
        <p className="mt-3 text-sm text-warn">
          PapaParse reported {result.errors.length} row-level parse issue(s).
        </p>
      )}
    </section>
  );
}

/**
 * A functional (not-yet-polished) view of profileDataset's output, just
 * to prove the analysis modules wire correctly into the UI. The real
 * assessment-style presentation layer replaces this next.
 */
function AnalysisSummary({ profile }) {
  const { completeness, duplicates, consistency, outliers } = profile;

  return (
    <section className="mt-8 rounded-xl border border-border/15 bg-surface p-6">
      <h2 className="text-lg font-semibold">Analysis (raw, pre-design pass)</h2>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Completeness"
          value={`${(completeness.overall.completenessPct * 100).toFixed(1)}%`}
        />
        <Stat
          label="Exact duplicate rows"
          value={duplicates.exactDuplicates.duplicateRowCount}
        />
        <Stat
          label="Identifier columns"
          value={duplicates.identifierColumns.length}
        />
        <Stat
          label="Columns with outliers"
          value={Object.keys(outliers.byColumn).length}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border/15">
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
                  className="border-b border-border/15 px-3 py-2 font-medium text-ink-muted"
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
                  <td className="border-b border-border/10 px-3 py-2 font-medium">
                    {column}
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
                    {(missing.missingPct * 100).toFixed(1)}%
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
                    {typeInfo?.dominantType ?? "—"}
                    {typeInfo?.mixedNumericFormatting && (
                      <span className="ml-1 text-warn">(mixed %/number)</span>
                    )}
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
                    {typeInfo ? `${(typeInfo.mismatchPct * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
                    {variants.length > 0 ? `${variants.length} cluster(s)` : "—"}
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
                    {outlierInfo ? outlierInfo.outliers.length : "—"}
                  </td>
                  <td className="border-b border-border/10 px-3 py-2">
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
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border/15 bg-bg px-4 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default App;
