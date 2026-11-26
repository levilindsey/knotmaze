# K1627 s1: junctions with an arm that passes under a crossing near the junction (the arm's chain is the under
# chain, the crossing within --reach halfwidths of arc of the arm's root, on the arm's side). Candidates only:
# the place kind Levi named (a crossing's gap reaching a junction's rounded corner).
#   python near.py <captureDir> [--reach 6]   -> one line per (junction, arm, crossing): site, px, arc gap in h
import sys, json
a = sys.argv[1:]
d = a[0]; reach = float(a[a.index('--reach') + 1]) if '--reach' in a else 6.0
S = json.load(open(d + r'\scene_gf.json')); T = json.load(open(d + r'\sites_gf.json'))
h = S['look']['halfWidth']
site = {s['site']: s for s in T['sites']}
out = []
for J in S['junctions']:
    for ai, A in enumerate(J['arms']):
        c, s0, dr = A['chain'], A['s'], A.get('dir', 1)
        for X in S['crossings']:
            under = X['b'] if X['over'] == 'a' else X['a']; over = X['a'] if X['over'] == 'a' else X['b']
            if under['chain'] != c: continue
            ds = (under['s'] - s0) * dr
            if -1.0 * h < ds < reach * h:
                st = site.get(J['id'], {})
                out.append((J['id'], ai, round(ds / h, 2), over['chain'], round(st.get('x', -1)), round(st.get('y', -1))))
for o in sorted(out, key=lambda o: o[2]):
    print('%-6s arm%d ds=%5.2fh over=%-3d px=(%d,%d)' % o)
print('total', len(out), 'junctions', len(set(o[0] for o in out)))
