#!/usr/bin/env python3
"""Take the Tampermonkey CSVs dropped in inbox/ and merge them into the site data.

Run by .github/workflows/inbox.yml whenever a file lands in inbox/ (also works by hand):
    python3 tools/ingest.py inbox/

Files it understands (recognized by name):
  ontrac_pull_through_<date>*.csv   BP-Ontrac Team Metrics pull -> both team pages (metrics, weekly,
                                    last 30 days, prev_pull, snapshot line), market leaders table and
                                    data/market.json (Tech Metrics page)
  medallia_surveys_<date>*.csv      Medallia tNPS surveys -> both team pages' Feedback
  qc_progress_<date>*.csv           Catalyst QC progress -> both team pages' Monthly QCs

Refused on purpose:
  ftr_repeats_*.csv / anything with an account number column -> customer account numbers must never be
                                    committed; send repeats to Claude instead (it locks them).
  roster_*.csv                      roster changes need a person to look them over; send to Claude.

Every file is checked before anything is written. A file that fails a check changes nothing and the
reason is written to inbox/LAST_RUN.md (the run also ends with an error so GitHub shows a red X).
Processed and refused files are removed from inbox/.
"""
import csv
import datetime as dt
import glob
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import set_data as S  # noqa: E402

TEAMS = {'27746': 'dillon', '28717': 'jim'}
MARKETS = {'28718': 'Broward', '28716': 'Dade'}
EXCLUDE = {'7026'}                 # never shown
NOT_ON = {'dillon': {'7044'}}      # 7044 moved to Jim's team (Nov 10)
CHECK = ['total_jobs', 'tnps_surveys', 'ftr_total_jobs', 'ftr_fail_jobs', 'promoters', 'detractors', 'tu_eligible', 'tu_result']
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
QC_WHO = {'dillon': 'Dillon Defaria', 'jim': 'Jim Blanco Mitchell (and Dillon Defaria for 7044)'}


class Bad(Exception):
    pass


def now_et():
    # The sites' dates are Eastern time.
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo('America/New_York'))


def today():
    return now_et().date()


def nice(d):
    if isinstance(d, str):
        d = dt.date.fromisoformat(d)
    return f'{MON[d.month - 1]} {d.day}, {d.year}'


def fiscal_start(iso):
    d = dt.date.fromisoformat(iso)
    if d.day >= 22:
        return dt.date(d.year, d.month, 22).isoformat()
    y, m = (d.year, d.month - 1) if d.month > 1 else (d.year - 1, 12)
    return dt.date(y, m, 22).isoformat()


def fiscal_end(iso):
    s = dt.date.fromisoformat(fiscal_start(iso))
    y, m = (s.year, s.month + 1) if s.month < 12 else (s.year + 1, 1)
    return dt.date(y, m, 21).isoformat()


def num(v):
    try:
        return float(str(v or '').replace(',', '').replace('%', '').strip() or 0)
    except ValueError:
        return 0.0


def read_csv(path):
    raw = open(path, 'rb').read().decode('utf-8-sig')
    rows = list(csv.DictReader(io.StringIO(raw)))
    cols = list(rows[0].keys()) if rows else (next(csv.reader(io.StringIO(raw)), []) or [])
    return rows, cols


def write_rows(cols, rows):
    """set_data reads CSV files, so hand it a temp CSV."""
    import tempfile
    f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, newline='', encoding='utf-8')
    w = csv.DictWriter(f, fieldnames=cols, lineterminator='\n', extrasaction='ignore')
    w.writeheader()
    w.writerows(rows)
    f.close()
    return f.name


def same_period(a, b):
    # qc_month_period differs only in its sync time when the QCs didn't change
    strip = lambda rs: [{k: v for k, v in r.items() if k != 'synced'} for r in rs]  # noqa: E731
    return strip(a) == strip(b)


