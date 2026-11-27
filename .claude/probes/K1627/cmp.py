# K1627 s3: every changed pixel, master (m0) against a tag, on L and the 21 mazes; specks.py counts both sides; views
# must match. python cmp.py <tag> [--master m0]
import sys, os, subprocess, json
import numpy as np
from PIL import Image
a = sys.argv[1:]; tag = a[0]; M = a[a.index('--master') + 1] if '--master' in a else 'm0'
here = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(here, 'out')
mz = ['L'] + [f'A_{c}' for c in '3456789abcd'] + [f'D_{c}' for c in '123456789a']
tot = {'chg': 0, 'sm': 0, 'sy': 0}
for m in mz:
    vm = open(os.path.join(O, M, m, 'gf_b2view.txt')).readline().strip(); vy = open(os.path.join(O, tag, m, 'gf_b2view.txt')).readline().strip()
    A = np.asarray(Image.open(os.path.join(O, M, m, 'gf_b2.png')).convert('RGB')).astype(int)
    B = np.asarray(Image.open(os.path.join(O, tag, m, 'gf_b2.png')).convert('RGB')).astype(int)
    ch = int((abs(A - B).max(2) > 0).sum())
    sp = lambda t: json.loads(subprocess.run([sys.executable, os.path.join(here, 'specks.py'), os.path.join(O, t, m, 'gf_b2.png'), '--json', os.path.join(O, f'specks_{t}_{m}.json')], capture_output=True, text=True).stdout and open(os.path.join(O, f'specks_{t}_{m}.json')).read())
    s0 = sp(M); s1 = sp(tag)
    tot['chg'] += ch; tot['sm'] += len(s0); tot['sy'] += len(s1)
    print(f'{m:4s} view {"same" if vm == vy else "DIFF"}  changed px {ch:4d}  specks.py islands {M} {len(s0):3d}  {tag} {len(s1):3d}')
print('total', tot)
