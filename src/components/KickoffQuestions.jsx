/** Questions to bring to the client kickoff — LLM-generated, grounded in the findings above. */
function KickoffQuestions({ questions }) {
  if (!questions || questions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-muted">Questions for kickoff</h3>
      <ul className="mt-2 space-y-2">
        {questions.map((q, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink">
            <span className="text-accent">?</span>
            <span>{q}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default KickoffQuestions;