class Page:
    """One data file (data/<team>.js), loaded once, saved once at the end."""
    def __init__(self, team):
        self.path = os.path.join(ROOT, 'data', team + '.js')
        self.team = team
        _, parts = S.load(self.path)
        self.raw = parts['SC_RAW'][0]
        self.stamp = parts['SC_STAMP'][0]
        self.sets = {}
        self.new_stamp = None

    def rows(self, key):
        return self.sets.get(key, self.raw.get(key, []))

    def cols(self, key):
        rs = self.raw.get(key) or []
        return list(rs[0].keys()) if rs else []

    def save(self):
        # Leave datasets that came out the same alone, so a file already on the site changes nothing.
        self.sets = {k: v for k, v in self.sets.items() if [dict(r) for r in v[1]] != [dict(r) for r in self.raw.get(k, [])]}
        if 'qc_month_period' in self.sets and 'qc_month' not in self.sets and same_period(self.sets['qc_month_period'][1], self.raw.get('qc_month_period', [])):
            del self.sets['qc_month_period']
        if self.new_stamp and self.stamp.startswith(f'Snapshot of {self.new_stamp[0]} to {self.new_stamp[1]},') and not self.sets:
            self.new_stamp = None
        if not self.sets and not self.new_stamp:
            return False
        args = []
        tmp = []
        for k, (cols, rows) in self.sets.items():
            p = write_rows(cols, rows)
            tmp.append(p)
            args.append(f'{k}={p}')
        if self.new_stamp:
            args += ['--stamp'] + list(self.new_stamp)
        S.main([self.path] + args)
        for p in tmp:
            os.unlink(p)
        return True


