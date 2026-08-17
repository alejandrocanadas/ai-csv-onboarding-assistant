/** The at-a-glance summary a non-technical reader sees first — no jargon, no null counts. */
function OverviewSummary({ profile, findings, rowCount, columnCount }) {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const completenessPct = Math.round(profile.completeness.overall.completenessPct * 100);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card label="Rows &middot; columns" value={`${rowCount.toLocaleString()} × ${columnCount}`} />
      <Card
        label="Overall completeness"
        value={`${completenessPct}%`}
        tone={completenessPct < 75 ? "bad" : completenessPct < 90 ? "warn" : "good"}
      />
      <Card
        label="Things to flag before kickoff"
        value={criticalCount}
        tone={criticalCount > 0 ? "bad" : "good"}
      />
      <Card
        label="Worth double-checking"
        value={warningCount}
        tone={warningCount > 0 ? "warn" : "good"}
      />
    </section>
  );
}

function Card({ label, value, tone = "neutral" }) {
  const toneClasses = {
    neutral: "border-border/15 bg-surface",
    bad: "border-bad/30 bg-bad-soft",
    warn: "border-warn/30 bg-warn-soft",
    good: "border-good/30 bg-good-soft",
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-4 ${toneClasses}`}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default OverviewSummary;
