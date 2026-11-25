# Totals per capture of a directory of screen.py per-maze records, with the captures and offsets each run used.
#   python tot.py <dir> [<dir2> ...]
import json, glob, os, sys, collections
for d in sys.argv[1:]:
    T = None; caps = None; offs = collections.Counter()
    for f in sorted(glob.glob(d + r'\[AD]_?.json')):
        j = json.load(open(f))
        if T is None: T = [collections.Counter() for _ in j['caps']]; caps = j['caps']
        offs[(j['dx'], j['dy'])] += 1
        for s in j['sides']:
            for k, x in enumerate(s['scr']): T[k][x['v']] += 1
    print(d); print('  offsets', dict(offs))
    for c, t in zip(caps or [], T or []): print('  %-70s closed %5d part %4d bare %4d none %3d gap %6d' % (c[-70:], t['closed'], t['part'], t['bare'], t['none'], t['gap']))