# ------------------------------------------------------------------ BP-Ontrac
def do_ontrac(path, pages, state, log):
    rows, cols = read_csv(path)
    need = {'team_id', 'period_kind', 'period_start', 'period_end', 'period_label', 'tech_id'} | set(CHECK)
    if not rows or not need <= set(cols):
        raise Bad('this is not a BP-Ontrac pull from the Tampermonkey script (columns missing).')
    # 1. Totals check, the same one the script does: each period's techs must add up to BP-Ontrac's Totals row.
    per = {}
    for r in rows:
        per.setdefault((r['team_id'], r['period_kind'], r['period_start'], r['period_end']), []).append(r)
    for k, rs in per.items():
        tot = [r for r in rs if r['tech_id'] == '_team']
        if len(tot) != 1:
            raise Bad(f'team {k[0]} {k[1]} {k[2]}–{k[3]} has no Totals row.')
        for c in CHECK:
            s = sum(num(r[c]) for r in rs if r['tech_id'] != '_team')
            if abs(s - num(tot[0][c])) > 1e-6:
                raise Bad(f'team {k[0]} {k[2]}–{k[3]}: {c} adds up to {s:g} but BP-Ontrac\'s Totals say {tot[0][c]}.')
    month_rows = [r for r in rows if r['period_kind'] == 'month']
    if not month_rows:
        raise Bad('no fiscal month in this pull (tick the month in the script).')
    through = max(r['period_end'] for r in month_rows)

    # 2. Team pages.
    for team_id, who in TEAMS.items():
        new = [r for r in rows if r['team_id'] == team_id and r['tech_id'] != '_team' and r['tech_id'] not in EXCLUDE
               and r['tech_id'] not in NOT_ON.get(who, set())
               and not all(num(r[c]) == 0 for c in ('tu_eligible', 'tnps_surveys', 'ftr_total_jobs'))]
        if not new:
            log.append(f'- {who.title()}: not in this pull, left as it was.')
            continue
        pg = pages[who]
        MC = pg.cols('metrics')
        proj = lambda r: {c: r.get(c, '') for c in MC}  # noqa: E731
        old = pg.rows('metrics')
        nm = [proj(r) for r in new if r['period_kind'] == 'month']
        starts = {r['period_start'] for r in nm}
        # A "(to date)" month older than the pull's months that the pull doesn't close would keep partial numbers.
        open_old = {r['period_start'] for r in old if r['period_label'].endswith('(to date)')}
        stale = sorted(s for s in open_old if s not in starts and nm and s < min(starts))
        if stale:
            raise Bad(f'{who.title()}: the fiscal month starting {stale[0]} is still "(to date)" on the site, and this pull '
                      'doesn\'t include it closed. Pull again with "Also last closed fiscal month" ticked.')
        if len(nm):
            # sanity: about as many techs as the month had before
            for s in starts:
                before = sum(1 for r in old if r['period_start'] == s)
                after = sum(1 for r in nm if r['period_start'] == s)
                if before >= 4 and after < before * 0.6:
                    raise Bad(f'{who.title()}: only {after} techs for the month starting {s} (the site has {before}). '
                              'The pull looks incomplete.')
            old_open = [r for r in old if r['period_label'].endswith('(to date)')]
            new_open_end = max((r['period_end'] for r in nm if r['period_label'].endswith('(to date)')), default='')
            if old_open and (not new_open_end or max(r['period_end'] for r in old_open) < new_open_end):
                pg.sets['prev_pull'] = (MC, [dict(r) for r in old_open])   # "change since the last update"
            merged = [r for r in old if r['period_start'] not in starts] + nm
            merged.sort(key=lambda r: (r['period_start'], r['tech_id']))
            pg.sets['metrics'] = (MC, merged)
        l30 = [proj(r) for r in new if r['period_kind'] == 'last30']
        if l30:
            old_top, new_top = top_tech(pg.rows('last30')), top_tech(l30)
            pg.sets['last30'] = (pg.cols('last30') or MC, sorted(l30, key=lambda r: r['tech_id']))
            if old_top != new_top:
                log.append(f'- {who.title()}: top tech (last 30 days) changed from {old_top or "no winner"} to {new_top or "no winner"}.')
        nw = [proj(r) for r in new if r['period_kind'] == 'week']
        if nw:
            ws = {r['period_start'] for r in nw}
            allw = [r for r in pg.rows('weekly') if r['period_start'] not in ws] + nw
            keep = sorted({r['period_start'] for r in allw})[-9:]
            allw = [r for r in allw if r['period_start'] in keep]
            allw.sort(key=lambda r: (r['period_start'], r['tech_id']))
            pg.sets['weekly'] = (pg.cols('weekly') or MC, allw)
        m = re.match(r'Snapshot of (.+?) to (.+?), made (.+?)\.', pg.stamp)
        frm = m.group(1) if m else nice(min(r['period_start'] for r in pg.rows('metrics')))
        pg.new_stamp = (frm, nice(through), nice(today()))
        log.append(f'- {who.title()}: BP-Ontrac through {nice(through)} — {len(nm)} month rows, {len(nw)} week rows, '
                   f'{len(l30)} last-30-day rows.')

    # 3. Market leaders (team pages) and data/market.json (Tech Metrics page).
    mrows = [r for r in month_rows if r['team_id'] in MARKETS]
    if not mrows:
        log.append('- Markets: not in this pull, left as they were.')
        return
    mj = state['market_json']
    _, mparts = S.load(os.path.join(ROOT, 'data', 'market-leaders.js'))
    mk = state.get('market_csv') or mparts['SC_MARKET'][0]
    F = list(mk[0].keys())
    sup = {(r['market'], r['tech_id']): r['supervisor'] for r in mk}
    for m in mj['markets']:
        for t in mj['markets'][m]['roster']:
            sup.setdefault((m, t['id']), t['sup'])
    nmk = []
    for r in mrows:
        m = MARKETS[r['team_id']]
        if r['tech_id'] in ('_team',) or r['tech_id'] in EXCLUDE:
            continue
        o = {c: r.get(c, '') for c in F}
        o['market'] = m
        o['supervisor'] = sup.get((m, r['tech_id']), '')
        nmk.append(o)
    starts = {(o['market'], o['period_start']) for o in nmk}
    outm = [r for r in mk if (r['market'], r['period_start']) not in starts] + nmk
    outm.sort(key=lambda r: (r['market'], r['period_start'], r['tech_id']))
    state['market_csv'] = outm

    SRC = ["total_jobs", "installs", "tcs", "tu_result", "tu_eligible", "tool_usage", "promoters", "detractors",
           "tnps_surveys", "tnps_rate", "ftr_fail_jobs", "ftr_total_jobs", "ftr_pct", "pht_pass_pct",
           "total_appts", "met_appts", "met_rate", "rework_rate", "repeat_rate"]
    mdy = lambda iso: f'{iso[5:7]}/{iso[8:10]}/{iso[:4]}'  # noqa: E731
    for team_id, m in MARKETS.items():
        if m not in mj['markets']:
            continue
        mm = mj['markets'][m]
        ids = {t['id'] for t in mm['roster']}
        months = {f"{x['start'][6:]}-{x['start'][:2]}-{x['start'][3:5]}": x for x in mm['months']}
        got = [r for r in mrows if r['team_id'] == team_id]
        for s in sorted({r['period_start'] for r in got}):
            rs = [r for r in got if r['period_start'] == s]
            tot = [r for r in rs if r['tech_id'] == '_team'][0]
            months[s] = {'label': tot['period_label'].replace(' (to date)', '').strip(), 'start': mdy(s), 'end': mdy(tot['period_end']),
                         'team': [num(tot[c]) for c in SRC],
                         'techs': {r['tech_id']: [num(r[c]) for c in SRC] for r in sorted(rs, key=lambda r: r['tech_id'])
                                   if r['tech_id'] in ids}}
        mm['months'] = [months[k] for k in sorted(months)][-6:]
        log.append(f'- {m} market: through {nice(through)}, {len(mm["months"][-1]["techs"])} techs this month.')
    mj['pulled'] = nice(through)   # last day the BP-Ontrac data covers
    mj['made'] = nice(today())      # day the site was updated (market page: "Data through …, updated …")
    state['market_changed'] = True


