# K1584 s8: every changed place s7a -> s8a from post8's framediffs (out/fd/<m>_<pair>_t<thr>.json), each named by the
# mirror place it was predicted at (variant d: A_6 k197, A_d k148; anything else is UNEXPECTED), plus the bindings'
# places: the twelve right loops (s6a -> s8a, must be identical), the three wrong loops and the seven stems (s7a -> s8a).
#   python chg8.py [thr=1]   -> out/chg8_t<thr>.json, a table, and sheet8 place args in out/chg8_args_t<thr>.txt
import sys, json, os
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
thr = sys.argv[1] if len(sys.argv) > 1 else '1'
RIGHT = [('A_3', 49), ('D_9', 264), ('A_6', 119), ('A_3', 102), ('A_c', 75), ('A_3', 192), ('A_7', 81), ('A_d', 241),
         ('A_c', 102), ('A_7', 158), ('A_4', 343), ('A_4', 5)]
WRONG = [('A_b', 75), ('A_8', 65), ('A_5', 277)]
STEMS = [('A_a', 1600, 1619), ('A_c', 1585, 1359), ('A_6', 1362, 1615), ('A_5', 1270, 747), ('A_b', 1370, 554),
         ('A_6', 1269, 326), ('A_d', 2199, 952)]
PRED = [('A_6', 'k197', 1367, 1599), ('A_d', 'k148', 2195, 960)]  # corner points from pxwhy's corners line (pw_d_*.txt)
_c, _t = {}, {}
def dev(m, i):
    if m not in _c: _c[m] = {x['i']: x for x in json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))['crossings']}
    return _c[m][i]['dev']
def tight(m, k):
    if m not in _t: _t[m] = {b['k']: b for b in json.load(open(os.path.join(K, 's6', 'tight', m + '.json')))['tight']}
    return _t[m][k]['dev']
def boxes(pair):
    rows = []
    fd = os.path.join(H, 'out', 'fd')
    for f in sorted(os.listdir(fd)):
        if not f.endswith(f'_{pair}_t{thr}.json'): continue
        m = f[:3]; d = json.load(open(os.path.join(fd, f)))
        for b in d['boxes']:
            x0, y0 = b['x'] - b['w'] // 2, b['y'] - b['h'] // 2
            rows.append({'m': m, 'box': [x0, y0, x0 + b['w'], y0 + b['h']], 'px': b['px'], 'dLum': b['dLum'], 'cross': b['cross'], 'site': b['site']})
    return rows
def near(rows, m, X0, Y0, R):
    return [r for r in rows if r['m'] == m and r['box'][0] - R <= X0 <= r['box'][2] + R and r['box'][1] - R <= Y0 <= r['box'][3] + R]
rows = boxes('s7s8'); r6 = boxes('s6s8')
print(f"s7a -> s8a, threshold {thr}: {len(rows)} boxes, {sum(r['px'] for r in rows)} px")
for r in rows:
    r['pred'] = [f'{m} {k}' for m, k, X0, Y0 in PRED if m == r['m'] and r in near(rows, m, X0, Y0, 40)]
    print(f"  {r['m']} box {r['box']} {r['px']} px dLum {r['dLum']} cross {r['cross']} site {r['site']}: {r['pred'] or 'UNEXPECTED'}")
for m, k, X0, Y0 in PRED:
    n = near(rows, m, X0, Y0, 40); print(f"  predicted {m} {k}: {'CHANGED ' + str(sum(q['px'] for q in n)) + ' px' if n else 'NO CAPTURED CHANGE'}")
print('right loops, s6a -> s8a (must be identical):')
for m, i in RIGHT:
    X0, Y0 = dev(m, i); n = near(r6, m, X0, Y0, 24)
    print(f"  {m} x{i} ({X0:.0f},{Y0:.0f}): {'IDENTICAL' if not n else 'CHANGED ' + str([(q['box'], q['px']) for q in n])}")
print('wrong loops, s7a -> s8a:')
for m, i in WRONG:
    X0, Y0 = dev(m, i); n = near(rows, m, X0, Y0, 40); print(f"  {m} x{i}: {sum(q['px'] for q in n)} px {[q['box'] for q in n]}")
print('stems, s7a -> s8a:')
for m, X0, Y0 in STEMS:
    n = near(rows, m, X0, Y0, 40); print(f"  {m} {X0},{Y0}: {sum(q['px'] for q in n)} px {[q['box'] for q in n]}")
json.dump(rows, open(os.path.join(H, 'out', f'chg8_t{thr}.json'), 'w'), indent=0)
with open(os.path.join(H, 'out', f'chg8_args_t{thr}.txt'), 'w') as o:
    for r in sorted(rows, key=lambda r: (r['m'], -r['px'])):
        b = r['box']; lab = (r['pred'][0].split()[1] if r['pred'] else 'unexp') + f"_{r['px']}px"
        o.write(f"{r['m']}:@:{(b[0] + b[2]) // 2}:{(b[1] + b[3]) // 2}:{lab}:{b[0]};{b[1]};{b[2] - 1};{b[3] - 1}\n")
