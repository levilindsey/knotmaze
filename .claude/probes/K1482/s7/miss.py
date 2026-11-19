import json,sys
import numpy as np
from PIL import Image
from collections import Counter
im=np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int).sum(2); S={s["site"]:s for s in json.load(open(sys.argv[2]))["sites"]}; M=json.load(open(sys.argv[3]))
for nm in sys.argv[4].split(","):
  s=S[nm]; t=M[nm]; R=t["R"]; n=2*R; cx,cy=round(s["x"]),round(s["y"])
  G=im[cy-R-1:cy+R+1,cx-R-1:cx+R+1]<=73
  C=Counter(); pts=[]
  for y in range(n):
    for x in range(n):
      ink,cov,ch,wk,wa,wb=t["px"][y*n+x]
      if ink>=0.5 and not G[y:y+3,x:x+3].any(): C[(wk,wa,wb)]+=1; pts.append((x-R,y-R))
  print(nm, dict(C), "pts", pts[:6])
