import json, math, sys, statistics as st
T=json.load(open(sys.argv[1])); S=json.load(open(sys.argv[2]))['sites']
C={}
for ln in open(sys.argv[3]):
    if ln.strip() and not ln.startswith('#'): s,c,px=ln.split(); C[s]=c
v=lambda k: T[k]['v']
vx,vy,vs=v('vx'),v('vy'),v('vs'); V0,NV=v('cV0'),v('cNV')
pts=[]
for c in range(T['nC']):
    for i in range(V0[c],V0[c]+NV[c]-1):
        pts.append((c,i))
def tan(i):
    dx,dy=vx[i+1]-vx[i],vy[i+1]-vy[i]; l=math.hypot(dx,dy) or 1; return dx/l,dy/l
def segd(i,x,y):
    ax,ay,bx,by=vx[i],vy[i],vx[i+1],vy[i+1]; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy or 1
    t=max(0,min(1,((x-ax)*dx+(y-ay)*dy)/L)); return math.hypot(ax+t*dx-x,ay+t*dy-y), vs[i]+t*(vs[i+1]-vs[i])
out={'sliver':[], 'clean':[], 'other':[]}
for s in S:
    if s['kind']!='tail': continue
    x,y=s['wx'],s['wy']; best=[]
    for c,i in pts:
        if abs(vx[i]-x)>1.5 or abs(vy[i]-y)>1.5: continue
        d,a=segd(i,x,y); best.append((d,c,i,a))
    best.sort(); d0,c0,i0,a0=best[0]
    # the over pass: nearest seg not within 1.5 arc of the tail's own point on its chain
    ov=[b for b in best if not (b[1]==c0 and abs(b[3]-a0)<1.5)]
    if not ov: continue
    d1,c1,i1,a1=ov[0]; t0,t1=tan(i0),tan(i1)
    ang=math.degrees(math.acos(min(1,abs(t0[0]*t1[0]+t0[1]*t1[1]))))
    k=C.get(s['site'],'clean'); k=k if k in out else 'other'; out[k].append((ang,s['site'],round(d1,2)))
for k,l in out.items():
    a=[x[0] for x in l]
    if a: print(k,len(a),'median %.0f deg'%st.median(a),'<35deg: %d'%sum(1 for q in a if q<35), ' '.join('%s:%.0f'%(n,g) for g,n,_ in sorted(l)[:40]))
