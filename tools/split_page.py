#!/usr/bin/env python3
"""Split built scorecard pages into page + data files.

The builder (build_snapshot.txt) makes one big self-contained HTML per team,
with the data (const RAW = {...}) and d3 inlined. This moves those out so a
data refresh only changes small files:

  data/<team>.js        window.SC_RAW   = this team's data (everything but market)
                        window.SC_STAMP = the "Snapshot of ..." line
  data/market-leaders.js window.SC_MARKET = the market leaders table (shared)
  vendor/d3.min.js      d3, shared by both pages

Usage (from the repo root, after building):
  python3 tools/split_page.py index.html:dillon jim.html:jim

Each HTML is rewritten in place. Running it on an already-split page stops
with an error, so build first.
"""
import json
import os
import re
import sys

D3_MARK = '// https://d3js.org'
RAW_MARK = 'const RAW = '
STAMP_RE = re.compile(r'<p class="snap-stamp">([^<]*)</p>')


def js_file(path, body):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(body)


def split(html_path, team, root, market_seen):
    s = open(html_path, encoding='utf-8').read()
    if RAW_MARK + '{' not in s:
        sys.exit(f'{html_path}: no inline RAW data (already split?). Rebuild it first.')

    # 1. data
    i = s.index(RAW_MARK) + len(RAW_MARK)
    raw, end = json.JSONDecoder().raw_decode(s, i)
    market = raw.pop('market', [])
    if market_seen and market_seen[0] != market:
        sys.exit('market data differs between pages; build both from the same market.csv')
    market_seen[:] = [market]
    s = s[:i] + "Object.assign({}, window.SC_RAW, { market: window.SC_MARKET || [] })" + s[end:]

    # 2. stamp: keep the text as a fallback, then overwrite it from the data file
    m = STAMP_RE.search(s)
    if not m:
        sys.exit(f'{html_path}: snap-stamp not found')
    stamp = m.group(1)
    s = s[:m.end()] + ("<script>if (window.SC_STAMP) document.currentScript"
                       ".previousElementSibling.textContent = window.SC_STAMP;</script>") + s[m.end():]

    # 3. d3 -> vendor file
    a = s.index(D3_MARK)
    tag_start = s.rindex('<script', 0, a)
    tag_end = s.index('</script>', a) + len('</script>')
    d3 = s[a:s.index('</script>', a)]
    s = s[:tag_start] + '<script src="vendor/d3.min.js"></script>' + s[tag_end:]

    # 4. load the data files right before the main script (the one holding RAW)
    j = s.rindex('<script', 0, s.index(RAW_MARK))
    s = (s[:j] + '<script src="data/market-leaders.js"></script>'
         f'<script src="data/{team}.js"></script>' + s[j:])

    js_file(os.path.join(root, 'data', f'{team}.js'),
            '/* ' + team + ' scorecard data, written by tools/split_page.py */\n'
            'window.SC_STAMP = ' + json.dumps(stamp) + ';\n'
            'window.SC_RAW = ' + json.dumps(raw) + ';\n')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(s)
    return d3


def main(args):
    if not args:
        sys.exit(__doc__)
    root = os.getcwd()
    market_seen, d3s = [], set()
    for a in args:
        path, _, team = a.partition(':')
        if not team:
            sys.exit(f'give each page as file:team, e.g. index.html:dillon (got {a})')
        d3s.add(split(path, team, root, market_seen))
        print(f'{path}: {os.path.getsize(path):,} bytes; data/{team}.js: '
              f'{os.path.getsize(os.path.join(root, "data", team + ".js")):,} bytes')
    if len(d3s) != 1:
        sys.exit('pages embed different d3 builds')
    js_file(os.path.join(root, 'vendor', 'd3.min.js'), d3s.pop())
    js_file(os.path.join(root, 'data', 'market-leaders.js'),
            '/* market leaders, shared by both pages, written by tools/split_page.py */\n'
            'window.SC_MARKET = ' + json.dumps(market_seen[0]) + ';\n')
    print(f'data/market-leaders.js: {os.path.getsize("data/market-leaders.js"):,} bytes; '
          f'vendor/d3.min.js: {os.path.getsize("vendor/d3.min.js"):,} bytes')


if __name__ == '__main__':
    main(sys.argv[1:])
