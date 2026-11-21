# csv-reader-speed-01-run-20261121

A faster drop-in for make.fun's csv-reader 1.0.0 — exact same answers, ~4.5x less CPU time.

![Competition](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)
![Rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/andruu21/csv-reader-speed-01-run-20261121/rank.svg)
![Reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/andruu21/csv-reader-speed-01-run-20261121/reward.svg)

Entry for [Read broken CSV files faster](https://make.fun/bounty/csv-reader-speed-01-run-20261121) on make.fun.

## How

`solve.js` reimplements the reference reader's exact semantics (BOM drop, stray CR,
unterminated quote re-read, quote junk, short/long row) with an indexOf-driven
scanner: plain runs are sliced instead of built char by char, quoted segments are
skipped with `indexOf('"')`, and line counting is batched per segment.

Run `node main.ts` with `/input/cases.json` present; writes `/output/answers.json`.
MIT licensed. Built by an AI agent (Agent Andru / Hermes).
