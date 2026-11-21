# K1561 (27Q): compare one capture session's shots per scene (master vs fix, floors).
#   python .claude/probes/K1561/diffcap.py <capRoot> [out.txt]
# Expects <capRoot>/{m1,f1,m2,f2}/<scene>/{fill,border,plain}.png + meta.json (screen3.mjs).
# Per scene and look: changed px (any RGB channel differs) for m1-f1, m2-f2, m1-m2, f1-f2.
# Fill ground check: ground = the most common RGB in m1's fill; counts fill px that were
# not ground on master and are ground with the fix (thread -> ground), m1-f1 and m2-f2.
# Fill changed places: 8-connected components of m1-f1 changed px, gaps of 2 px bridged
# (dilation), each with device bbox/centroid, world centroid (meta view: world =
# (device/dpr - view.xy) / view.s), and changed px. Written as JSON beside the text.
import json, sys
from collections import Counter, deque
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27Q")
scenes = sorted({p.name for p in (root / "m1").iterdir() if p.is_dir()}) if (root / "m1").exists() else []
lines, all_places = [], []

def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

def changed(a, b):
    return np.any(a != b, axis=2)

def ground_of(img):
    flat = img.reshape(-1, 3)
    # most common colour, counted on a stride to bound memory/time
    cnt = Counter(map(tuple, flat[::7].tolist()))
    return np.array(cnt.most_common(1)[0][0], dtype=np.int16)

def places(mask, meta):
    # dilate by 2 (Chebyshev) to bridge 2 px gaps, label, then map back to real px
    H, W = mask.shape
    dil = mask.copy()
    for _ in range(2):
        d = dil.copy()
        d[1:, :] |= dil[:-1, :]; d[:-1, :] |= dil[1:, :]; d[:, 1:] |= dil[:, :-1]; d[:, :-1] |= dil[:, 1:]
        d[1:, 1:] |= dil[:-1, :-1]; d[1:, :-1] |= dil[:-1, 1:]; d[:-1, 1:] |= dil[1:, :-1]; d[:-1, :-1] |= dil[1:, 1:]
        dil = d
    seen = np.zeros_like(mask)
    view = meta.get("view") or {}; dpr = meta.get("dpr") or 3
    s = view.get("s") or 1; vx = view.get("x") or 0; vy = view.get("y") or 0
    out = []
    ys, xs = np.nonzero(dil & ~seen)
    # BFS over dilated mask, scanning seeds from changed px only
    cy, cx = np.nonzero(mask)
    seedset = set()
    for y, x in zip(cy.tolist(), cx.tolist()):
        if seen[y, x] or not dil[y, x]:
            continue
        q = deque([(y, x)]); seen[y, x] = True; pix = []
        while q:
            y0, x0 = q.popleft()
            if mask[y0, x0]:
                pix.append((y0, x0))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y0 + dy, x0 + dx
                    if 0 <= ny < H and 0 <= nx < W and dil[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        if not pix:
            continue
        arr = np.array(pix, dtype=np.float64)
        my, mx = arr.mean(axis=0)
        out.append({
            "n": len(pix),
            "dev": [round(float(mx), 1), round(float(my), 1)],
            "bboxDev": [int(arr[:, 1].min()), int(arr[:, 0].min()), int(arr[:, 1].max()), int(arr[:, 0].max())],
            "world": [round(float((mx / dpr - vx) / s), 3), round(float((my / dpr - vy) / s), 3)],
        })
    out.sort(key=lambda p: -p["n"])
    return out

tot = Counter()
for sc in scenes:
    def img(tag, look):
        return load(root / tag / sc / f"{look}.png")
    def meta(tag):
        return json.loads((root / tag / sc / "meta.json").read_text())
    res = {}
    for look in ("fill", "border", "plain"):
        try:
            m1, f1, m2, f2 = img("m1", look), img("f1", look), img("m2", look), img("f2", look)
        except FileNotFoundError as e:
            res[look] = f"missing {e.filename}"; continue
        res[look] = {
            "m1f1": int(changed(m1, f1).sum()), "m2f2": int(changed(m2, f2).sum()),
            "m1m2": int(changed(m1, m2).sum()), "f1f2": int(changed(f1, f2).sum()),
        }
        tot[f"{look}_m1f1"] += res[look]["m1f1"]; tot[f"{look}_m1m2"] += res[look]["m1m2"]; tot[f"{look}_f1f2"] += res[look]["f1f2"]
    # ground check on fill
    m1f, f1f = img("m1", "fill"), img("f1", "fill")
    g = ground_of(m1f)
    def t2g(m, f):
        return int((np.any(m != g, axis=2) & ~np.any(f != g, axis=2)).sum())
    tg1 = t2g(m1f, img("f1", "fill")); tg2 = t2g(img("m2", "fill"), img("f2", "fill"))
    tot["thread2ground"] += tg1 + tg2
    pl = places(changed(m1f, f1f), meta("m1"))
    for p in pl:
        p["scene"] = sc; all_places.append(p)
    tot["places"] += len(pl); tot["fillChangedPxPlaces"] += sum(p["n"] for p in pl)
    lines.append(f"scene {sc}: fill {res.get('fill')} border {res.get('border')} plain {res.get('plain')} ground {g.tolist()} thread->ground m1f1 {tg1} m2f2 {tg2} places {len(pl)} top {pl[:3]}")

lines.append(f"TOTALS {dict(tot)} placesTotal {len(all_places)}")
(root / "diffcap.json").write_text(json.dumps({"places": all_places}, indent=1))
txt = "\n".join(lines)
(root / "diffcap.txt").write_text(txt)
print(txt)
