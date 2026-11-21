# K1566 (27R): compare one capture session b1,n1,q1,b2,n2 (BASE, narrow, Q, BASE, narrow).
#   python diff27r.py <capRoot> <count_before.txt>
# Per scene/look changed px; fill thread->ground; BASE-fix places (diffcap.py's routine);
# (c) BASE-fix px inside the 89 without-counter places of out/27Q/diffcap.json;
# (d) Q-fix px inside each with-counter place; (e) plain px outside dilated fill places.
import json, sys
from collections import Counter, deque
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27R")
count_path = sys.argv[2] if len(sys.argv) > 2 else ".claude/probes/K1561/out/27Q/count_before.txt"
q_places_path = Path(".claude/probes/K1561/out/27Q/diffcap.json")
import re

# counter places from count_before.txt (scene, x, y)
tool = []
scene = None
raw = Path(count_path).read_bytes()
txt = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig", "replace")
for line in txt.splitlines():
    m = re.match(r"scene (\S+):", line)
    if m:
        scene = m.group(1); continue
    m = re.search(r"world ([\d.\-]+):([\d.\-]+)", line)
    if m and scene:
        tool.append((scene, float(m.group(1)), float(m.group(2))))

q_all = json.loads(q_places_path.read_text())["places"] if q_places_path.exists() else []
tol = 0.35
def has_counter(p):
    return any(sc == p["scene"] and abs(x - p["world"][0]) < tol and abs(y - p["world"][1]) < tol for sc, x, y in tool)
in_scope = [p for p in q_all if p["scene"] in {t[0] for t in tool}]
with_c = [p for p in in_scope if has_counter(p)]
without_c = [p for p in in_scope if not has_counter(p)]

def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

def changed(a, b):
    return np.any(a != b, axis=2)

def ground_of(img):
    flat = img.reshape(-1, 3)
    cnt = Counter(map(tuple, flat[::7].tolist()))
    return np.array(cnt.most_common(1)[0][0], dtype=np.int16)

def places(mask, meta):
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
    cy, cx = np.nonzero(mask)
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
        out.append({"n": len(pix), "dev": [round(float(mx), 1), round(float(my), 1)],
                    "bboxDev": [int(arr[:, 1].min()), int(arr[:, 0].min()), int(arr[:, 1].max()), int(arr[:, 0].max())],
                    "world": [round(float((mx / dpr - vx) / s), 3), round(float((my / dpr - vy) / s), 3)]})
    out.sort(key=lambda p: -p["n"])
    return out, dil

def in_box(mask, box, pad=0):
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad); x1 = min(mask.shape[1] - 1, x1 + pad); y1 = min(mask.shape[0] - 1, y1 + pad)
    return int(mask[y0:y1 + 1, x0:x1 + 1].sum())

scenes = sorted({p.name for p in (root / "b1").iterdir() if p.is_dir()}) if (root / "b1").exists() else []
lines, bn_places, d_list = [], [], []
tot = Counter()
for sc in scenes:
    def img(tag, look):
        return load(root / tag / sc / f"{look}.png")
    def meta(tag):
        return json.loads((root / tag / sc / "meta.json").read_text())
    res = {}
    imgs = {}
    for look in ("fill", "border", "plain"):
        try:
            b1, n1, q1, b2, n2 = img("b1", look), img("n1", look), img("q1", look), img("b2", look), img("n2", look)
        except FileNotFoundError as e:
            res[look] = f"missing {e.filename}"; continue
        imgs[look] = (b1, n1, q1, b2, n2)
        res[look] = {"b1n1": int(changed(b1, n1).sum()), "b2n2": int(changed(b2, n2).sum()),
                     "b1b2": int(changed(b1, b2).sum()), "n1n2": int(changed(n1, n2).sum()),
                     "q1n1": int(changed(q1, n1).sum()), "b1q1": int(changed(b1, q1).sum())}
        for k, v in res[look].items():
            tot[f"{look}_{k}"] += v
    b1f, n1f, q1f = imgs["fill"][0], imgs["fill"][1], imgs["fill"][2]
    g = ground_of(b1f)
    def t2g(m, f):
        return int((np.any(m != g, axis=2) & ~np.any(f != g, axis=2)).sum())
    tg1, tg2 = t2g(b1f, n1f), t2g(imgs["fill"][3], imgs["fill"][4])
    tot["thread2ground"] += tg1 + tg2
    mask_bn = changed(b1f, n1f)
    pl, dil_bn = places(mask_bn, meta("b1"))
    for p in pl:
        p["scene"] = sc; bn_places.append(p)
    # (e) plain changed px outside dilated fill places
    plain_out = 0
    if "plain" in imgs:
        pmask = changed(imgs["plain"][0], imgs["plain"][1])
        plain_out = int((pmask & ~dil_bn).sum())
    tot["plain_outside_fill"] += plain_out
    # hashes
    hs = {t: meta(t).get("hash") for t in ("b1", "n1", "q1", "b2", "n2")}
    lines.append(f"scene {sc}: {res} ground {g.tolist()} thread->ground b1n1 {tg1} b2n2 {tg2} placesBn {len(pl)} plainOutside {plain_out} hashes {hs}")
    # (d) Q-fix px in each with-counter place of this scene (box from 27Q place, mapped via its bboxDev in its own session; views agree, use box directly)
    mask_qn = changed(q1f, n1f)
    for p in with_c:
        if p["scene"] != sc:
            continue
        n_in = in_box(mask_qn, p["bboxDev"], pad=2)
        d_list.append({"scene": sc, "world": p["world"], "nQ": p["n"], "qnPxInBox": n_in, "bboxDev": p["bboxDev"]})
    # (c) BASE-fix px in each without-counter place
    c_px = 0
    for p in without_c:
        if p["scene"] == sc:
            c_px += in_box(mask_bn, p["bboxDev"], pad=2)
    tot[f"c_px"] += c_px
    lines.append(f"  (c) without-counter places BASE-fix px in boxes: {c_px}; (d) places so far {len(d_list)}")

lines.append(f"TOTALS {dict(tot)} bnPlaces {len(bn_places)} bnPx {sum(p['n'] for p in bn_places)} withCounter {len(with_c)} withoutCounter {len(without_c)}")
(root / "diff27r.json").write_text(json.dumps({"places": bn_places, "d": d_list}, indent=1))
out_txt = "\n".join(lines)
(root / "diff27r.txt").write_text(out_txt)
print(out_txt)
print(f"(d) Q-fix px per with-counter place (qnPxInBox): nonzero {sum(1 for d in d_list if d['qnPxInBox']>0)} of {len(d_list)}, total in boxes {sum(d['qnPxInBox'] for d in d_list)}")
for d in sorted(d_list, key=lambda d: -d["qnPxInBox"])[:20]:
    print(f"  d {d['scene']} {d['world'][0]:.3f}:{d['world'][1]:.3f} Qplace {d['nQ']}px qnInBox {d['qnPxInBox']}")
