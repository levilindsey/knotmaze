import json, math, sys
from PIL import Image, ImageDraw
T=json.load(open(sys.argv[1])); SJ=json.load(open(sys.argv[2])); S={s['site']:s for s in SJ['sites']}
A=Image.open(sys.argv[3]).convert('RGB').point(lambda q:max(0,min(255,round((q-14)*7)))); names=sys.argv[5].split(',')
a,b,c,d,e,f=SJ['toDevA']; h=T['h']
v=lambda k: T[k]['v']; vx,vy=v('vx'),v('vy'); V0,NV=v('cV0'),v('cNV')
R=24; Z=8; TS=2*R*Z; cols=[(255,0,0),(0,200,0),(255,140,0),(0,220,255),(255,0,255),(255,255,0)]
sh=Image.new('RGB',(2*TS+8,((len(names)+1)//2)*(TS+14)),(255,255,255)); dr=ImageDraw.Draw(sh)
for n_,nm in enumerate(names):
    s=S[nm]; cx,cy=round(s['x']),round(s['y']); ox=(n_%2)*(TS+8); oy=(n_//2)*(TS+14)
    sh.paste(A.crop((cx-R,cy-R,cx+R,cy+R)).resize((TS,TS),Image.NEAREST),(ox,oy+14)); dr.text((ox,oy),nm,fill=(200,0,0))
    k=0
    for ch in range(T['nC']):
        P=[(a*vx[i]+c*vy[i]+e,b*vx[i]+d*vy[i]+f) for i in range(V0[ch],V0[ch]+NV[ch])]
        if not any(abs(x-cx)<R and abs(y-cy)<R for x,y in P): continue
        col=cols[k%len(cols)]; k+=1
        tp=lambda x,y:(ox+(x-cx+R)*Z,oy+14+(y-cy+R)*Z)
        for (x0,y0),(x1,y1) in zip(P,P[1:]):
            dx,dy=x1-x0,y1-y0; L=math.hypot(dx,dy) or 1; nx,ny=-dy/L*h*a,dx/L*h*a
            dr.line([tp(x0,y0),tp(x1,y1)],fill=col,width=1)
            for sg in (1,-1): dr.line([tp(x0+sg*nx,y0+sg*ny),tp(x1+sg*nx,y1+sg*ny)],fill=col,width=1)
        inside=[p for p in P if abs(p[0]-cx)<R and abs(p[1]-cy)<R]; x,y=inside[len(inside)//2]; dr.text(tp(x,y),str(ch),fill=col)
sh.save(sys.argv[4])