def top_tech(rows):
    """The banner's winner: 40+ jobs, 5+ surveys, all three targets met; best FTR, then tNPS, then jobs."""
    best = None
    for r in rows:
        jobs, sv = num(r.get('total_jobs')), num(r.get('tnps_surveys'))
        tu_e, ftr_t = num(r.get('tu_eligible')), num(r.get('ftr_total_jobs'))
        if jobs < 40 or sv < 5 or not tu_e or not ftr_t:
            continue
        tu = num(r.get('tu_result')) / tu_e * 100
        tn = (num(r.get('promoters')) - num(r.get('detractors'))) / sv * 100
        ftr = (ftr_t - num(r.get('ftr_fail_jobs'))) / ftr_t * 100
        if tu < 99.5 or tn < 95 or ftr < 93:
            continue
        k = (ftr, tn, jobs)
        if best is None or k > best[0]:
            best = (k, r['tech_id'])
    return best[1] if best else None


# ------------------------------------------------------------------ Medallia
def do_medallia(path, pages, log):
    rows, cols = read_csv(path)
    if not rows or not {'date', 'tech_id', 'team', 'survey_id', 'score', 'comment'} <= set(cols):
        raise Bad('this is not a Medallia surveys file from the Tampermonkey script (columns missing).')
    for r in rows:
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', r['date']) or not r['survey_id'].strip():
            raise Bad(f'a row has a bad date or no survey ID (survey {r.get("survey_id")!r}, date {r.get("date")!r}).')
        try:
            sc = int(r['score'])
        except ValueError:
            raise Bad(f'survey {r["survey_id"]} has a score that isn\'t a number ({r["score"]!r}).')
        if not 0 <= sc <= 10:
            raise Bad(f'survey {r["survey_id"]} has a score of {sc}.')
    for team, who in (('Dillon', 'dillon'), ('Jim', 'jim')):
        nn = [r for r in rows if r['team'] == team]
        if not nn:
            continue
        pg = pages[who]
        old = pg.rows('feedback')
        by = {r['survey_id']: dict(r) for r in old}
        added = 0
        for r in nn:
            sid = r['survey_id'].strip()
            if sid not in by:
                added += 1
            keep_c = by.get(sid, {}).get('comment', '')
            by[sid] = {'date': r['date'], 'tech_id': r['tech_id'].strip(), 'survey_id': sid, 'score': str(int(r['score'])),
                       'comment': r['comment'] if r['comment'] else keep_c}
        newest = max(r['date'] for r in by.values())
        frm = fiscal_start(newest)   # the Feedback tab is this fiscal month
        out = sorted((r for r in by.values() if r['date'] >= frm), key=lambda r: (r['date'], int(re.sub(r'\D', '', r['survey_id']) or 0)), reverse=True)
        pg.sets['feedback'] = (['date', 'tech_id', 'survey_id', 'score', 'comment'], out)
        log.append(f'- {team}: surveys through {nice(newest)} — {added} new, {len(out)} this fiscal month.')


# ------------------------------------------------------------------ Catalyst QC progress
def do_qc(path, pages, log):
    rows, cols = read_csv(path)
    if not rows or not {'date', 'tech_id', 'page', 'qc_type'} <= set(cols):
        raise Bad('this is not a QC progress file from the Tampermonkey script (columns missing).')
    m = re.search(r'(\d{4}-\d{2}-\d{2})', os.path.basename(path))
    ref = m.group(1) if m else max(r['date'] for r in rows)
    start, end = fiscal_start(ref), fiscal_end(ref)
    for team, who in (('Dillon', 'dillon'), ('Jim', 'jim')):
        nn = [r for r in rows if r['page'] == team and start <= r['date'] <= end]
        pg = pages[who]
        before = len(pg.rows('qc_month')) if (pg.rows('qc_month_period') or [{}])[0].get('start') == start else 0
        if before >= 5 and len(nn) < before * 0.6:
            raise Bad(f'{team}: only {len(nn)} QCs this month in the file, the site has {before}. The pull looks incomplete.')
        out = sorted(({'date': r['date'], 'tech_id': r['tech_id'].strip(), 'qc_type': r['qc_type']} for r in nn),
                     key=lambda r: (r['date'], r['tech_id']), reverse=True)
        pg.sets['qc_month'] = (['date', 'tech_id', 'qc_type'], out)
        pg.sets['qc_month_period'] = (['start', 'end', 'synced', 'who'], [{
            'start': start, 'end': end, 'synced': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:00Z'),
            'who': (pg.rows('qc_month_period') or [{}])[0].get('who') or QC_WHO[who]}])
        log.append(f'- {team}: {len(out)} QCs this fiscal month ({nice(start)} – {nice(end)}), {len(out) - before:+d}.')


