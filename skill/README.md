# Skill: tabular-data-quality-heuristics

A Claude Skill packaging two specific mistakes Claude made (and I caught) while building this app's column-agnostic analysis modules — not generic "be a good data analyst" advice, but a concrete bug (continuous numeric columns misidentified as row identifiers) and the fixture-sizing trap that let it slip past unit tests.

## What it's for

Load this whenever you're asking Claude to write structural or statistical checks over tabular data with no fixed schema — CSV profiling, data quality scoring, duplicate/identifier detection, outlier detection, schema inference. It tells Claude to combine statistical signals with structural ones (not trust uniqueness/cardinality alone) and to size test fixtures so percentage-based thresholds are actually meaningful.

## How to install

**Claude Code / claude.ai projects:** copy this folder into your project's `.claude/skills/` directory (or wherever your setup expects skills), keeping the folder name `tabular-data-quality-heuristics`:

```
.claude/skills/tabular-data-quality-heuristics/SKILL.md
```

Claude will pick up the `description` in the frontmatter and load the skill automatically when the task matches.

**Manually:** just paste the contents of `SKILL.md` into your prompt or system instructions when asking an LLM to write similar data-quality heuristics.

## Where the lesson came from

Both bugs happened building `src/lib/analysis/duplicates.js` and its tests in this repo:
- `unit_price` and `line_total` (continuous price columns) were false-positively flagged as "identifier columns" by the duplicate-detection heuristic, caught only by running it against the real 1,182-row sample CSV — not by the unit tests, which passed.
- Multiple unit test fixtures across `duplicates.test.js`, `consistency.test.js`, and `outliers.test.js` initially failed on 3-6 row fixtures because percentage-based thresholds can't be meaningfully exercised at that size — fixed by sizing fixtures to 20-30+ rows.
