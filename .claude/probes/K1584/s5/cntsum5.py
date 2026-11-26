# K1584 s5: per-maze crossing-border counts, s4's bake (../s4/cnt/<m>_s4.json) against s5's (cnt/<m>_s5.json).
#   python cntsum5.py [--closed] [mazes...]
import json, sys, os, glob, statistics as st
SFX = os.environ.get('SFX', 's5')
here = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]; lst = '--closed' in sys.argv
mz = args or sorted({os.path.basename(p)[:3] for p in glob.glob(os.path.join(here, 'cnt', f'*_{SFX}.json'))})
def load(p):
    J = json.load(open(p)); t = {}; ms = []; fs = []; weak = []; closed = []
    corn = J.get('corn', []); cm = {}
    for q in range(0, len(corn), 4): cm[(corn[q], corn[q+1], corn[q+2])] = corn[q+3]
    for x in J['crossings']:
        for b in x['borders']:
            p_ = b['path']; t[p_] = t.get(p_, 0) + 1
            if p_ == 'scale' and b.get('ms') is not None: ms.append(b['ms']); fs.append(b['fs'])
            if p_ in ('scale', 'window', 'full') and b['keepM'] == b['keepM'] and b['keepM'] > 0.8: weak.append((x['i'], b['dir'], b['lat'], b['keepM']))
            if p_ in ('closed', 'flag'): closed.append((x['i'], b['dir'], b['lat'], b['sExit'], cm.get((x['i'], b['dir'], b['lat'])), x['wx'], x['wy']))
    return t, ms, fs, weak, closed
g = lambda t, k: t.get(k, 0)
print('| maze | sides | full gap s4 -> s5 | reduced: scaled s4 -> s5 (s4 margin/fade kept, mean) | reduced: window end s4 -> s5 | closed s4 -> s5 | reads closed (keep > 0.8) s4 -> s5 | stolen/none |')
print('|---|---|---|---|---|---|---|---|')
T3 = {}; T4 = {}; AM = []; AF = []; W = 0; out = []
for m in mz:
    a, _, _, weak4, _ = load(os.path.join(here, '..', 's4', 'cnt', f'{m}_s4.json'))
    b, ms, fs, weak, closed = load(os.path.join(here, 'cnt', f'{m}_{SFX}.json'))
    for k, v in a.items(): T3[k] = T3.get(k, 0) + v
    for k, v in b.items(): T4[k] = T4.get(k, 0) + v
    AM += ms; AF += fs; W += len(weak)
    kept = f"{st.mean(ms):.2f}/{st.mean(fs):.2f}" if ms else '-'
    print(f"| {m} | {sum(b.values())} | {g(a,'full')} -> {g(b,'full')} | {g(a,'scale')} -> {g(b,'scale')} ({kept}) | {g(a,'window')} -> {g(b,'window')} | {g(a,'closed')+g(a,'flag')} -> {g(b,'closed')+g(b,'flag')} | {len(weak4)} -> {len(weak)} | {g(b,'stolen')}/{g(b,'none')} |")
    if lst:
        for c in closed: out.append(f"{m} closed x{c[0]} dir {c[1]} lat {c[2]} sExit {c[3]} corner {c[4]} at ({c[5]:.0f},{c[6]:.0f})")
        for w in weak: out.append(f"{m} weak x{w[0]} dir {w[1]} lat {w[2]} keep {w[3]}")
kept = f"{st.mean(AM):.2f}/{st.mean(AF):.2f}" if AM else '-'
print(f"| all | {sum(T4.values())} | {g(T3,'full')} -> {g(T4,'full')} | {g(T3,'scale')} -> {g(T4,'scale')} ({kept}) | {g(T3,'window')} -> {g(T4,'window')} | {g(T3,'closed')+g(T3,'flag')} -> {g(T4,'closed')+g(T4,'flag')} | {W} | {g(T4,'stolen')}/{g(T4,'none')} |")
print('\n'.join(out))


