# K1566 (27S): numbers for one session b1,n1,q1,b2,n2 (BASE, fix, Q, BASE, fix).
#   python analyze27s.py <capRoot> <count_before.txt>
# A scene counts only when b1-b2 and n1-n2 are 0 px in fill, border, plain (K1534).
# (b) reworded: a BASE-fix changed fill place with no counter place within 0.35 world
#     passes iff Q-fix is 0 px in its 80 px box AND its largest per-pixel step
#     (max channel |BASE-fix| on its changed px) is at most 8 levels.
# (c) stub places: fix vs BASE 0 px in the 80 px box centred on the world point.
# (d) Q-fix changed fill places (same place routine), each listed with px.
# (e) border BASE-fix px; (f) fill thread->ground BASE->fix px.
import json, re, sys
from collections import Counter, deque
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27S")
count_path = Path(sys.argv[2] if len(sys.argv) > 2 else ".claude/probes/K1561/out/27Q/count_before.txt")
raw = count_path.read_bytes()
txt = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig", "replace")
tool, scene = [], None
for line in txt.splitlines():
    m = re.match(r"scene (\S+):", line)
    if m: scene = m.group(1); continue
    m = re.search(r"world ([\d.\-]+):([\d.\-]+)", line)
    if m and scene: tool.append((scene, float(m.group(1)), float(m.group(2))))
STUBS = [("muse_hash", 30.744, 20.181), ("muse_hash", 21.722, 34.462),
         ("muse_hash", 6.178, 4.541), ("g41_user_tw64", 15.305, 6.316)]

