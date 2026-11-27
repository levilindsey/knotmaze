"""K1626 s4: hooks on joint-eye arms, sharp turns and eye openings, from census.ts states.

  python s4_meas.py <dirA> <dirB> [maze ...]      (default: L D_1..D_a)

Per maze and dir (one settled census.ts state each):
  sharp   sharp.py's law: interior particles turning > 60 deg (seams skipped), split
          joint (<= 0.5 ctrl from a fused member) / near1 / near2 / pass (<= 0.6) / else.
  eyes    the first-pass joint eyes (compose3.py's law, MAXC 8): opening in widths.
  hooks   per eye, over both arms' interior particles (joint and pass excluded):
          the largest turn per particle (deg) and the smallest circumradius of three
          consecutive particles (widths). A hook = a large turn at one particle.
Prints a per-maze table, then every eye whose arms turn > HOOK deg (default 45) in
either dir, then totals. Writes <dirB>/s4_meas.json with everything.
"""
import json, math, os, sys

A, B = sys.argv[1], sys.argv[2]
NAMES = sys.argv[3:] or ['L'] + ['D_' + c for c in '123456789a']
HOOK = float(os.environ.get('HOOK', 45))
# Eyes always listed (maze:eye), whatever their turns: the brief's named ones.
SHOW = set(os.environ.get('SHOW', 'L:J138xX282,L:J64xX100,L:J13xX38,L:J132xX254,L:J28xX64').split(','))
MAXC = 8.0


def load(d, nm):
    return json.load(open(f'{d}/{nm}.json'))


def analyse(S):
    pos = S['positions']; chains = S['chains']; tw = S['tw']; brk = S['brk']
    P = lambda i: (pos[2*i], pos[2*i+1])
    n_of = [len(ch) for ch in chains]

    def at(c, f):
        ch = chains[c]; n = len(ch); i0 = math.floor(f); t = f - i0
        a = ch[i0 % n]; b = ch[(i0 + 1) % n]
        return (pos[2*a]*(1-t) + pos[2*b]*t, pos[2*a+1]*(1-t) + pos[2*b+1]*t)

    def turn(c, k):
        """(turn deg, circumradius world) at slot k of chain c, or None at a seam."""
        n = n_of[c]; b = brk[c]
        if b >= 0 and (k % n == b or (k - 1) % n == b):
            return None
        ch = chains[c]
        p0, p1, p2 = P(ch[(k-1) % n]), P(ch[k % n]), P(ch[(k+1) % n])
        v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
        n1, n2 = math.hypot(*v1), math.hypot(*v2)
        if n1 < 1e-9 or n2 < 1e-9:
            return None
        cv = max(-1, min(1, (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2)))
        ang = math.degrees(math.acos(cv))
        c3 = math.hypot(p2[0]-p0[0], p2[1]-p0[1])
        cross = abs(v1[0]*v2[1] - v1[1]*v2[0])
        R = (n1 * n2 * c3) / (2 * cross) if cross > 1e-12 else float('inf')
        return ang, R

    mem = {}
    for J in S['juncs']:
        for c, s in J['members']:
            mem.setdefault(c, []).append((s, J['id']))
    pas = {}
    for X in S['xs']:
        for side in ('over', 'under'):
            pas.setdefault(X[side]['chain'], []).append(X[side]['ctrl'])
    cls = {'joint': 0, 'near1': 0, 'near2': 0, 'pass': 0, 'else': 0}
    for c, ch in enumerate(chains):
        n = len(ch); cyc = lambda v: min(v % n, (-v) % n)
        for k in range(n):
            if brk[c] >= 0 and (k == brk[c] or (k - 1) % n == brk[c]):
                continue
            t = turn(c, k)
            if t is None or t[0] <= 60:
                continue
            dj = min([cyc(k - s) for s, _ in mem.get(c, [])], default=99)
            dp = min([cyc(k - q) for q in pas.get(c, [])], default=99)
            cls['joint' if dj <= 0.5 else 'near1' if dj <= 1 else 'near2' if dj <= 2 else 'pass' if dp <= 0.6 else 'else'] += 1

    # Eyes (compose3.py's law) with each arm's interior slots.
    def clear(c, s, f):
        return not any(abs(v - f) > 1e-9 and (v - s) * (f - v) > 0 for v in pas.get(c, []))

    def line(c, s, f):
        return [at(c, s + (f - s) * k / 24) for k in range(25)]

    def to_line(p, Q):
        m = 1e18
        for i in range(len(Q) - 1):
            ux, uy = Q[i]; dx = Q[i+1][0] - ux; dy = Q[i+1][1] - uy; L = dx*dx + dy*dy
            t = 0 if L == 0 else max(0, min(1, ((p[0]-ux)*dx + (p[1]-uy)*dy) / L))
            m = min(m, math.hypot(p[0] - ux - t*dx, p[1] - uy - t*dy))
        return m

    eyes = {}
    for J in S['juncs']:
        for X in S['xs']:
            ends = []
            for Pp in (X['over'], X['under']):
                best = None
                for c, s in J['members']:
                    if c != Pp['chain']:
                        continue
                    if abs(Pp['ctrl'] - s) <= MAXC and (best is None or abs(Pp['ctrl'] - s) < abs(Pp['ctrl'] - best)):
                        best = s
                ends.append(best)
            sa, sb = ends
            if sa is None or sb is None or (X['over']['chain'] == X['under']['chain'] and sa == sb):
                continue
            ca, cb = X['over']['chain'], X['under']['chain']
            fa, fb = X['over']['ctrl'], X['under']['ctrl']
            if not clear(ca, sa, fa) or not clear(cb, sb, fb):
                continue
            LA = line(ca, sa, fa); LB = line(cb, sb, fb)
            o = max(max(to_line(p, LB) for p in LA), max(to_line(p, LA) for p in LB)) / tw
            arms = []
            for c, s, f in ((ca, sa, fa), (cb, sb, fb)):
                d = 1 if f > s else -1
                prof = []
                k = s + d
                while (k - f) * d < 0:
                    t = turn(c, k)
                    if t is not None:
                        prof.append((k % n_of[c], round(t[0], 1), round(t[1] / tw, 3)))
                    k += d
                arms.append({'chain': c, 'slot': s, 'pass': f, 'turns': prof})
            allt = [x for a in arms for x in a['turns']]
            mt = max((x[1] for x in allt), default=0.0)
            mr = min((x[2] for x in allt), default=float('inf'))
            eyes[f"J{J['id']}xX{X['id']}"] = {'open': o, 'maxTurn': mt, 'minR': mr, 'arms': arms,
                                             'cx': (J['x'] + X['x']) / 2, 'cy': (J['y'] + X['y']) / 2}
    return {'sharp': cls, 'nSharp': sum(cls.values()), 'eyes': eyes, 'sleep': S.get('sleep'), 'tw': tw}


