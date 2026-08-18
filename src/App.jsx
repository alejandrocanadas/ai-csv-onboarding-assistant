import { useMemo, useState } from "react";
import FileUpload from "./components/FileUpload";
import ApiKeySettings from "./components/ApiKeySettings";
import OverviewSummary from "./components/OverviewSummary";
import FindingsList from "./components/FindingsList";
import KickoffQuestions from "./components/KickoffQuestions";
import ColumnDetail from "./components/ColumnDetail";
import { profileDataset } from "./lib/analysis";
import { buildFindings } from "./lib/analysis/findings";
import { generateAssessment } from "./lib/llm/client";
import { summarizeProfile } from "./lib/llm/prompts";

const API_KEY_STORAGE_KEY = "anthropic_api_key";

function App() {
  // App is the "closest common ancestor" of everything that needs to know
  // about the loaded CSV, so it owns this state and passes it down as props.
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
  const [activeTab, setActiveTab] = useState("assessment");

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
    setActiveTab("assessment");
  }

  function handleError(message, file) {
    setParsed(null);
    setFileMeta(file ? { name: file.name, size: file.size } : null);
    setError(message);
  }

  // useMemo re-runs these only when `parsed` changes, not on every render
  // (e.g. re-renders from assessment loading state have nothing to do
  // with the analysis itself).
  const profile = useMemo(() => {
    if (!parsed) return null;
    return profileDataset(parsed.rows, parsed.columns);
  }, [parsed]);

  const findings = useMemo(() => {
    if (!profile || !parsed) return [];
    return buildFindings(profile, parsed.columns);
  }, [profile, parsed]);

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
      <header className="border-b-2 border-border bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Data onboarding assistant
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
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

        {profile && (
          <div className="mt-8 space-y-6">
            <OverviewSummary
              profile={profile}
              findings={findings}
              rowCount={profile.rowCount}
              columnCount={profile.columnCount}
            />

            <TabNav activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === "assessment" && (
              <AssessmentPanel
                canGenerate={Boolean(apiKey)}
                loading={assessmentLoading}
                error={assessmentError}
                assessment={assessment}
                onGenerate={handleGenerateAssessment}
              />
            )}

            {activeTab === "data" && (
              <div className="space-y-6">
                <section className="rounded-xl border border-border bg-surface p-6">
                  <h2 className="text-lg font-semibold">What we found</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Every item below comes from checking the actual data — nothing here is guessed.
                  </p>
                  <div className="mt-4">
                    <FindingsList findings={findings} />
                  </div>
                </section>

                <ColumnDetail profile={profile} />
                {parsed && <RawPreview result={parsed} />}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const TABS = [
  { id: "assessment", label: "Assessment" },
  { id: "data", label: "Data analysis" },
];

/** Segmented control switching between the narrative assessment and the raw findings/data views. */
function TabNav({ activeTab, onChange }) {
  return (
    <div className="flex overflow-hidden rounded-lg border-2 border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
            activeTab === tab.id
              ? "bg-ink text-bg"
              : "bg-surface text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
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

/** Raw parsed rows, collapsed by default — verification detail, not part of the assessment. */
function RawPreview({ result }) {
  const [open, setOpen] = useState(false);
  const previewRows = result.rows.slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-ink-muted">Raw data preview</h2>
        <span className="text-sm text-accent">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <thead>
                <tr className="bg-bg">
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="border-b border-border px-3 py-2 font-medium text-ink-muted"
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
                      <td key={col} className="border-b border-border/30 px-3 py-2">
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
        </>
      )}
    </section>
  );
}

/**
 * The one deliberate LLM use case: turns the computed findings into a
 * plain-English narrative + kickoff questions for a non-technical reader.
 * The LLM never sees raw rows — only the summarized facts from analysis.
 */
function AssessmentPanel({ canGenerate, loading, error, assessment, onGenerate }) {
  return (
    <section className="rounded-xl border border-accent/30 bg-accent-soft p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Assessment</h2>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? "Generating…" : assessment ? "Regenerate" : "Generate assessment"}
        </button>
      </div>

      {!canGenerate && !assessment && (
        <p className="mt-3 text-sm text-ink-muted">
          Add your Anthropic API key above to generate a plain-English write-up.
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

      {!loading && !error && !assessment && canGenerate && (
        <p className="mt-3 text-sm text-ink-muted">
          Click "Generate assessment" for a plain-English write-up of what's below, plus
          questions to bring to kickoff.
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

          <KickoffQuestions questions={assessment.kickoffQuestions} />
        </div>
      )}
    </section>
  );
}

export default App;
