import json, sys, numpy as np
from PIL import Image, ImageDraw
M=json.load(open(sys.argv[1])); G=Image.open(sys.argv[2]).convert('RGB').point(lambda q:max(0,min(255,round((q-14)*7)))); Z=5
pal=[(230,25,75),(60,180,75),(255,225,25),(0,130,200),(245,130,48),(145,30,180),(70,240,240),(240,50,230),(210,245,60),(128,128,0)]
names=list(M); T=2*28*Z; sh=Image.new('RGB',(3*(T+4)*2,len(names)//2*(T+14)+14),(255,255,255)); dr=ImageDraw.Draw(sh)
dr.text((0,0),'screen border | mirror ink>=0.5 by chain (dark=ink<0.5) | mirror ink by winKind (1 side red, 2 fillet green, 3 cap blue, 4 tangent yellow, 5 thru magenta)',fill=(0,0,0))
for n_,nm in enumerate(names):
    m=M[nm]; R=m['R']; P=np.array(m['px'],dtype=float).reshape(2*R,2*R,6); cx,cy=m['cx'],m['cy']
    ink=P[...,0]; chn=P[...,2].astype(int); wk=P[...,3].astype(int)
    a=np.zeros((2*R,2*R,3),np.uint8)+235; b=a.copy()
    for y in range(2*R):
        for x in range(2*R):
            if chn[y,x]>=0: a[y,x]=[c//2+100 for c in pal[chn[y,x]%10]]
            if ink[y,x]>=0.5: a[y,x]=[c//3 for c in pal[chn[y,x]%10]] if chn[y,x]>=0 else (0,0,0); b[y,x]=[(255,255,255),(220,0,0),(0,170,0),(0,0,230),(220,200,0),(220,0,220)][min(wk[y,x],5)]
    ox=(n_%2)*3*(T+4); oy=14+(n_//2)*(T+14); dr.text((ox,oy),nm,fill=(200,0,0))
    for k,im in enumerate((G.crop((cx-R,cy-R,cx+R,cy+R)),Image.fromarray(a),Image.fromarray(b))): sh.paste(im.resize((T,T),Image.NEAREST),(ox+k*(T+4),oy+12))
sh.save(sys.argv[3])
