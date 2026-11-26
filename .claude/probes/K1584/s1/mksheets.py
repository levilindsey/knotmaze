# K1584 s1: all of one maze's sheets: 32 crossings (places.py) as two before|after sheets of 16.
#   python mksheets.py <maze>      (reads out/before/<maze>, out/after/<maze>, out/pl_<maze>.json)
import sys, json, subprocess, os
z = sys.argv[1]; here = os.path.dirname(os.path.abspath(__file__)); o = os.path.join(here, 'out')
P = json.load(open(os.path.join(o, f'pl_{z}.json')))
for n, part in enumerate([P[:16], P[16:]]):
    if not part: continue
    pj = os.path.join(o, f'pl_{z}_{n + 1}.json'); json.dump(part, open(pj, 'w'))
    subprocess.check_call([sys.executable, os.path.join(here, 'sheet.py'), os.path.join(o, 'before', z), os.path.join(o, 'after', z), pj, os.path.join(here, f'{z}_crossings_{n + 1}.png'), '72', '4', '4'])
