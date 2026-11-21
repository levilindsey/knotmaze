# K1544 (Run 27I): pairwise numbers for repro.mjs's loads.
#   python .claude/probes/K1544/analyze.py <outDir> [renderers=today,gf]
# Per pair of loads of one renderer: whether the probe hashes agree, the
# largest particle position difference (Euclidean, world units and device
# px at the pair's view scale), which particle it is, exact-bit agreement
# of positions/prev/zPos/passes, whether the bit-still views agree, and
# the px over 24 levels in the thread area (x < 0.78 of the frame, as in
# K1223's k1223_diff.py). Writes pairs.json beside the captures.
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

out = Path(sys.argv[1])
renderers = (sys.argv[2] if len(sys.argv) > 2 else "today,gf").split(",")

def arr(rec, key):
    a = np.array(rec[key], dtype=np.float64)
    return a

def field_diff(a, b):
    d = np.abs(a - b)
    d = np.where(np.isnan(a) & np.isnan(b), 0.0, d)
    return float(np.nanmax(d)) if d.size else 0.0

rows = []
for mode in renderers:
    dumps = []
    for p in sorted(out.glob(f"{mode}_load*.json")):
        dumps.append((p.stem, json.loads(p.read_text())))
    dumps.sort(key=lambda kv: kv[1]["load"])
    for name, r in dumps:
        cl = r.get("clocks") or {}
        vs = r.get("viewStill") or {}
        print(f"LOAD {name}: hash {r['hash']} simT {r['simTime']} asleep {r.get('asleep')} flowTime {cl.get('flowTime')} paintClock {cl.get('paintClock')} viewStill {vs.get('v')}")
    for i in range(len(dumps)):
        for j in range(i + 1, len(dumps)):
            (na, a), (nb, b) = dumps[i], dumps[j]
            pa, pb = arr(a, "positions").reshape(-1, 2), arr(b, "positions").reshape(-1, 2)
            delta = pb - pa
            dist = np.hypot(delta[:, 0], delta[:, 1])
            k = int(np.argmax(dist))
            sa = (a.get("viewStill") or {}).get("s") or a["view"]["s"]
            dpr = (a.get("viewStill") or {}).get("dpr") or 2
            dev_scale = float(sa) * float(dpr)
            va, vb = a.get("viewStill"), b.get("viewStill")
            if va and vb:
                view_same = va["v"] == vb["v"]
                view_ddev = max(abs(vb["x"] - va["x"]), abs(vb["y"] - va["y"])) * float(dpr)
            else:
                view_same, view_ddev = None, None
            ia = np.asarray(Image.open(out / f"{na}.png").convert("RGB")).astype(np.int16)
            ib = np.asarray(Image.open(out / f"{nb}.png").convert("RGB")).astype(np.int16)
            d = np.abs(ia - ib).max(axis=2)
            tx = int(0.78 * d.shape[1])
            thread = d[:, :tx]
            ys, xs = np.nonzero(thread > 24)
            bbox = f"x{xs.min()}..{xs.max()} y{ys.min()}..{ys.max()}" if len(xs) else "-"
            row = {
                "pair": f"{na} vs {nb}", "hashA": a["hash"], "hashB": b["hash"], "hashSame": a["hash"] == b["hash"],
                "simA": a["simTime"], "simB": b["simTime"],
                "posBitsSame": bool(np.array_equal(arr(a, "positions"), arr(b, "positions"), equal_nan=True)),
                "prevBitsSame": bool(np.array_equal(arr(a, "prev"), arr(b, "prev"), equal_nan=True)),
                "zBitsSame": bool(np.array_equal(arr(a, "zPos"), arr(b, "zPos"), equal_nan=True)),
                "passesBitsSame": bool(np.array_equal(arr(a, "passes"), arr(b, "passes"), equal_nan=True)),
                "maxPosWorld": float(dist[k]), "maxPosParticle": k,
                "maxPosDx": float(delta[k, 0]), "maxPosDy": float(delta[k, 1]),
                "maxPosDevPx": float(dist[k] * dev_scale), "devScale": dev_scale,
                "meanPosWorld": float(dist.mean()), "particlesOver01": int((dist > 0.1).sum()),
                "particlesOver001": int((dist > 0.01).sum()), "particlesOver1em6": int((dist > 1e-6).sum()),
                "maxPrev": field_diff(arr(a, "prev"), arr(b, "prev")),
                "maxZ": field_diff(arr(a, "zPos"), arr(b, "zPos")),
                "maxPasses": field_diff(arr(a, "passes"), arr(b, "passes")),
                "viewSame": view_same, "viewDeltaDevPx": view_ddev,
                "viewA": va, "viewB": vb,
                "pxOver24Thread": int((thread > 24).sum()), "pxOver24Whole": int((d > 24).sum()),
                "maxLevelThread": int(thread.max()), "bboxOver24Thread": bbox,
            }
            rows.append(row)
            print(f"{row['pair']}: hash {'SAME ' + row['hashA'] if row['hashSame'] else row['hashA'] + ' vs ' + row['hashB']} "
                  f"posBits {'same' if row['posBitsSame'] else 'DIFFER'} maxPos {row['maxPosWorld']:.6g} world = {row['maxPosDevPx']:.3g} devpx (particle {k}) "
                  f"over0.1 {row['particlesOver01']} view {'same' if view_same else 'DIFFER ' + str(view_ddev)} "
                  f"px>24 thread {row['pxOver24Thread']} max {row['maxLevelThread']}")
(out / "pairs.json").write_text(json.dumps(rows, indent=1))
print(f"{len(rows)} pairs -> {out / 'pairs.json'}")
