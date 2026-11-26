# K1584 s5: tile specs for tiles.py. python specs.py <newTag> [cntSuffix=s5d]
# Writes spec_sides27.json (A_3's 27 s4 no-gap sides: s4g | s5a | <newTag>), spec_13.json (s4's 13 darker places:
# s3b | s4g | <newTag>), spec_named.json (the named joint sites and the six item 2/3 crossings: s4g | <newTag>),
# spec_left.json (every side still reading closed in cnt/<m>_<cntSuffix>.json: s4g | <newTag>).
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__)); K = os.path.dirname(here)
new = sys.argv[1]; sfx = sys.argv[2] if len(sys.argv) > 2 else 's5d'
D = {'s3b': os.path.join(K, 's3', 'out', 's3b'), 's4g': os.path.join(K, 's4', 'out', 's4g'),
     's5a': os.path.join(here, 'out', 's5a'), new: os.path.join(here, 'out', new)}
def im(tag, m): return os.path.join(D[tag], m, 'gf_b2.png')
def df(t0, t1, m): return 'DIFF:' + im(t0, m) + '|' + im(t1, m)
_c = {}
def cnt(m, s):
    k = (m, s)
    if k not in _c: _c[k] = {x['i']: x for x in json.load(open(os.path.join(K, s, 'cnt', f'{m}_{s if s != "s5" else sfx}.json')))['crossings']}
    return _c[k]
OY = 25  # the cnt json's dev points (and sites_gf.json's x/y) sit 25 px above the capture's pixels
def dev(m, i): d = cnt(m, 's4')[i]['dev']; return [d[0], d[1] + OY]
# 1. the 27 A_3 sides
rows = []
for ln in open(os.path.join(K, 's4', 'counts_s4_list.md')):
    q = re.match(r'(A_3) (closed|weak) x(\d+) dir (-?1) lat (-?1)', ln)
    if not q: continue
    m, kind, i, d, l = q.group(1), q.group(2), int(q.group(3)), int(q.group(4)), int(q.group(5))
    cx, cy = dev(m, i)
    path = next((b['path'] + ' %.2f' % b['keepM'] for b in cnt(m, 's5')[i]['borders'] if b['dir'] == d and b['lat'] == l), '?')
    rows.append([f'{m} x{i} d{d} l{l}\ns4 {kind}\ns5 {path}', [[im(t, m), cx, cy, t] for t in ('s4g', new)] + [[df('s4g', new, m), cx, cy, 'diff']]])
json.dump(rows, open(os.path.join(here, 'spec_sides27.json'), 'w'))
# 2. the 13 darker places of s4 (s3b -> s4f)
P13 = [('A_4', 2208, 752, 'x27 j127'), ('A_4', 1424, 1152, 'x362 t39e'), ('A_7', 1312, 720, 'x359 j85'), ('A_c', 1440, 512, 'x235 j77'),
       ('A_d', 1632, 1648, 'x75 j93'), ('A_d', 2016, 1248, 'x42 t3e'), ('D_2', 1664, 1552, 'x153 j116'), ('D_4', 1504, 1280, 'x140 j52'),
       ('D_7', 1600, 1552, 'x102 j73'), ('D_7', 2336, 336, 'x271 j69'), ('D_8', 1712, 1408, 'x227 j39'), ('D_9', 1840, 624, 'x262 t18e'),
       ('D_a', 2192, 1184, 'x268 j65')]
json.dump([[f'{m} {lb}', [[im(t, m), x, y, t] for t in ('s3b', 's4g', new)] + [[df('s3b', new, m), x, y, 'diff s3b']]] for m, x, y, lb in P13], open(os.path.join(here, 'spec_13.json'), 'w'))
# 3. named joint sites + the six crossings
rows = []
NS = [('A_3', s) for s in ('j15', 'j22', 't65s', 'j88', 't80s', 't81s', 't57e', 'j148')] + [('A_4', 't84e'), ('A_c', 'j104')]
for m, s in NS:
    st = {q['site']: q for q in json.load(open(os.path.join(D[new], m, 'sites_gf.json')))['sites']}[s]
    rows.append([f'{m} {s}', [[im(t, m), st['x'], st['y'] + OY, t] for t in ('s4g', new)] + [[df('s4g', new, m), st['x'], st['y'] + OY, 'diff']]])
for i in (195, 338, 37, 303, 227, 132):
    cx, cy = dev('A_3', i)
    rows.append([f'A_3 x{i}', [[im(t, 'A_3'), cx, cy, t] for t in ('s4g', new)] + [[df('s4g', new, 'A_3'), cx, cy, 'diff']]])
json.dump(rows, open(os.path.join(here, 'spec_named.json'), 'w'))
# 4. what still reads closed
rows = []
for f in sorted(os.listdir(os.path.join(here, 'cnt'))):
    if not f.endswith(f'_{sfx}.json'): continue
    m = f[:3]
    for x in json.load(open(os.path.join(here, 'cnt', f)))['crossings']:
        for b in x['borders']:
            k = b['keepM']
            if b['path'] in ('closed', 'flag', 'stolen', 'none') or (b['path'] in ('scale', 'window', 'full') and k is not None and k == k and k > 0.8):
                rows.append([f"{m} x{x['i']} d{b['dir']} l{b['lat']}\n{b['path']} {b['keepM']}", [[im(t, m), x['dev'][0], x['dev'][1] + OY, t] for t in ('s4g', new)] + [[df('s4g', new, m), x['dev'][0], x['dev'][1] + OY, 'diff']]])
json.dump(rows, open(os.path.join(here, 'spec_left.json'), 'w'))
print('ok', len(rows), 'left')


