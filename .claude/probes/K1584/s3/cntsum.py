# K1584 s3: per-maze crossing-side counts, stage 1's rules (cnt/<m>_s1.json) against s3's (cnt/<m>_s3.json); the
# closed sides split by rule with cnt/<m>_s3noU.json (s18's under rule off: what the over rule closes alone).
#   python cntsum.py [mazes...]
import json, sys, os, glob, statistics as st
here = os.path.dirname(os.path.abspath(__file__))
mz = sys.argv[1:] or sorted({os.path.basename(p)[:3] for p in glob.glob(os.path.join(here, 'cnt', '*_s3.json'))})
def tally(p):
    t = {}; ms = []; fs = []
    for x in json.load(open(p))['crossings']:
        for b in x['borders']:
            t[b['path']] = t.get(b['path'], 0) + 1
            if b['path'] == 'scale' and b.get('ms') is not None: ms.append(b['ms']); fs.append(b['fs'])
    return t, ms, fs
K = ['full', 'scale', 'window', 'flag', 'stolen', 'none']
T = {k: 0 for k in K}; T1 = dict(T); TO = 0; allms = []; allfs = []
print('| maze | sides | full gap | reduced: scaled (margin/fade kept, mean) | reduced: window end | closed: over rule | closed: under rule | stolen/none |')
print('|---|---|---|---|---|---|---|---|')
g = lambda t, k: t.get(k, 0)
for m in mz:
    a, _, _ = tally(os.path.join(here, 'cnt', f'{m}_s1.json')); b, ms, fs = tally(os.path.join(here, 'cnt', f'{m}_s3.json'))
    o, _, _ = tally(os.path.join(here, 'cnt', f'{m}_s3noU.json')); no = g(o, 'flag'); TO += no
    allms += ms; allfs += fs
    for k in K: T[k] += g(b, k); T1[k] += g(a, k)
    kept = f"{st.mean(ms):.2f}/{st.mean(fs):.2f}" if ms else '-'
    print(f"| {m} | {sum(b.values())} | {g(a,'full')} -> {g(b,'full')} | {g(a,'scale')} -> {g(b,'scale')} ({kept}) | {g(a,'window')} -> {g(b,'window')} | {no} | {g(a,'flag')-no} -> {g(b,'flag')-no} | {g(b,'stolen')}/{g(b,'none')} |")
kept = f"{st.mean(allms):.2f}/{st.mean(allfs):.2f}" if allms else '-'
print(f"| all | {sum(T.values())} | {T1['full']} -> {T['full']} | {T1['scale']} -> {T['scale']} ({kept}) | {T1['window']} -> {T['window']} | {TO} | {T1['flag']-TO} -> {T['flag']-TO} | {T['stolen']}/{T['none']} |")
