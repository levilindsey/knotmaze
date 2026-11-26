# K1584 s7: every changed place s6a -> s7a from fdall's framediffs (out/fd/<m>_t<thr>.json), matched to the mirror's
# places (out/x.json: rule K / rule C, by box overlap with a pad), and the named places checked for identity.
#   python chgplaces.py [thr=1] [pad=6]   -> out/chg_places.json, a table, and sheet7 place args in out/chg_args.txt
import sys, json, os
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
thr = sys.argv[1] if len(sys.argv) > 1 else '1'; pad = int(sys.argv[2]) if len(sys.argv) > 2 else 6
X = json.load(open(os.path.join(H, 'out', 'x.json')))
RIGHT = [('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
         ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)]
WRONG = [('A_b', 75), ('A_8', 65), ('A_5', 277)]
STEMS = [('A_a', 1600, 1619), ('A_c', 1585, 1359), ('A_6', 1362, 1615), ('A_5', 1270, 747), ('A_b', 1370, 554),
         ('A_6', 1269, 326), ('A_d', 2199, 952)]
cnt = {}
def dev(m, i):
    if m not in cnt: cnt[m] = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}
    return cnt[m][i]['dev']
rows = []; tot = {'px': 0, 'boxes': 0}
fd = os.path.join(H, 'out', 'fd')
for f in sorted(os.listdir(fd)):
    if not f.endswith(f'_t{thr}.json'): continue
    m = f[:3]; d = json.load(open(os.path.join(fd, f)))
    for b in d['boxes']:
        x0, y0 = b['x'] - b['w'] // 2, b['y'] - b['h'] // 2; x1, y1 = x0 + b['w'], y0 + b['h']
        hits = [p for p in X if p['m'] == m and p['bbox'][0] - pad <= x1 and p['bbox'][2] + pad >= x0 and p['bbox'][1] - pad <= y1 and p['bbox'][3] + pad >= y0]
        rows.append({'m': m, 'box': [x0, y0, x1, y1], 'px': b['px'], 'dLum': b['dLum'], 'cross': b['cross'], 'site': b['site'],
                     'mirror': [f"{p['rule']}{p['x']}c{p['c']}:{p['n']}" for p in hits]})
        tot['px'] += b['px']; tot['boxes'] += 1
print(f"threshold {thr}: {tot['boxes']} boxes, {tot['px']} px")
un = [r for r in rows if not r['mirror']]
print(f"matched to a mirror place: {len(rows) - len(un)}; unmatched: {len(un)}")
for r in un: print('  UNMATCHED', r)
mm = set((p['m'], p['x'], p['rule']) for p in X)
seen = set()
for r in rows:
    for s in r['mirror']: seen.add((r['m'], s))
miss = [p for p in X if not any(r['m'] == p['m'] and any(s.startswith(f"{p['rule']}{p['x']}c") for s in r['mirror']) for r in rows)]
print(f"mirror places with no captured change: {len(miss)}")
for p in miss: print('  NOCAP', p['m'], p['rule'], p['x'], p['n'], p['bbox'])
def near(m, X0, Y0, R=24): return [r for r in rows if r['m'] == m and r['box'][0] - R <= X0 <= r['box'][2] + R and r['box'][1] - R <= Y0 <= r['box'][3] + R]
print('right loops (must be identical):')
for m, i in RIGHT:
    X0, Y0 = dev(m, i); n = near(m, X0, Y0); print(f"  {m} x{i} ({X0:.0f},{Y0:.0f}): {'IDENTICAL' if not n else 'CHANGED ' + str([(q['box'], q['px']) for q in n])}")
print('wrong loops (must change):')
for m, i in WRONG:
    X0, Y0 = dev(m, i); n = near(m, X0, Y0, 40); print(f"  {m} x{i}: {sum(q['px'] for q in n)} px {[q['box'] for q in n]}")
print('stems (must change):')
for m, X0, Y0 in STEMS:
    n = near(m, X0, Y0, 40); print(f"  {m} {X0},{Y0}: {sum(q['px'] for q in n)} px {[(q['box'], q['mirror']) for q in n]}")
json.dump(rows, open(os.path.join(H, 'out', f'chg_places_t{thr}.json'), 'w'), indent=0)
with open(os.path.join(H, 'out', f'chg_args_t{thr}.txt'), 'w') as o:
    for r in sorted(rows, key=lambda r: (r['m'], -r['px'])):
        b = r['box']; lab = (r['mirror'][0] if r['mirror'] else 'none').replace(':', '_') + f"_{r['px']}px"
        o.write(f"{r['m']}:@:{(b[0] + b[2]) // 2}:{(b[1] + b[3]) // 2}:{lab}:{b[0]};{b[1]};{b[2] - 1};{b[3] - 1}\n")
