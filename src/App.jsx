import { useMemo, useState } from "react";
import FileUpload from "./components/FileUpload";
import ApiKeySettings from "./components/ApiKeySettings";
import { profileDataset } from "./lib/analysis";
import { generateAssessment } from "./lib/llm/client";
import { summarizeProfile } from "./lib/llm/prompts";

const API_KEY_STORAGE_KEY = "anthropic_api_key";

function App() {
  // App is the "closest common ancestor" of everything that needs to know
  // about the loaded CSV, so it owns this state. Later, the analysis
  // results and LLM narrative will live here too and flow down as props.
  const [parsed, setParsed] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [error, setError] = useState(null);

  // Lazy initializer: only reads sessionStorage once, on first mount.
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem(API_KEY_STORAGE_KEY) ?? ""
  );
  const [assessment, setAssessment] = useState(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState(null);

  function handleApiKeyChange(key) {
    setApiKey(key);
    if (key) sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
    else sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  }

  function handleParsed(result, file) {
    setError(null);
    setParsed(result);
    setFileMeta({ name: file.name, size: file.size });
    // A new file makes any previous narrative stale.
    setAssessment(null);
    setAssessmentError(null);
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

  async function handleGenerateAssessment() {
    setAssessmentLoading(true);
    setAssessmentError(null);
    try {
      const summary = summarizeProfile(profile, parsed.columns);
      const result = await generateAssessment({
        apiKey,
        fileName: fileMeta.name,
        summary,
      });
      setAssessment(result);
    } catch (err) {
      setAssessmentError(err.message);
    } finally {
      setAssessmentLoading(false);
    }
  }

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
        <ApiKeySettings apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />

        <div className="mt-4">
          <FileUpload onParsed={handleParsed} onError={handleError} />
        </div>

        {fileMeta && <UploadStatus fileMeta={fileMeta} isValid={!error} error={error} />}

        {parsed && <RawPreview result={parsed} />}
        {profile && <AnalysisSummary profile={profile} />}
        {profile && (
          <AssessmentSection
            canGenerate={Boolean(apiKey)}
            loading={assessmentLoading}
            error={assessmentError}
            assessment={assessment}
            onGenerate={handleGenerateAssessment}
          />
        )}
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

/**
 * The one deliberate LLM use case: turns the computed findings into a
 * plain-English narrative + kickoff questions for a non-technical reader.
 * The LLM never sees raw rows — only the summarized facts from analysis.
 */
function AssessmentSection({ canGenerate, loading, error, assessment, onGenerate }) {
  return (
    <section className="mt-8 rounded-xl border border-border/15 bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Assessment</h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "Generating…" : "Generate assessment"}
        </button>
      </div>

      {!canGenerate && (
        <p className="mt-3 text-sm text-ink-muted">
          Add your Anthropic API key above to generate a narrative assessment.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      {loading && (
        <p className="mt-4 text-sm text-ink-muted">
          Asking Claude to read the findings and write the assessment…
        </p>
      )}

      {assessment && (
        <div className="mt-5 space-y-6">
          <div className="space-y-3 text-sm leading-relaxed text-ink">
            {assessment.narrative
              .split("\n")
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>

          {assessment.kickoffQuestions?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-muted">
                Kickoff questions
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink">
                {assessment.kickoffQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
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