# ------------------------------------------------------------------ main
def main(inbox):
    files = sorted(f for f in glob.glob(os.path.join(inbox, '*')) if os.path.isfile(f) and not os.path.basename(f).upper().startswith(('README', 'LAST_RUN')))
    stamp = now_et()
    report = [f'# Last inbox run: {stamp:%b %d, %Y %I:%M %p} (Eastern)', '']
    if not files:
        print('inbox is empty')
        return 0
    pages = {w: Page(w) for w in ('dillon', 'jim')}
    mpath = os.path.join(ROOT, 'data', 'market.json')
    state = {'market_json': json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {'markets': {}}}
    failed = 0
    # Oldest pulls first, so the newest file wins when several of the same kind are dropped together.
    for f in sorted(files, key=lambda p: (re.search(r'\d{4}-\d{2}-\d{2}', os.path.basename(p)) or re.search('', '')).group(0) + os.path.basename(p)):
        name = os.path.basename(f)
        low = name.lower()
        log = []
        try:
            head = open(f, 'rb').read(4096).decode('utf-8', 'replace').split('\n', 1)[0].lower()
            if low.startswith('ftr_repeats') or 'accountnumber' in head.replace(' ', '') or 'account_number' in head or 'account #' in head:
                raise Bad('this file has customer account numbers, which must never go on GitHub. It was removed from the '
                          'inbox without being used. Send repeats to Claude instead.')
            if low.startswith('roster_'):
                raise Bad('roster files need a person to look over the changes. Send them to Claude.')
            if not low.endswith('.csv'):
                raise Bad('only the Tampermonkey CSV files go in the inbox.')
            if low.startswith('ontrac_pull'):
                snap = (json.dumps({k: p.sets for k, p in pages.items()}, default=str), json.dumps(state, default=str))
                try:
                    do_ontrac(f, pages, state, log)
                except Exception:
                    for k, p in pages.items():   # undo anything this file set
                        p.sets = {kk: tuple(v) for kk, v in json.loads(snap[0])[k].items()}
                    state.clear(); state.update(json.loads(snap[1]))
                    raise
            elif low.startswith('medallia_surveys'):
                do_medallia(f, pages, log)
            elif low.startswith('qc_progress'):
                do_qc(f, pages, log)
            else:
                raise Bad('the name doesn\'t match a known file (ontrac_pull_through_…, medallia_surveys_…, qc_progress_…).')
            report.append(f'## ✅ {name}')
            report += log
        except Bad as e:
            failed += 1
            report += [f'## ❌ {name}', f'- Not used: {e}']
        except Exception as e:  # anything unexpected: report it, change nothing for this file
            failed += 1
            report += [f'## ❌ {name}', f'- Not used: unexpected problem ({type(e).__name__}: {e}). Send this file to Claude.']
        report.append('')
        os.remove(f)
    changed = []
    for w, p in pages.items():
        if p.save():
            changed.append(f'data/{w}.js')
    if state.get('market_csv') and state['market_csv'] == S.load(os.path.join(ROOT, 'data', 'market-leaders.js'))[1]['SC_MARKET'][0]:
        state['market_csv'] = None
    if state.get('market_changed') and os.path.exists(mpath) and json.load(open(mpath, encoding='utf-8')) == state['market_json']:
        state['market_changed'] = False
    if state.get('market_csv'):
        p = write_rows(list(state['market_csv'][0].keys()), state['market_csv'])
        S.main([os.path.join(ROOT, 'data', 'market-leaders.js'), f'market={p}'])
        os.unlink(p)
        changed.append('data/market-leaders.js')
    if state.get('market_changed'):
        json.dump(state['market_json'], open(mpath, 'w', encoding='utf-8'), separators=(',', ':'))
        changed.append('data/market.json')
    report.append('Changed: ' + (', '.join(changed) if changed else 'nothing'))
    open(os.path.join(inbox, 'LAST_RUN.md'), 'w', encoding='utf-8').write('\n'.join(report) + '\n')
    print('\n'.join(report))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('\n'.join(report) + '\n')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'inbox')))
