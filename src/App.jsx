import { useState } from "react";
import FileUpload from "./components/FileUpload";

function App() {
  // App is the "closest common ancestor" of everything that needs to know
  // about the loaded CSV, so it owns this state. Later, the analysis
  // results and LLM narrative will live here too and flow down as props.
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);

  function handleParsed(result) {
    setError(null);
    setParsed(result);
  }

  function handleError(message) {
    setParsed(null);
    setError(message);
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
        <FileUpload onParsed={handleParsed} onError={handleError} />

        {error && (
          <p className="mt-4 rounded-lg border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}

        {parsed && <RawPreview result={parsed} />}
      </main>
    </div>
  );
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

export default App;
