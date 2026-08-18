# NOTES

## 1. Manual dataset review

Before developing any analysis code, I opened `lakeside_orders_sample.csv` and reviewed it by hand to understand what real issues existed, so the analysis logic could be built around actual problems.

| Column | Type | Issues observed |
|---|---|---|
| `order_dt` | Date | Many unformatted and empty dates |
| `ship_dt` | Date | Blank dates on orders marked shipped (doesn't logically add up); format itself is otherwise consistent |
| `cust_name` | Text | Blank customer names |
| `cust_email` | Text | Unformatted emails (inconsistent capitalization), blanks |
| `cust_seg_cd` | Text | Blank codes |
| `prod_cat` | Text | Unformatted categories, blanks |
| `qty` | Numeric | Negative quantities |
| `unit_price` | Numeric | Blank values |
| `disc_pct` | Numeric | Negative values, blanks, non-percentage values, inconsistent formatting |
| `currency` | Text | Blank and unformatted currency values |
| `chnl` | Text | Unformatted channel values |
| `pmt_method` | Text | Blank and unformatted payment methods |
| `ord_status` | Text | Blank and unformatted order statuses |
| `ship_country` | Text | Unformatted shipping country values |
| `ship_region` | Text | Unformatted shipping region values |
| `ship_postal` | Mixed | Different data types across rows |

This review directly shaped the analysis design.

## 2. Key development decisions

- **Column-agnostic analysis.**: No column names are hardcoded anywhere in `src/lib/analysis/`. Every check loops over the columns existing in the uploaded file. This was verified by running the app against a second CSV, not just the Lakeside sample.
- **Real computation before LLM involvement.**: Completeness, duplicates, consistency, and outlier detection are all computed in plain JavaScript first. The LLM only receives the computed findings as structured input, then narrates and generates kickoff questions, it doesn't do the analysis itself.
- **One deliberate LLM use case**: Turning computed findings into a narrative assessment plus a set of kickoff questions for the client.
- **No backend.** The Anthropic API is called directly from the browser (`dangerouslyAllowBrowser: true`) using a key the user supplies at runtime, stored only in `sessionStorage`.

## 3. AI tools used

**Claude Chat** was used for initial understanding of the assessment, working through what was beinng asked for, and producing a development plan before writing any code.

**Claude Code** led most of the implementation (CSV ingestion, the analysis modules, the LLM integration, and the UI) working from a written project context and manual data findings so it had the same grounding as the planning phase.

**Model used:** Claude Sonnet 5, chosen for a practical balance of strong code generation, fast responses, and a large context window at a lower cost than highertier models.

## 4. What worked well

- Validating each layer before building the next (CSV preview before analysis, analysis before LLM integration) meant bugs were easy to localize. If something broke, it was almost always in the newest layer (Iterative development).
- Keeping analysis functions small and testable (`completeness.js`, `duplicates.js`, `consistency.js`, `outliers.js`) made it possible to check each one in isolation before wiring it into the UI.
- Writing the manual CSV findings down before coding gave the analysis logic something concrete to be checked against, instead of designing checks in the abstract.

## 5. Where the AI got it wrong (and how it was caught)

**Bug 1 — identifier columns misdetected by uniqueness alone.** The duplicate detection logic flagged a column as an "identifier column" whenever its uniqueness ratio (distinct values + non-empty values) was high. On the real sample, this misidentified `unit_price` and `line_total` as identifiers, because decimal prices are also almost always distinct from each other by chance. This wasn't caught by unit tests, which passed; it was caught by running the heuristic against the actual sample file and eyeballing the output.

**Bug 2 — test fixtures too small to test percentage-based rules.** Several unit tests (for rules like "flag if fewer than 5% of values are negative") were originally written with 3–6 row fixtures. At that size, a single bad row is already 20–25% of the data, so the rule could never observe a genuinely rare case this made the tests passed or failed for the wrong reasons.

Both of these became the basis for `skill/SKILL.md` which is a reusable guide for any AI assistant writing similar data checks in the future.

## 6. What was cut, and why

- **Cross-field logical inconsistency as its own finding category** (e.g. "shipped" status with a blank ship date) isn't implemented as a distinct class of finding — related issues currently surface individually within Completeness/Consistency findings instead. Cut due to time; this was the most interesting finding from the manual review and is the top priority to add back.
- **No dedicated mobile layout.** The app is usable but was built for desktop, since the actual users are very unlikely to be on mobile for this task.
- **No caching of the generated narrative assessment.** Regenerating it costs an API call even for the same file, since there wasn't time to add even simple memoization.

## 7. Time spent

Hour breakdown: planning 1h, CSV ingestion 1h, analysis modules 2h, LLM integration 1h, UI/presentation 2h, testing + skill + docs 1h. Total: 8h

## 8. If I had two more days

1. Implement cross-field logical inconsistency as its own finding category.
2. Cache the generated assessment per file (even a simple in-memory hash-based cache) so re-viewing a previous upload doesn't cost another API call.
3. Add a lightweight mobile responsive layout.
4. Expand test coverage for the consistency and outlier modules to the same standard as duplicates.js, including a real-sample sanity check step for each, not just unit tests.