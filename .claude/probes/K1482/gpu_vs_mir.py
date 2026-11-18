# K1482 s4: GPU ink (frame) next to the mirror's ink + winKind, same device pixels, around site+offset.
#   python gpu_vs_mir.py <frame.png> <sites.json> <mir.json> <site> <x0,x1,y0,y1 in tile px> [inkSum=200]
import json, sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(int); S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
M = json.load(open(sys.argv[3])); nm = sys.argv[4]; x0, x1, y0, y1 = map(int, sys.argv[5].split(",")); thr = int(sys.argv[6]) if len(sys.argv) > 6 else 200
s = S[nm]; t = M[nm]; R = t["R"]; n = 2 * R; cx, cy = round(s["x"]), round(s["y"])
for y in range(y0, y1):
    g = ""; m = ""
    for x in range(x0, x1):
        v = im[cy - R + y, cx - R + x].sum(); g += "#" if v < thr else "."
        ink, cov, ch, wk, wa, wb = t["px"][y * n + x]; m += "b" if ch < 0 else str(wk) if ink >= 0.5 else ("+" if ink >= 0.1 else ".")
    print(f"{y:2d} {g}   {m}")
