import json, glob
ref = {}
for f in glob.glob('.claude/probes/K1040/s1/out/scenes/*.json'):
    d = json.load(open(f))
    st = {c['id']: c['status'] for c in d['checks']}
    st[1] = d['check1']['status']
    ref[d['scene']] = st
ids = [1, 3, 4, 5, 6, 7, 8, 9, 11]
print('scene | ' + ' | '.join(f"#{i}" for i in ids) + '   (G=GPU fail where ref passes)')
for f in sorted(glob.glob('.claude/probes/K1040/s4c/out/checks_ckfinal_*.json')):
    d = json.load(open(f))
    s = d['scene']
    gpu = {}
    for r in d['results']:
        if r['id'] == 9:
            gpu.setdefault(9, r['status'])
            if r['status'] == 'fail':
                gpu[9] = 'fail'
        else:
            gpu[r['id']] = r['status']
    cells = []
    for i in ids:
        g = gpu.get(i, '?')
        r = ref[s].get(i, '?')
        mark = 'G!' if g == 'fail' and r == 'pass' else ('g' if g == 'fail' else '.')
        cells.append(mark)
    print(f"{s:24} | " + ' | '.join(cells) + f"   ref-pass: {[i for i in ids if ref[s].get(i)=='pass']}")
    for r in d['results']:
        if r['id'] in ids and r['status'] == 'fail' and ref[s].get(r['id']) == 'pass':
            print(f"    VIOL #{r['id']} {r['name']}: {r['value']} worst {r['worst']}")
