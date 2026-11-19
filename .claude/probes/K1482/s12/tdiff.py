# K1482 s12: tupd.mjs's frames against its u0 (pixels that differ), plus the children list.
#   python tdiff.py <rawDir> <TAG> [other frames to compare against u0 ...]
import json, sys
import numpy as np
from PIL import Image
o, tag = sys.argv[1], sys.argv[2]
J = json.load(open(f"{o}/{tag}tupd.json"))
print(json.dumps(J["children"])); print("freeze", J["freeze"], "post", J["post"], "steps", J["steps"])
L = lambda n: np.asarray(Image.open(f"{o}/{n}.png").convert("RGB")).astype(int)
a = L(f"{tag}u0")
names = [f"{tag}u1", f"{tag}u30"] + [f"{tag}hide_{c['i']}" for c in J["children"] if c["visible"] and c["renderable"]] + sys.argv[3:]
for n in names:
    try:
        b = L(n)
    except Exception:
        print(n, "missing"); continue
    d = np.abs(a - b).max(2); ys, xs = np.nonzero(d > 8)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None
    print(n, "differ", int((d > 0).sum()), ">8", int((d > 8).sum()), "bbox", box)
