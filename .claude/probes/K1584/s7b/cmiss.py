# K1584 s7b: why the corner rule (rule C) moves no pixel at 22 of K1595's 50 corner places. Per place (K1595's
# ruled_places.json row: maze, corner k, n5, n4, X, Y, under u, over o): the crossings of u under o (s5/cnt), the
# nearest to the place, and whether s7's table diff (s7/out/tab) holds a rule-C or rule-K place for it, with that
# place's device point and its distance to the corner place.
#   python cmiss.py [places = the 22, as maze:k,...]
import json, math, os, sys
H = os.path.dirname(os.path.abspath(__file__)); K = os.path.join(H, '..')
K95 = r'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1595-diag\.claude\probes\K1595\out\scan\ruled_places.json'
TWENTY2 = ('A_4:343,A_4:344,A_5:264,A_5:280,A_5:299,A_6:294,A_6:197,A_6:302,A_7:292,A_8:206,A_8:259,A_8:297,'
           'A_9:279,A_9:307,A_b:323,A_c:248,A_c:310,A_d:192,A_d:303,A_4:216,A_7:297,A_a:176')
want = set((sys.argv[1] if len(sys.argv) > 1 else TWENTY2).split(','))
_c, _t = {}, {}
def cnt(m):
    if m not in _c: _c[m] = json.load(open(os.path.join(K, 's5', 'cnt', f'{m}_s5d.json')))
    return _c[m]
def tab(m):
    if m not in _t:
        p = os.path.join(K, 's7', 'out', 'tab', f'{m}.json')
        _t[m] = json.load(open(p))['places'] if os.path.exists(p) else []
    return _t[m]
for mz, k, n5, n4, X, Y, u, o in json.load(open(K95)):
    if f'{mz}:{k}' not in want: continue
    C = cnt(mz)
    xs = [x for x in C['crossings'] if x['under'] == u and x['over'] == o]
    def dd(x):
        d = x.get('dev')
        return math.hypot(d[0] - X, d[1] - Y) if d else 1e9
    xs.sort(key=dd)
    T = [p for p in tab(mz) if p['c'] == u and p['x'] and p['x']['o'] == o]
    tl = ' '.join(f"{p['rule']}x{p['x']['i']}@{p['dev'][0]:.0f},{p['dev'][1]:.0f}(d{math.hypot(p['dev'][0] - X, p['dev'][1] - Y):.0f},off{p['x']['off']:+.2f},a{p['a0']:.2f}-{p['a1']:.2f})" for p in T)
    xl = ' '.join(f"x{x['i']}(d{dd(x):.0f})" for x in xs[:3])
    print(f'{mz} k{k:<4d} c{u}<c{o} at {X:.0f},{Y:.0f} n5 {n5:3d} | crossings {xl or "-"} | s7 tab {tl or "-"}')
