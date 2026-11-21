# Inbox

Drop the Tampermonkey CSVs here and the team pages (Dillon and Jim) and the Tech Metrics page update by themselves in about 2 minutes.

**How:** open https://github.com/ITG-Metrics/team-metrics/upload/main/inbox, drag the files in, and press **Commit changes**.

| File | Updates |
|---|---|
| `ontrac_pull_through_<date>.csv` | Metrics, weekly, last 30 days and the snapshot date on both team pages, the market leaders table and the Tech Metrics page |
| `medallia_surveys_<date>.csv` | tNPS surveys (Feedback tab and the Overview tNPS) on both team pages |
| `qc_progress_<date>.csv` | Monthly QCs on both team pages |
| `repeats_locked_<date>.json` | Repeats tab on both team pages (from the Tampermonkey repeats button 0.2.0+; account numbers are locked with the site passcode before the file is saved) |

**Never put here:** `ftr_repeats_…` CSVs (plain customer account numbers; use the locked file above or send it to Claude) or `roster_…` files (send to Claude).

Each file is checked first (BP-Ontrac totals, columns, scores, a big drop in techs or QCs). A file that fails changes nothing, is removed from the inbox, and the reason is written to [LAST_RUN.md](LAST_RUN.md); the run shows a red ✗ under the Actions tab. Then send that file to Claude.

What happened on the last run: [LAST_RUN.md](LAST_RUN.md).
