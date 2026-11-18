import sys
from PIL import Image, ImageChops
d=sys.argv[1]
def n(a,b,th=24):
    A=Image.open(f"{d}/{a}.png").convert("RGB"); B=Image.open(f"{d}/{b}.png").convert("RGB")
    return sum(1 for v in ImageChops.difference(A,B).convert("L").get_flattened_data() if v>th)
for a,b in [("today_v1_post0","today_v2_post0"),("today_v1_post1","today_v2_post1"),("t_v2_post0","today_v2_post0"),("t_v3_post0","today_v2_post0"),("t_v4_post0","today_v1_post0"),("t_v2_post1","today_v2_post1"),("t_v2_post0","t_v3_post0")]:
    print(a,"vs",b,n(a,b))
