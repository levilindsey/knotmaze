# K1548 (27U): offline exploration of diagA captures (geo.json + shot_<mode>_<fl>.png).
# Why does the current coverage read keep 0 sides on link A, and which reference keeps them?
#   python .claude/probes/K1548/analyzeA.py <diagDir> [fl]
import json, sys
import numpy as np
from PIL import Image

d = sys.argv[1]
geo = json.load(open(f"{d}/geo.json"))
ref = np.asarray(Image.open(f"{d}/shot_today_0.png").convert("RGB")).astype(np.float64)
H, W, _ = ref.shape
hist = {}
flat = ref[::7, ::7].reshape(-1, 3).astype(int)
for k in map(tuple, flat[::1]):
    hist[k] = hist.get(k, 0) + 1
BG = np.array(max(hist.items(), key=lambda kv: kv[1])[0], dtype=np.float64)
print("BG", BG, "sides", len(geo["sides"]), "view s", geo["view"]["s"])
scale = geo["view"]["s"] * 2  # DSF 2

def px(D, x, y):
    xx = min(D.shape[1] - 1, max(0, round(x))); yy = min(D.shape[0] - 1, max(0, round(y)))
    return D[yy, xx]

rows = []
for g in geo["sides"]:
    reach = g["hOver"] + (g["slot"]["margin"] if g["slot"] else 0.1) + 0.08
    iu = next((i for i, p in enumerate(g["prof"]) if p["dO"] > reach), -1)
    if iu < 0 or iu > len(g["prof"]) - 5:
        rows.append((g, iu, None, None, None)); continue
    Uiu = px(ref, g["prof"][iu]["x"], g["prof"][iu]["y"]) - BG
    Ufar = px(ref, g["prof"][-1]["x"], g["prof"][-1]["y"]) - BG
    # median reference over the far third of the walk
    far = [px(ref, p["x"], p["y"]) - BG for p in g["prof"][max(iu, len(g["prof"]) * 2 // 3):]]
    Umed = np.median(far, axis=0) if far else Ufar
    rows.append((g, iu, Uiu, Ufar, Umed))

import collections
for name, idx in [("Uiu", 2), ("Ufar", 3), ("UmedFar", 4)]:
    norms = [float(np.linalg.norm(r[idx])) for r in rows if r[idx] is not None]
    norms = np.array(sorted(norms))
    kept1200 = int((norms ** 2 >= 1200).sum()); kept150 = int((norms ** 2 >= 150).sum()); kept40 = int((norms ** 2 >= 40).sum())
    print(f"{name}: n={len(norms)} median={np.median(norms):.1f} p10={norms[len(norms)//10]:.1f} p90={norms[9*len(norms)//10]:.1f} kept|U|^2>=1200:{kept1200} >=150:{kept150} >=40:{kept40}")
bad = [r for r in rows if r[1] < 0]
print("iu skips:", len(bad))
# colour samples of the worst sides
worst = sorted([r for r in rows if r[2] is not None], key=lambda r: float(np.linalg.norm(r[2])))[:8]
for g, iu, Uiu, Ufar, Umed in worst:
    c = g["at"]
    print(f"  x{g['ci']}{'+' if g['side']>0 else '-'}@{c} |Uiu|={np.linalg.norm(Uiu):.1f} UiuRGB={px(ref, g['prof'][iu]['x'], g['prof'][iu]['y'])} |Ufar|={np.linalg.norm(Ufar):.1f} farRGB={px(ref, g['prof'][-1]['x'], g['prof'][-1]['y'])} centreRGB={px(ref, g['prof'][0]['x'], g['prof'][0]['y'])}")
