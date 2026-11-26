import json,sys,collections
L=[json.loads(l) for l in open(sys.argv[1]) if l.startswith('{"X')]
v=[d for d in L if d['g'][0][0]>0.1]; s=[d for d in L if d['g'][2][0]>0.1]
c=collections.Counter((d['ch'],d['g'][0][1],d['g'][0][6]) for d in v)
print('s7 cut',len(s),'variant cut',len(v),'restored',len([d for d in s if d['g'][0][0]<=0.1]),dict(c))
