import json,collections,sys
L=[json.loads(l) for l in open(sys.argv[1]) if l.startswith('{"X')]
c=collections.Counter()
for d in L:
  g=d['g'][2]; c[(d['ch'],round(d['s'],1),g[1],g[4],g[5],g[6])]+=1
for k,v in sorted(c.items()): print(k,v)
