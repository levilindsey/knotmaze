# K1588: on-screen verdict of every crossing side, last step (stage 4) against stage 4 + the junction rule.
#   python juncsum.py <dir of per-maze json from screen.py (two captures)>
import json, glob, os, sys, collections
d = sys.argv[1]; T = [collections.Counter(), collections.Counter()]; tr = collections.Counter(); n = 0; ch = []
for f in sorted(glob.glob(d + r'\[AD]_?.json')):
    m = os.path.basename(f)[:-5]
    for s in json.load(open(f))['sides']:
        v = [x['v'] for x in s['scr']]; n += 1
        T[0][v[0]] += 1; T[1][v[1]] += 1
        if v[0] != v[1]: tr[(v[0], v[1])] += 1; ch.append((m, s.get('i'), s.get('dir'), s.get('lat'), v[0], v[1]))
print('sides', n); print('stage 4   ', dict(T[0])); print('+ junction', dict(T[1]))
for k, c in sorted(tr.items(), key=lambda t: -t[1]): print('  %s -> %s: %d' % (k[0], k[1], c))
a3 = [c for c in ch if c[0] == 'A_3']; print('A_3 changes', a3)
json.dump(ch, open(d + r'\changes.json', 'w'))
