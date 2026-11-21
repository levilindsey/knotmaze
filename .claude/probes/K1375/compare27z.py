# K1375 (27Z): pixel-diff counts for cap27z's captures (differing pixels, any channel).
import json, sys
from PIL import Image
import numpy as np

base = ".claude/probes/K1375/out/27Z"
def diff(a, b):
    A = np.asarray(Image.open(a).convert("RGB"), dtype=np.int16)
    B = np.asarray(Image.open(b).convert("RGB"), dtype=np.int16)
    d = np.abs(A - B).max(axis=2)
    return int((d > 0).sum()), int(d.max())

for link in ["A", "plain"]:
    print(f"== {link} ==")
    for tag, x, y in [
        ("floor master (m1 vs m2)", f"{base}/{link}_master_1/gf.png", f"{base}/{link}_master_2/gf.png"),
        ("floor fix (f1 vs f2)", f"{base}/{link}_fix_1/gf.png", f"{base}/{link}_fix_2/gf.png"),
        ("cross (m1 vs f1)", f"{base}/{link}_master_1/gf.png", f"{base}/{link}_fix_1/gf.png"),
        ("cross (m2 vs f2)", f"{base}/{link}_master_2/gf.png", f"{base}/{link}_fix_2/gf.png"),
    ]:
        n, mx = diff(x, y)
        h = json.load(open(f"{base}/{link}_master_1/sites_gf.json"))["hash"]
        print(f"{tag}: {n} px (max {mx}) hash {h}")
