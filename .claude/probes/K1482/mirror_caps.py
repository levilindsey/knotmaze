import json, sys, numpy as np
from PIL import Image
from collections import defaultdict
M=json.load(open(sys.argv[1])); G=np.asarray(Image.open(sys.argv[2]).convert('L'))<=21
C={l.split()[0]:l.split()[1] for l in open(sys.argv[3]) if l.strip() and not l.startswith('#')}
by=defaultdict(list); rows=[]
for nm,m in M.items():
    R=m['R']; P=np.array(m['px'],dtype=float).reshape(2*R,2*R,6); cx,cy=m['cx'],m['cy']
    cap=(P[...,0]>=0.5)&(P[...,3]==3); g=G[cy-R:cy+R,cx-R:cx+R]
    vis=int((cap&g).sum()); n=int(cap.sum())
    # screen ink the mirror has no ink for, and mirror ink the screen lacks
    mi=P[...,0]>=0.5; extra=int((g&~mi).sum()); miss=int((mi&~g).sum())
    k=C.get(nm,'clean'); by[k].append((n,vis)); rows.append((nm,k,n,vis,extra,miss))
for k,l in sorted(by.items()):
    n=[a for a,_ in l]; v=[b for _,b in l]
    print(f"{k:7s} sites {len(l):3d}  with cap ink {sum(1 for a in n if a>0):3d}  with cap ink >=20px on screen {sum(1 for b in v if b>=20):3d}  median cap px {int(np.median(n))}")
with open(sys.argv[4],'w') as f:
    f.write('site\tclass\tcap_px\tcap_on_screen\tscreen_not_mirror\tmirror_not_screen\n')
    for r in rows: f.write('\t'.join(map(str,r))+'\n')
