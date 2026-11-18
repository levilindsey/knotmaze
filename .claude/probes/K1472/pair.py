import sys
from PIL import Image, ImageChops
d=sys.argv[1]; a=sys.argv[2]; b=sys.argv[3]
for f in sys.argv[4].split(","):
    A=Image.open(f"{d}/{a}_{f}.png").convert("RGB"); B=Image.open(f"{d}/{b}_{f}.png").convert("RGB")
    m=ImageChops.difference(A,B)
    n=sum(1 for px in m.getdata() if max(px)>24)
    print(f, n, m.getbbox())
