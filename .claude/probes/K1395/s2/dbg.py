# K1395 s2: today's debug views at one chain's sample points beside the CPU mirror's numbers.
#   python dbg.py <out/tag> <ch> [k0] [k1]   (reads <tag>_today.json, <tag>_today_d6.png (aM, lookA, gk),
#   <tag>_today_d7.png (fract ctrl, fract 16 ctrl, hiA), <tag>_today.png)
import sys, json
from PIL import Image
tag, ch = sys.argv[1], int(sys.argv[2])
k0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0
k1 = int(sys.argv[4]) if len(sys.argv) > 4 else 10 ** 9
d = json.load(open(tag + "_today.json"))
rows = [c for c in d["chains"] if c and c["ch"] == ch][0]["rows"]
im = {k: Image.open(f"{tag}_today{k}.png").convert("RGB") for k in ("", "_d6", "_d7")}
print("k   x      y     | cpu: alpha ctrl  mask | gpu: aM   lookA gk   fr(ctrl) hiA | shot rgb")
for k, r in enumerate(rows):
    if k < k0 or k > k1: continue
    x, y = int(round(r[0])), int(round(r[1]))
    p6 = im["_d6"].getpixel((x, y)); p7 = im["_d7"].getpixel((x, y)); p0 = im[""].getpixel((x, y))
    print(f"{k:3d} {r[0]:6.1f} {r[1]:6.1f} | {r[2]:.3f} {r[6]:7.3f} {r[7]:.2f} | {p6[0]/255:.2f} {p6[1]/255:.2f} {p6[2]/255:.2f}  {p7[0]/255:.3f} {p7[2]/255:.2f} | {p0}")
