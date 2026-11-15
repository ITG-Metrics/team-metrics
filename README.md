# team-metrics
Team scorecards: Dillon (index.html) and Jim (jim.html).
https://itg-metrics.github.io/team-metrics/

## Files
- `index.html`, `jim.html`: the page code (layout, charts, translations).
- `data/dillon.js`, `data/jim.js`: each team's data and the "Snapshot of ..." line.
- `data/market-leaders.js`: market leaders table, shared by both pages.
- `vendor/d3.min.js`: chart library, shared by both pages.

A data refresh only needs to change the files in `data/`:
- `python3 tools/set_data.py data/dillon.js --export out/` writes the current data to CSVs.
- `python3 tools/set_data.py data/dillon.js metrics=metrics.csv weekly=weekly.csv last30=last30.csv prev_pull=prev_pull.csv --stamp "May 22, 2026" "Nov 14, 2026" "Nov 16, 2026"` replaces those datasets (same for `data/jim.js`; `data/market-leaders.js market=market.csv`).

Code changes go straight into index.html and jim.html (they are the current code).
If the pages are ever rebuilt whole with the old builder, run
`python3 tools/split_page.py index.html:dillon jim.html:jim` afterwards to split them again.