def load(p): return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)
def changed(a, b): return np.any(a != b, axis=2)
def ground_of(img):
    flat = img.reshape(-1, 3)
    return np.array(Counter(map(tuple, flat[::7].tolist())).most_common(1)[0][0], dtype=np.int16)

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
        if seen[y, x] or not dil[y, x]: continue
        q = deque([(y, x)]); seen[y, x] = True; pix = []
        while q:
            y0, x0 = q.popleft()
            if mask[y0, x0]: pix.append((y0, x0))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y0 + dy, x0 + dx
                    if 0 <= ny < H and 0 <= nx < W and dil[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        if not pix: continue
        arr = np.array(pix, dtype=np.float64); my, mx = arr.mean(axis=0)
        out.append({"n": len(pix), "dev": [round(float(mx), 1), round(float(my), 1)],
                    "bboxDev": [int(arr[:, 1].min()), int(arr[:, 0].min()), int(arr[:, 1].max()), int(arr[:, 0].max())],
                    "world": [round(float((mx / dpr - vx) / s), 3), round(float((my / dpr - vy) / s), 3)]})
    out.sort(key=lambda p: -p["n"])
    return out

def box80(meta, wx, wy):
    view = meta.get("view") or {}; dpr = meta.get("dpr") or 3
    s = view.get("s") or 1
    cx = (wx * s + (view.get("x") or 0)) * dpr; cy = (wy * s + (view.get("y") or 0)) * dpr
    return [int(round(cx)) - 40, int(round(cy)) - 40, int(round(cx)) + 40, int(round(cy)) + 40]

def in_box(mask, box):
    x0, y0, x1, y1 = box
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(mask.shape[1] - 1, x1); y1 = min(mask.shape[0] - 1, y1)
    return int(mask[y0:y1 + 1, x0:x1 + 1].sum())

scenes = sorted({p.name for p in (root / "b1").iterdir() if p.is_dir()}) if (root / "b1").exists() else []
lines, result = [], {"scenes": {}, "bnPlaces": [], "bFails": [], "dPlaces": [], "stubs": []}
for sc in scenes:
    def img(tag, look): return load(root / tag / sc / f"{look}.png")
    def meta(tag): return json.loads((root / tag / sc / "meta.json").read_text())
    S = {}
    imgs = {}
    for look in ("fill", "border", "plain"):
        b1, n1, q1, b2, n2 = img("b1", look), img("n1", look), img("q1", look), img("b2", look), img("n2", look)
        imgs[look] = (b1, n1, q1, b2, n2)
        S[look] = {"b1b2": int(changed(b1, b2).sum()), "n1n2": int(changed(n1, n2).sum()),
                   "b1n1": int(changed(b1, n1).sum()), "q1n1": int(changed(q1, n1).sum())}
    counts = all(S[l]["b1b2"] == 0 and S[l]["n1n2"] == 0 for l in S)
    b1f, n1f, q1f = imgs["fill"][0], imgs["fill"][1], imgs["fill"][2]
    g = ground_of(b1f)
    t2g = int((np.any(b1f != g, axis=2) & ~np.any(n1f != g, axis=2)).sum())
    bn_mask = changed(b1f, n1f)
    bn = places(bn_mask, meta("b1"))
    step = np.abs(b1f - n1f).max(axis=2)
    qn_mask = changed(q1f, n1f)
    tool_scenes = {t[0] for t in tool}
    b_list = []
    for p in bn:
        p["scene"] = sc
        has_c = any(s2 == sc and abs(x - p["world"][0]) < 0.35 and abs(y - p["world"][1]) < 0.35 for s2, x, y in tool)
        p["hasCounter"] = has_c
        if not has_c and sc in tool_scenes:
            box = box80(meta("b1"), p["world"][0], p["world"][1])
            qn = in_box(qn_mask, box)
            x0, y0, x1, y1 = p["bboxDev"]
            msub = bn_mask[y0:y1 + 1, x0:x1 + 1]
            mx = int(step[y0:y1 + 1, x0:x1 + 1][msub].max()) if msub.any() else 0
            qn_own = int(qn_mask[y0:y1 + 1, x0:x1 + 1][msub].sum())
            ok = (qn == 0 and mx <= 8)
            b_list.append({"world": p["world"], "n": p["n"], "qnIn80": qn, "qnOwn": qn_own, "maxStep": mx, "pass": ok, "bboxDev": p["bboxDev"]})
            if not ok: result["bFails"].append({"scene": sc, **b_list[-1]})
        elif not has_c:
            result.setdefault("outOfScope", []).append({"scene": sc, "world": p["world"], "n": p["n"]})
        result["bnPlaces"].append(p)
    dpl = places(qn_mask, meta("b1"))
    for p in dpl:
        p["scene"] = sc; result["dPlaces"].append(p)
    stubs = []
    for s2, wx, wy in STUBS:
        if s2 != sc: continue
        box = box80(meta("b1"), wx, wy)
        v = {"scene": sc, "world": [wx, wy], "bnPx": in_box(changed(b1f, n1f), box), "qnPx": in_box(qn_mask, box)}
        stubs.append(v); result["stubs"].append(v)
    hs = {t: meta(t).get("hash") for t in ("b1", "n1", "q1", "b2", "n2")}
    result["scenes"][sc] = {"counts": counts, "looks": S, "borderBn": S["border"]["b1n1"],
                            "thread2ground": t2g, "bnPx": int(changed(b1f, n1f).sum()),
                            "bnPlaces": len(bn), "bNoCounter": b_list, "dPlaces": len(dpl),
                            "dPx": sum(p["n"] for p in dpl), "stubs": stubs, "hashes": hs}
    lines.append(f"scene {sc}: counts={counts} {S} ground {g.tolist()} thread->ground {t2g} "
                 f"bnPlaces {len(bn)} bNoCounter {len(b_list)} bFail {sum(1 for b in b_list if not b['pass'])} "
                 f"dPlaces {len(dpl)} hashes {hs}")
    for b in b_list:
        lines.append(f"  (b) {sc} {b['world'][0]:.3f}:{b['world'][1]:.3f} {b['n']}px qnIn80 {b['qnIn80']} qnOwn {b['qnOwn']} maxStep {b['maxStep']} {'PASS' if b['pass'] else 'FAIL'}")
    for v in stubs:
        lines.append(f"  (c) stub {sc} {v['world'][0]:.3f}:{v['world'][1]:.3f} fixVsBase {v['bnPx']} qVsFix {v['qnPx']}")
result["dPlaces"].sort(key=lambda p: -p["n"])
lines.append(f"countedScenes {sum(1 for v in result['scenes'].values() if v['counts'])} of {len(scenes)}; "
             f"bFails {len(result['bFails'])}; dPlaces {len(result['dPlaces'])} ({sum(p['n'] for p in result['dPlaces'])} px)")
for p in result["dPlaces"][:20]:
    lines.append(f"  (d) {p['scene']} {p['world'][0]:.3f}:{p['world'][1]:.3f} {p['n']}px")
(root / "analyze27s.json").write_text(json.dumps(result, indent=1))
(root / "analyze27s.txt").write_text("\n".join(lines))
print("\n".join(lines))
