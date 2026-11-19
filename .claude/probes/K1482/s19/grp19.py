import sys, json, numpy as np
from PIL import Image
A0=np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int).sum(2); B0=np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(int).sum(2)
S=json.load(open(sys.argv[3]))["sites"]
import os; T=int(os.environ.get("GT",120)); D=int(os.environ.get("GD",0)); gain=(B0<=73)&((A0>=T) if not D else (A0-B0>=D)); loss=(A0<=73)&((B0>=T) if not D else (B0-A0>=D))
gain[:200]=False; loss[:200]=False; gain[1660:]=False; loss[1660:]=False; gain[1590:,2200:]=False; loss[1590:,2200:]=False; C=int(sys.argv[4]) if len(sys.argv)>4 else 40
ys,xs=np.nonzero(gain|loss); cells={}
for y,x in zip(ys,xs): cells.setdefault((x//C,y//C),[]).append((x,y))
# merge adjacent cells
seen=set(); groups=[]
for c in cells:
    if c in seen: continue
    st=[c]; g=[]; seen.add(c)
    while st:
        u=st.pop(); g+=cells[u]
        for dx in(-1,0,1):
            for dy in (-1,0,1):
                v=(u[0]+dx,u[1]+dy)
                if v in cells and v not in seen: seen.add(v); st.append(v)
    groups.append(g)
print("gain",gain.sum(),"loss",loss.sum(),"groups",len(groups))
for g in sorted(groups,key=lambda g:-len(g)):
    P=np.array(g); cx,cy=P.mean(0).astype(int); ng=sum(gain[y,x] for x,y in g); nl=len(g)-ng
    s=min(S,key=lambda s:(s["x"]-cx)**2+(s["y"]-cy)**2); d=((s["x"]-cx)**2+(s["y"]-cy)**2)**.5
    print(f"{cx},{cy} +{ng} -{nl} near {s['site']} d{d:.0f}")
