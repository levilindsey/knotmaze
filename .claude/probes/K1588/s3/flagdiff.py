# K1588 s3: the gap exits whose path (gapcheck.ts: full / flag / scale / window / stolen / none) differs between two
# runs of gapcheck on one capture (cnt/<maze>_<a>.json against cnt/<maze>_<b>.json).
#   python flagdiff.py <cntDir> <a> <b>      e.g. m_j0 m_j2 (master's gap code, the rule off and on)
import json, glob, os, sys, collections
d, A, B = sys.argv[1:4]
tot = collections.Counter()
for m in sorted(set(os.path.basename(f)[:3] for f in glob.glob(os.path.join(d, f'*_{A}.json')))):
    pb = os.path.join(d, f'{m}_{B}.json')
    if not os.path.exists(pb): continue
    def paths(J):
        return {(c['i'], br['dir'], br['lat']): (br['path'], c['dev']) for c in J['crossings'] for br in c['borders']}
    pa, pq = paths(json.load(open(os.path.join(d, f'{m}_{A}.json')))), paths(json.load(open(pb)))
    ch = [(k, pa[k][0], pq[k][0] if k in pq else None, pa[k][1]) for k in pa if pq.get(k, (None,))[0] != pa[k][0]]
    tot['exits'] += len(pa); tot['changed'] += len(ch)
    for k, x, y, _ in ch: tot[f'{x}>{y}'] += 1
    print(m, len(pa), 'changed', len(ch), ' '.join(f'x{k[0]}{"+" if k[1] > 0 else "-"}{"L" if k[2] > 0 else "R"}:{x}>{y}@{int(dv[0])},{int(dv[1])}' for k, x, y, dv in ch))
print(dict(tot))
