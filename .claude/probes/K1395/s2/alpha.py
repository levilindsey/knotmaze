# K1395 s2: classify each chain sample's pixel in the today and gf shots (alpha.mjs outputs) and tabulate
# against the CPU mirror's alpha.  python alpha.py <out/tag>   (reads <tag>_today.{png,json}, <tag>_gf.{png,json})
import sys, json
from PIL import Image
tag = sys.argv[1]
T = Image.open(tag + "_today.png").convert("RGB"); G = Image.open(tag + "_gf.png").convert("RGB")
jt = json.load(open(tag + "_today.json")); jg = json.load(open(tag + "_gf.json"))
W, H = T.size
def col(im, x, y):
    best = 0
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            xx, yy = int(round(x)) + dx, int(round(y)) + dy
            if 0 <= xx < W and 0 <= yy < H:
                p = im.getpixel((xx, yy)); s = max(p) - min(p)
                if s > 40 and max(p) > 60: best = max(best, s)
    return best
def lum(im, x, y):
    p = im.getpixel((int(round(x)), int(round(y)))); return sum(p) // 3
bins = {}
rows_out = []
for ct, cg in zip(jt["chains"], jg["chains"]):
    if not ct or not cg: continue
    for k, (rt, rg) in enumerate(zip(ct["rows"], cg["rows"])):
        x, y, a = rg[0], rg[1], rg[2]
        if not (0 <= x < W and 0 <= y < H): continue
        t = col(T, rt[0], rt[1]) > 0; g = col(G, x, y) > 0
        b = min(10, int(a * 10))
        e = bins.setdefault(b, [0, 0, 0, 0])
        e[0] += 1; e[1] += t; e[2] += g; e[3] += (g and not t)
        rows_out.append((ct["ch"], k, a, rg[3], rg[4], rg[5], t, g, lum(T, rt[0], rt[1]), lum(G, x, y), cg["fxHere"]))
print("alpha bin: n, today coloured, gf coloured, gf-only")
for b in sorted(bins): print(f"  {b/10:.1f}: {bins[b]}")
# per chain, runs where gf coloured and today not
from collections import defaultdict
pc = defaultdict(lambda: [0, 0, 0])
for r in rows_out:
    e = pc[r[0]]; e[0] += 1; e[1] += (r[7] and not r[6]); e[2] += (r[6] and not r[7])
worst = sorted(pc.items(), key=lambda kv: -kv[1][1])[:8]
print("chains with most gf-only samples (ch: n, gf-only, today-only):", worst)
if len(sys.argv) > 2:
    ch = int(sys.argv[2])
    for r in rows_out:
        if r[0] == ch: print(r)
