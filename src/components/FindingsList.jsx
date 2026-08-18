const SEVERITY_STYLES = {
  critical: {
    label: "Flag before kickoff",
    border: "border-bad/30",
    bg: "bg-bad-soft",
    text: "text-bad",
  },
  warning: {
    label: "Worth checking",
    border: "border-warn/30",
    bg: "bg-warn-soft",
    text: "text-warn",
  },
  info: {
    label: "Minor",
    border: "border-border/40",
    bg: "bg-bg",
    text: "text-ink-muted",
  },
};

/** Prioritized finding cards — the replacement for a raw per-column table. */
function FindingsList({ findings }) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No notable issues found by the automated checks.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {findings.map((finding) => {
        const style = SEVERITY_STYLES[finding.severity];
        return (
          <div
            key={finding.id}
            className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${style.text}`}
              >
                {style.label}
              </span>
              <span className="text-xs text-ink-muted">{finding.category}</span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-ink">{finding.title}</p>
            <p className="mt-0.5 text-sm text-ink-muted">{finding.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export default FindingsList;