R = {}
for nm in NAMES:
    R[nm] = [analyse(load(A, nm)), analyse(load(B, nm))]

print(f'A={A}\nB={B}')
print('maze  sharp A (joint/n1/n2/pass/else)      sharp B                           eyes  <1.5 A/B  <2 A/B   sleep A/B   maxHook A/B')
tot = [[0, 0, 0], [0, 0, 0]]
for nm, (a, b) in R.items():
    def sh(x):
        c = x['sharp']; return f"{x['nSharp']:3d} ({c['joint']}/{c['near1']}/{c['near2']}/{c['pass']}/{c['else']})"
    ua = sum(e['open'] < 1.5 for e in a['eyes'].values()); ub = sum(e['open'] < 1.5 for e in b['eyes'].values())
    wa = sum(e['open'] < 2 for e in a['eyes'].values()); wb = sum(e['open'] < 2 for e in b['eyes'].values())
    ha = max((e['maxTurn'] for e in a['eyes'].values()), default=0); hb = max((e['maxTurn'] for e in b['eyes'].values()), default=0)
    print(f"{nm:5s} {sh(a):32s} {sh(b):32s} {len(b['eyes']):3d}  {ua}/{ub}  {wa}/{wb}  {a['sleep']}/{b['sleep']}  {ha:.0f}/{hb:.0f}")
    for k, x in enumerate((a, b)):
        tot[k][0] += x['nSharp']; tot[k][1] += sum(e['open'] < 1.5 for e in x['eyes'].values())
        tot[k][2] += sum(e['maxTurn'] > HOOK for e in x['eyes'].values())
print(f'total sharp A {tot[0][0]} B {tot[1][0]} | eyes < 1.5 w A {tot[0][1]} B {tot[1][1]} | eyes with an arm turn > {HOOK:.0f} deg A {tot[0][2]} B {tot[1][2]}')

print(f'\neyes with an arm turn > {HOOK:.0f} deg (A | B): open w, max turn deg, min radius w; dOpen')
moved = 0
for nm, (a, b) in R.items():
    for e in sorted(set(a['eyes']) | set(b['eyes'])):
        ea, eb = a['eyes'].get(e), b['eyes'].get(e)
        if ea and eb and abs(ea['open'] - eb['open']) > 0.15:
            moved += 1
        if not ((ea and ea['maxTurn'] > HOOK) or (eb and eb['maxTurn'] > HOOK) or f'{nm}:{e}' in SHOW):
            continue
        f = lambda x: '-' if x is None else f"{x['open']:.2f} {x['maxTurn']:5.1f} {x['minR']:.2f}"
        d = f"{eb['open'] - ea['open']:+.2f}" if ea and eb else ''
        print(f'{nm:5s} {e:11s} {f(ea):18s} | {f(eb):18s} {d}')
print(f'eyes whose opening moved > 0.15 w: {moved}')
json.dump({nm: {'A': a, 'B': b} for nm, (a, b) in R.items()}, open(f'{B}/s4_meas.json', 'w'))
