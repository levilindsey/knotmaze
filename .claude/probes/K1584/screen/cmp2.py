# Compare the stage 5 verdict of every side between two screen.py runs: the 3-capture run (today, stage 4, stage 5;
# <maze>.json beside this file, stage 5 = scr[2]) and the 2-capture run (stage 5, combined; comb/<maze>.json, scr[0]).
# screen.py calibrates its image offset on its FIRST capture, so the two runs can differ by a half pixel.
import json, os
sp = os.path.dirname(os.path.abspath(__file__))
mazes = ['A_' + c for c in '3456789abcd'] + ['D_' + c for c in '123456789a']
n = 0
for m in mazes:
    a = json.load(open(os.path.join(sp, m + '.json'))); b = json.load(open(os.path.join(sp, 'comb', m + '.json')))
    off = (a['dx'], a['dy'], b['dx'], b['dy'])
    d = []
    for x, y in zip(a['sides'], b['sides']):
        assert (x['i'], x['dir'], x['lat']) == (y['i'], y['dir'], y['lat'])
        u = x['scr'][2]; v = y['scr'][0]
        if u['v'] != v['v']: d.append((x['i'], x['dir'], x['lat'], u['v'], u['gap'], v['v'], v['gap']))
    n += len(d)
    if d or off[:2] != off[2:]: print(m, 'offsets old/new', off, 'differing sides', d)
print('sides whose stage 5 verdict differs between the runs:', n)
