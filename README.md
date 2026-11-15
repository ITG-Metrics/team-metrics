# team-metrics
Team scorecards: Dillon (index.html) and Jim (jim.html).
https://itg-metrics.github.io/team-metrics/

## Files
- `index.html`, `jim.html`: the page code (layout, charts, translations).
- `data/dillon.js`, `data/jim.js`: each team's data and the "Snapshot of ..." line.
- `data/market-leaders.js`: market leaders table, shared by both pages.
- `vendor/d3.min.js`: chart library, shared by both pages.

A data refresh only needs to change the files in `data/`.
After rebuilding the full pages with the builder, run
`python3 tools/split_page.py index.html:dillon jim.html:jim` to split them again.
