import sys
from PIL import Image
d=sys.argv[1]
fs=sys.argv[2].split(","); pres=sys.argv[3].split(","); out=sys.argv[4]
sc=float(sys.argv[5]) if len(sys.argv)>5 else 0.5
box=tuple(int(v) for v in sys.argv[6].split(",")) if len(sys.argv)>6 else None
ims=[[Image.open(f"{d}/{p}_{f}.png").convert("RGB") for p in pres] for f in fs]
if box:
    x,y,w,h=box; ims=[[i.crop((x,y,x+w,y+h)) for i in r] for r in ims]
W,H=ims[0][0].size; tw,th=int(W*sc),int(H*sc)
o=Image.new("RGB",(len(pres)*(tw+4),len(fs)*(th+4)),(255,255,255))
for r,row in enumerate(ims):
    for c,im in enumerate(row):
        o.paste(im.resize((tw,th),Image.NEAREST if sc>1 else Image.LANCZOS),(c*(tw+4),r*(th+4)))
o.save(out)
