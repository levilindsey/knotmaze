import sys
from PIL import Image, ImageChops
d=sys.argv[1]
def n(a,b,th=24):
  A=Image.open(f"{d}/{a}.png").convert("RGB");B=Image.open(f"{d}/{b}.png").convert("RGB")
  return sum(1 for v in ImageChops.difference(A,B).convert("L").getdata() if v>th)
for v in sys.argv[2:]:
  print(v, "pre1->pre0 (today, ~0.5s)", n(f"{v}_pre1",f"{v}_pre0"), " pre0->post0 (takeover)", n(f"{v}_pre0",f"{v}_post0"), " post0->post1 (gf, 0.12s)", n(f"{v}_post0",f"{v}_post1"))
