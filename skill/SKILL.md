---
name: tabular-data-quality-heuristics
description: Use when writing column-agnostic, structural/statistical checks over unknown tabular data (CSV profiling, data quality scoring, schema inference) — covers the identifier-detection false positive and the fixture-sizing trap that caused it.
---

# Tabular data quality heuristics

Lessons learned building a column-agnostic CSV data-quality analyzer (completeness, duplicate, consistency, and outlier checks with no hardcoded column names). Two specific mistakes recurred while doing this — both are checks worth running any time you write a similar heuristic.

## 1. High uniqueness alone does not mean "this is an identifier column"

**The bug:** A duplicate-detection module flagged a column as "identifier-like" (and therefore checked for repeated values) whenever its uniqueness ratio (distinct values ÷ non-empty values) exceeded 0.9 and it was well-populated. On a 1,182-row real dataset, this misidentified `unit_price` and `line_total` — continuous decimal money columns — as identifier columns, because at that row count, random-looking prices are nearly as unique as real IDs by chance.

**The fix:** Require the column's *dominant value shape* to be non-numeric (text/code-like — `"ORD-50276"`, `"CUST-10164"`) before calling it an identifier. A column whose values are mostly parseable as plain numbers or percentages is a measurement, not a key, no matter how unique it looks.

**The general rule:** Never use a single statistical signal (uniqueness, cardinality ratio, missingness rate) alone to infer semantic meaning about a column. Combine it with a structural signal (value shape/type) that rules out the confounding case. Before trusting a "this column looks like X" heuristic, ask: *what non-X thing could also produce this same statistical signature at scale?* For uniqueness specifically, continuous numeric measurements are the classic false positive.

## 2. Structural/statistical heuristics need realistically-sized test fixtures

**The bug:** Unit tests for the same heuristic (and for value-variant clustering, and for "rare negative value" detection) were first written with 3-6 row hand-crafted fixtures. They failed — not because the logic was wrong, but because percentage-based thresholds (uniqueness > 0.9, cardinality ratio < 0.5, negative rate < 5%) can't be meaningfully cleared or failed by a handful of rows. One negative value in a 4-row fixture is a 25% negative rate, which will never read as "rare."

**The fix:** Size fixtures to actually exercise the threshold — e.g. `Array.from({ length: 30 }, ...)` with one deliberate outlier, not `[a, b, c]`. If a threshold is a percentage, the fixture needs enough rows that one bad row doesn't dominate the percentage.

**The general rule:** For any heuristic gated by a rate/ratio/percentage threshold, the unit test fixture size is not a stylistic choice — it has to be large enough that the phenomenon you're testing for (rare vs. common) actually reads as rare vs. common at that size. And even with correctly-sized unit tests, run the heuristic against one real (or realistically messy) dataset before trusting it — the `unit_price`/`line_total` bug above was caught by a manual sanity-check script against the real sample CSV, not by any unit test.

## Checklist to apply

When writing a new column-agnostic structural/statistical check over tabular data:

- [ ] Does this heuristic rely on a single statistical signal? If so, name the confounding case that could produce the same signal for a different reason, and add a second signal to rule it out.
- [ ] Are threshold-gated unit test fixtures large enough (generally 20-30+ rows) that the percentage in question is actually representative, not an artifact of a tiny sample?
- [ ] Has the heuristic been run — not just unit-tested — against one real or realistically-messy dataset, with the output eyeballed for plausibility?
