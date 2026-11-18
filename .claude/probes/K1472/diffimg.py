import sys
from PIL import Image, ImageChops
d=sys.argv[1]; a,b,f,out=sys.argv[2:6]
A=Image.open(f"{d}/{a}_{f}.png").convert("RGB"); B=Image.open(f"{d}/{b}_{f}.png").convert("RGB")
m=ImageChops.difference(A,B).convert("L").point(lambda v:255 if v>8 else 0)
W,H=A.size
o=Image.new("RGB",(W*3,H)); o.paste(A,(0,0)); o.paste(B,(W,0)); o.paste(Image.merge("RGB",(m,m,m)),(W*2,0)); o.save(out)
