# K1395 s2: coloured-pixel counts per sheet frame (sat.py's rule: max - min channel > 40 and max > 60),
# today against gf before and gf now, plus the mean max-channel difference where both colour, and the
# rest / restpin / instant equality of now against before (pixels whose max channel differs at all).
#   python counts.py <out/sh> <mode> [<mode> ...]
import sys, os
import numpy as np
from PIL import Image

d = sys.argv[1]
T = 40


def load(m, c, f):
    p = os.path.join(d, f"{m}_{c}_{f}.png")
    return np.asarray(Image.open(p).convert("RGB")).astype(np.int16) if os.path.exists(p) else None


def col(a):
    return ((a.max(2) - a.min(2)) > T) & (a.max(2) > 60)


for m in sys.argv[2:]:
    print(f"== {m}")
    print("frame  today  before (x)   now (x)  | only_t only_n both  mean|d| (now)  mean|d| (before)")
    for f in [f"f{i}" for i in range(8)]:
        t, b, n = load(m, "today", f), load(m, "before", f), load(m, "now", f)
        if t is None:
            continue
        ct = col(t)
        row = f"{f:5s} {int(ct.sum()):6d}"
        md = {}
        for nm, a in (("before", b), ("now", n)):
            if a is None:
                row += "      -       "
                continue
            ca = col(a)
            row += f" {int(ca.sum()):6d} ({ca.sum() / max(ct.sum(), 1):.2f})"
            both = ct & ca
            md[nm] = (np.abs(t - a).max(2)[both].mean() if both.any() else 0.0, int((ct & ~ca).sum()), int((ca & ~ct).sum()), int(both.sum()))
        if "now" in md:
            row += f" | {md['now'][1]:6d} {md['now'][2]:6d} {md['now'][3]:6d}  {md['now'][0]:5.1f}"
        if "before" in md:
            row += f"          {md['before'][0]:5.1f}"
        print(row)
    for f in ("rest", "restpin"):
        b, n = load(m, "before", f), load(m, "now", f)
        if b is not None and n is not None:
            dd = np.abs(b - n).max(2)
            print(f"{f}: now vs before differing px {int((dd > 0).sum())} (max {int(dd.max())})")
