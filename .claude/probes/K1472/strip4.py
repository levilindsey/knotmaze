import sys
from PIL import Image
d=sys.argv[1]; v=sys.argv[2]; out=sys.argv[3]
ims=[Image.open(f"{d}/{v}_{k}.png").convert("RGB") for k in ["pre1","pre0","post0","post1"]]
W,H=ims[0].size; s=0.5
o=Image.new("RGB",(int(W*s)*4,int(H*s)))
for i,im in enumerate(ims): o.paste(im.resize((int(W*s),int(H*s))),(i*int(W*s),0))
o.save(out)
