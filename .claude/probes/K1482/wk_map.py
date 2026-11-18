import json, sys
import numpy as np
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); names = sys.argv[3].split(","); S = 6
cols = {0:(235,235,235),1:(60,60,200),2:(40,160,40),3:(220,40,40),4:(200,160,0),5:(150,0,150),6:(0,150,150)}
tiles = []
for nm in names:
    t = d[nm]; R = t["R"]; n = 2*R; px = np.array(t["px"])
    ink = px[:,0].reshape(n,n); wk = px[:,3].reshape(n,n).astype(int); ch = px[:,2].reshape(n,n).astype(int)
    a = np.zeros((n,n,3)); 
    for k,c in cols.items(): a[wk==k] = c
    a = a*(0.35+0.65*(ink[...,None]>0.5)) + 0
    b = np.zeros((n,n,3)); u = np.unique(ch)
    rng = np.random.RandomState(1); pal = {c: rng.randint(40,255,3) for c in u}
    for c in u: b[ch==c] = pal[c]
    b[ink>0.5] *= 0.3
    tiles.append((nm, a, b, sorted(set(zip(wk[ink>0.5].tolist(), ch[ink>0.5].tolist())))))
n = tiles[0][1].shape[0]*S
im = Image.new("RGB", (2*(n+6)+6, len(tiles)*(n+18)+6), "white"); dr = ImageDraw.Draw(im)
for r,(nm,a,b,kc) in enumerate(tiles):
    y = 6 + r*(n+18); dr.text((6,y), nm, fill="black")
    for c,t in enumerate((a,b)): im.paste(Image.fromarray(t.clip(0,255).astype(np.uint8)).resize((n,n), Image.NEAREST), (6+c*(n+6), y+12))
    print(nm, "ink (winKind, chain):", kc)
im.save(sys.argv[2])
