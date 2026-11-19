# K1482 s18: the fl 0 / 1.2 check's numbers: start vs tip ink gained/lost at each fade, against two-load controls (cap18 with FLS=0/1.2).
#   python flctl18.py <raw dir holding start, tip, fls_start, fls_tip>
import sys
import numpy as np
from PIL import Image
I = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(int)
R = sys.argv[1]
pairs = {"ctl start 0.14 (two loads)": ("start/gf.png", "fls_start/gf.png"), "ctl tip 0.14 (two loads)": ("tip/gf.png", "fls_tip/gf.png"),
         "start-tip 0.14 (fls loads)": ("fls_start/gf.png", "fls_tip/gf.png"), "start-tip fl0": ("fls_start/gf_fls0.png", "fls_tip/gf_fls0.png"), "start-tip fl1.2": ("fls_start/gf_fls1.2.png", "fls_tip/gf_fls1.2.png")}
for k, (a, b) in pairs.items():
    A, B = I(f"{R}/{a}").sum(2), I(f"{R}/{b}").sum(2)
    ia, ib = A <= 73, B <= 73
    gain = int((~ia & ib).sum()); loss = int((ia & ~ib).sum())
    big = int(((np.abs(A - B) > 24)).sum())
    print(f"{k:32s} ink gain {gain:6d} loss {loss:6d}  |rgb diff|>24: {big}")
