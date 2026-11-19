# K1482 s8: every place the screen's ink changed between two frames (connected blobs of ink in one frame and none
# within 1 px in the other, >= MIN px), each cropped at 4x with the frames side by side and the nearest site named.
#   python blobs.py <sites.json> <out_prefix> <label=A.png> <label=B.png> [label=C.png ...]   env R=20 Z=4 MIN=3 TH=73 PER=8
# The diff is between the LAST TWO frames; earlier frames (today's) are shown for reference.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
def label(m):  # 8-connected components of a sparse mask -> list of (ys, xs)
    pts = set(zip(*np.nonzero(m))); out = []
    while pts:
        st = [pts.pop()]; comp = []
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    q = (y + dy, x + dx)
                    if q in pts: pts.remove(q); st.append(q)
        out.append((np.array([c[0] for c in comp]), np.array([c[1] for c in comp])))
    return out
sj, pre = sys.argv[1], sys.argv[2]; frames = [a.split("=", 1) for a in sys.argv[3:]]
R = int(os.environ.get("R", 20)); Z = int(os.environ.get("Z", 4)); MIN = int(os.environ.get("MIN", 3)); TH = int(os.environ.get("TH", 73)); PER = int(os.environ.get("PER", 8))
S = json.load(open(sj))["sites"]
ims = [np.asarray(Image.open(p).convert("RGB")).astype(int) for _, p in frames]
def dil(x):
    y = x.copy(); y[1:] |= x[:-1]; y[:-1] |= x[1:]; y[:, 1:] |= x[:, :-1]; y[:, :-1] |= x[:, 1:]; return y
A = ims[-2].sum(-1) <= TH; B = ims[-1].sum(-1) <= TH
ch = (A & ~dil(B)) | (B & ~dil(A))
blobs = []
for ys, xs in label(ch):
    k = len(ys)
    if k < MIN: continue
    cy, cx = int(ys.mean()), int(xs.mean())
    a_only = int(A[ys, xs].sum()); b_only = k - a_only
    near = min(S, key=lambda s: (s["x"] - cx) ** 2 + (s["y"] - cy) ** 2)
    dn = ((near["x"] - cx) ** 2 + (near["y"] - cy) ** 2) ** 0.5
    blobs.append(dict(cx=cx, cy=cy, n=k, a=a_only, b=b_only, site=near["site"], d=round(dn)))
blobs.sort(key=lambda b: -b["n"])
print(len(blobs), "blobs;", sum(b["a"] for b in blobs), "px only in", frames[-2][0] + ",", sum(b["b"] for b in blobs), "px only in", frames[-1][0])
for b in blobs: print("  %-6s d%3d  at (%d,%d)  %s-only %d  %s-only %d" % (b["site"], b["d"], b["cx"], b["cy"], frames[-2][0], b["a"], frames[-1][0], b["b"]))
json.dump(blobs, open(pre + ".json", "w"))
for q in range(0, len(blobs), PER):
    tiles = []
    for b in blobs[q:q + PER]:
        sl = (slice(b["cy"] - R, b["cy"] + R), slice(b["cx"] - R, b["cx"] + R)); cols = []
        for im in ims:
            c = im[sl].astype(float); lo, hi = np.percentile(c, 1), np.percentile(c, 99.5); cols.append(np.clip((c - lo) / max(hi - lo, 1) * 255, 0, 255))
        a, bb = A[sl], B[sl]; D = np.zeros(a.shape + (3,)); D[a & bb] = 90; D[a & ~dil(bb)] = (255, 0, 255); D[bb & ~dil(a)] = (0, 230, 0); cols.append(D)
        sep = np.full((2 * R, 1, 3), 255.0); row = np.concatenate(sum([[c, sep] for c in cols], [])[:-1], 1).astype(np.uint8)
        tiles.append(("%s d%d (%d,%d) %+d" % (b["site"], b["d"], b["cx"], b["cy"], b["b"] - b["a"]), Image.fromarray(row).resize((row.shape[1] * Z, 2 * R * Z), Image.NEAREST)))
    W = tiles[0][1].width; H = tiles[0][1].height + 14; C = 2; rows = (len(tiles) + C - 1) // C
    sh = Image.new("RGB", (C * (W + 10), rows * H + 14), "white"); d = ImageDraw.Draw(sh)
    d.text((2, 1), " | ".join(l for l, _ in frames) + " | diff (magenta: %s only, green: %s only)" % (frames[-2][0], frames[-1][0]), fill=(0, 0, 0))
    for i, (t, T) in enumerate(tiles):
        x = (i % C) * (W + 10); y = 14 + (i // C) * H; d.text((x + 2, y), t, fill=(200, 0, 0)); sh.paste(T, (x, y + 14))
    sh.save("%s_%d.png" % (pre, q // PER)); print("->", "%s_%d.png" % (pre, q // PER))
