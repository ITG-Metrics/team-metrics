#!/usr/bin/env python3
"""Read or replace datasets in a team page's data file, no rebuild needed.

The data files hold the same rows as the CSVs (every value a string, columns
in CSV order), so a data refresh is: write new CSVs, run this, push.

Replace keys (each KEY=CSV becomes that dataset, rows in file order):
  python3 tools/set_data.py data/dillon.js metrics=metrics.csv weekly=weekly.csv \
      last30=last30.csv prev_pull=prev_pull.csv --stamp "May 22, 2026" "Nov 14, 2026" "Nov 16, 2026"
  python3 tools/set_data.py data/market-leaders.js market=market.csv

  --stamp FROM TO MADE rewrites the "Snapshot of FROM to TO, made MADE." line.

Export every dataset to CSVs (to start a refresh from the live data):
  python3 tools/set_data.py data/dillon.js --export out_dir/

Keys in data/<team>.js: metrics, weekly, coaching, last30, showcase, feedback,
qc, repeats, repeats_lock, repeats_other, qc_month, qc_month_period, prev_pull.
data/market-leaders.js holds one dataset, market. Photo columns hold site paths
(qc-photos/<id>.jpg, showcase/<id>.jpg), not dashboard /_blob/ urls.
repeats_lock is a JSON object list; set it with KEY=file.json (a JSON list).
"""
import csv
import json
import os
import sys

VARS = {'SC_RAW': 'window.SC_RAW = ', 'SC_MARKET': 'window.SC_MARKET = ', 'SC_STAMP': 'window.SC_STAMP = '}


def load(path):
    s = open(path, encoding='utf-8').read()
    out = {}
    for name, prefix in VARS.items():
        i = s.find(prefix)
        if i < 0:
            continue
        j = i + len(prefix)
        val, end = json.JSONDecoder().raw_decode(s, j)
        out[name] = (val, j, end)
    return s, out


def read_rows(path):
    if path.endswith('.json'):
        v = json.load(open(path, encoding='utf-8'))
        if not isinstance(v, list):
            sys.exit(f'{path}: expected a JSON list')
        return v
    with open(path, newline='', encoding='utf-8-sig') as f:
        return [dict(r) for r in csv.DictReader(f)]


def main(a):
    if len(a) < 2:
        sys.exit(__doc__)
    path, rest = a[0], a[1:]
    s, parts = load(path)
    is_market = 'SC_MARKET' in parts
    if not parts.get('SC_RAW') and not is_market:
        sys.exit(f'{path}: not a scorecard data file')

    if rest[0] == '--export':
        out = rest[1] if len(rest) > 1 else '.'
        os.makedirs(out, exist_ok=True)
        data = {'market': parts['SC_MARKET'][0]} if is_market else parts['SC_RAW'][0]
        for k, rows in data.items():
            if rows and all(isinstance(r, dict) and all(isinstance(x, str) for x in r.values()) for r in rows) \
                    and k != 'repeats_lock':
                cols = list(rows[0].keys())
                for r in rows:
                    cols += [c for c in r if c not in cols]
                with open(os.path.join(out, k + '.csv'), 'w', newline='', encoding='utf-8') as f:
                    w = csv.DictWriter(f, fieldnames=cols)
                    w.writeheader()
                    w.writerows(rows)
            else:
                json.dump(rows, open(os.path.join(out, k + '.json'), 'w'))
            print(f'{k}: {len(rows)} rows')
        if 'SC_STAMP' in parts:
            print('stamp:', parts['SC_STAMP'][0])
        return

    sets, stamp, i = {}, None, 0
    while i < len(rest):
        x = rest[i]
        if x == '--stamp':
            if i + 3 >= len(rest):
                sys.exit('--stamp needs FROM TO MADE')
            stamp = f'Snapshot of {rest[i+1]} to {rest[i+2]}, made {rest[i+3]}. This copy does not update by itself.'
            i += 4
            continue
        k, eq, f = x.partition('=')
        if not eq:
            sys.exit(f'expected KEY=file, got {x}')
        sets[k] = read_rows(f)
        i += 1

    if is_market:
        bad = set(sets) - {'market'}
        if bad:
            sys.exit(f'{path} only holds market (got {sorted(bad)})')
        new_val = sets.get('market', parts['SC_MARKET'][0])
        val, j, end = parts['SC_MARKET']
        s = s[:j] + json.dumps(new_val) + s[end:]
    else:
        raw, j, end = parts['SC_RAW']
        unknown = [k for k in sets if k not in raw]
        if unknown:
            sys.exit(f'unknown keys {unknown}; known: {list(raw)}')
        for k, v in sets.items():
            raw[k] = v
        s = s[:j] + json.dumps(raw) + s[end:]
        if stamp:
            _, sj, send = load_stamp(s)
            s = s[:sj] + json.dumps(stamp) + s[send:]
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(s)
    for k, v in sets.items():
        print(f'{k}: {len(v)} rows')
    if stamp:
        print('stamp:', stamp)


def load_stamp(s):
    p = VARS['SC_STAMP']
    i = s.find(p)
    if i < 0:
        sys.exit('no SC_STAMP in this file')
    j = i + len(p)
    v, end = json.JSONDecoder().raw_decode(s, j)
    return v, j, end


if __name__ == '__main__':
    main(sys.argv[1:])
