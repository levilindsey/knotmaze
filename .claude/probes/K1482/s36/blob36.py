# K1482 s36: where the census's wedge number comes from, per site. For every site of <sites.json> on <frame.png>
# (run 27L's detector, .claude/probes/K1551/census.py: ink = L <= 24, chamfer distance, window +-30 px, W = the
# frame's stroke width) it writes the wedge number and flag (>= 1.85 strokes) and the FAT SET of the window: the
# ink px whose inscribed disc is >= 1.85 strokes (dt >= 0.925 W), split into 8-connected blobs. Per blob: px count,
# the widest px (x, y, dt), the centroid, its length and width (principal axes, px) and up to 60 of its px (for
# class36.ts, which asks the CPU mirror what inks them).
#   python blob36.py <sites.json> <frame.png> <out.json> [only=j1,t2e,...]
import json, sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "K1551"))
from census import chamfer_dt, THR_INK, R, THRESH


def main():
    sites_path, frame_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    only = None
    for a in sys.argv[4:]:
        if a.startswith("only="):
            only = set(a[5:].split(","))
    L = np.asarray(Image.open(frame_path).convert("L")).astype(np.int16)
    M = L <= THR_INK
    dt = chamfer_dt(M)
    mx = np.maximum.reduce([np.roll(np.roll(dt, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    ridge = M & (dt >= mx - 1e-9) & (dt > 1.2)
    W = 2.0 * float(np.median(dt[ridge])) if ridge.any() else 6.0
    cut = THRESH["wedge"] * W / 2.0
    SJ = json.load(open(sites_path))
    out = {"W": W, "cut": cut, "frame": frame_path, "sites": []}
    nflag = 0
    for s in SJ["sites"]:
        if only is not None and s["site"] not in only:
            continue
        x, y = round(s["x"]), round(s["y"])
        x0, x1, y0, y1 = x - R, x + R + 1, y - R, y + R + 1
        win = dt[y0:y1, x0:x1]
        wedge = 2.0 * float(win.max()) / W
        fl = int(wedge >= THRESH["wedge"])
        nflag += fl
        rec = {"site": s["site"], "x": x, "y": y, "wedge": round(wedge, 3), "flag": fl, "blobs": []}
        if fl:
            fat = win >= cut - 1e-9
            lab = np.zeros(fat.shape, np.int32)
            n = 0
            for (iy, ix) in zip(*np.nonzero(fat)):
                if lab[iy, ix]:
                    continue
                n += 1
                st = [(iy, ix)]
                lab[iy, ix] = n
                while st:
                    cy, cx = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < fat.shape[0] and 0 <= nx < fat.shape[1] and fat[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n
                                st.append((ny, nx))
            for b in range(1, n + 1):
                ys, xs = np.nonzero(lab == b)
                d = win[ys, xs]
                k = int(d.argmax())
                # the blob's whole ink body: every ink px within its widest disc, for the length/width
                px = np.stack([xs, ys], 1).astype(float)
                c = px.mean(0)
                if len(px) > 2:
                    ev = np.linalg.eigvalsh(np.cov((px - c).T))
                    ln, wd = 4 * float(np.sqrt(max(ev[1], 0))), 4 * float(np.sqrt(max(ev[0], 0)))
                else:
                    ln, wd = float(len(px)), 1.0
                step = max(1, len(xs) // 60)
                edge = bool((xs.min() == 0) or (ys.min() == 0) or (xs.max() == fat.shape[1] - 1) or (ys.max() == fat.shape[0] - 1))
                rec["blobs"].append({"n": int(len(xs)), "mx": int(x0 + xs[k]), "my": int(y0 + ys[k]), "dt": round(float(d[k]), 2),
                                     "strokes": round(2 * float(d[k]) / W, 3), "cx": round(float(x0 + c[0]), 1), "cy": round(float(y0 + c[1]), 1),
                                     "len": round(ln, 1), "wid": round(wd, 1), "edge": edge,
                                     "px": [[int(x0 + xs[i]), int(y0 + ys[i])] for i in range(0, len(xs), step)]})
            rec["blobs"].sort(key=lambda b: -b["dt"])
        out["sites"].append(rec)
    json.dump(out, open(out_path, "w"))
    print(f"W={W:.2f} cut dt>={cut:.2f}; sites {len(out['sites'])}; wedge flagged {nflag}")


if __name__ == "__main__":
    main()
