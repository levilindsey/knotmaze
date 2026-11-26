# K1626 s2: per-eye openings (widths) from jeye.ts JSONs, side by side.
#   python eyecmp.py <maze> <a.json> <b.json> ...   (* = not a first pass)
import json, sys
nm = sys.argv[1]
runs = [(f.rsplit('/', 1)[-1].rsplit('\\', 1)[-1].replace('.json', ''), json.load(open(f))[nm]['eyes']) for f in sys.argv[2:]]
print('eye'.ljust(14) + ''.join(r[0][:10].rjust(11) for r in runs))
for i, e in enumerate(runs[0][1]):
    row = str(e['eye']).ljust(13) + ('' if e['first'] else '*')
    for _, eyes in runs:
        m = [x for x in eyes if x['eye'] == e['eye']]
        row += (f"{m[0]['open']:.2f}" if m else '-').rjust(11)
    print(row)
