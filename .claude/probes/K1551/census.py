# K1551 (Muse batch 27 Run L): a detector of rp=gf's corner fault kinds that reads a frame.
#   python census.py <sites.json> <gf.png> [out.tsv]
# Per site (junction j<n> / fused tail end t<n>s|e from cap.mjs's sites.json) it writes one TSV row:
#   site x y W wedge wedgeF notch notchF sliver sliverF thin thinF bstub bstubF
# where each kind has a NUMBER (its measure, below) and a FLAG (1 = measure at/over THRESH[kind]).
# Kinds follow the eye classes of .claude/probes/K1482/classes_master.txt, grouped as the brief groups
# them: wedge, notch, sliver, thin (dot/tick/dash), bstub (break/stub). Thresholds in THRESH were set
# on the ODD-numbered sites of link A on build 0007c8df and are reported against the EVEN ones in
# calib.py's output (kept beside this file); a kind whose even-site check failed the brief's bar
# (flags under half its kind, or more clean sites than faulted ones) is left out of the census:
# its THRESH is None, its flag is always 0, and the run's handoff says so.
#
# Measures (numpy + PIL only; the frame's own stroke width first):
#   W:      the ink's stroke width from the frame itself: 2 x the median chamfer distance-to-page
#           over ridge px (local maxima of that distance). The plain mode of local thickness is 2 px
#           on any stroke (edge px dominate), so the ridge median is the width a stroke actually has.
#   wedge:  the widest inscribed disc in ink within R of the site, in strokes: 2*maxDT / W.
#           A filled angle between two strokes is locally much thicker than one stroke (~1.5+).
#   thin:   specks.py's residue: ink px a 3x3 opening removes within R (dots, ticks, dashes are
#           thinner than a stroke; a real stroke survives). speck2 within R rides along in the TSV
#           as thin2 for the calibration record.
#   sliver: narrow page channels: page-ridge px (local maxima of distance-to-ink) within 22 px of
#           the site whose distance-to-ink is 0.8..0.45*W - the centreline length of a page strip
#           narrower than a stroke, pinched between two strokes. (First tried: enclosed page holes
#           narrower than a stroke; most labelled slivers are open wedges, not enclosed eyes, and
#           1-px pinholes fire on clean sites too - that measure caught 6/16 even sites at 6 clean.
#           Enclosed-hole px are still recorded as sliverPx.)
#   notch:  a 5x5 closing's added px within R that are NOT enclosed holes: page the closing fills
#           along a stroke's open edge - a bite out of the edge (a wedge's fill is ink already,
#           a sliver's eye is enclosed, so neither is counted here). Also tried: the ridge
#           distance's dip along arms in an 8..24 px annulus (labelled sites read 0). Both miss.
#   bstub:  ink tips within R (ink px with exactly one ink neighbour): a stroke that stops short
#           (break) or a short spur (stub) ends in a tip inside the window; arms leave the window.
import json, sys
import numpy as np
from PIL import Image

THR_INK = 24          # specks.py's stroke cut: border stroke ~20, page >= 26 inside the knot
R = 30                # site window half-size, device px (specks.py uses 28)
THRESH = {"wedge": 1.85, "notch": None, "sliver": 12, "thin": 12, "bstub": None}  # calib.py, odd sites


def chamfer_dt(m):
    """Distance (px, 1 / sqrt(2) chamfer) from every True px to the nearest False px."""
    d = np.where(m, 1e9, 0.0).astype(np.float64)
    H, Wd = d.shape
    S = np.sqrt(2.0)
    for y in range(H):
        row = d[y]
        if y:
            up = d[y - 1]
            row = np.minimum(row, up + 1.0)
            row[1:] = np.minimum(row[1:], up[:-1] + S)
            row[:-1] = np.minimum(row[:-1], up[1:] + S)
        row[1:] = np.minimum(row[1:], row[:-1] + 1.0)
        d[y] = row
    for y in range(H - 1, -1, -1):
        row = d[y]
        if y < H - 1:
            dn = d[y + 1]
            row = np.minimum(row, dn + 1.0)
            row[1:] = np.minimum(row[1:], dn[:-1] + S)
            row[:-1] = np.minimum(row[:-1], dn[1:] + S)
        row[:-1] = np.minimum(row[:-1], row[1:] + 1.0)
        d[y] = row
    return d


def opening(m, k):
    H, Wd = m.shape
    er = np.ones((H - k + 1, Wd - k + 1), bool)
    for dy in range(k):
        for dx in range(k):
            er &= m[dy:H - k + 1 + dy, dx:Wd - k + 1 + dx]
    di = np.zeros_like(m)
    for dy in range(k):
        for dx in range(k):
            di[dy:H - k + 1 + dy, dx:Wd - k + 1 + dx] |= er
    return di


def morph(m, k, fn):
    """Binary dilation (fn=any) / erosion (fn=all) with a k x k square, zero-padded."""
    p = np.pad(m, k // 2)
    out = None
    for dy in range(k):
        for dx in range(k):
            v = p[dy:dy + m.shape[0], dx:dx + m.shape[1]]
            out = v.copy() if out is None else (out | v if fn == "dil" else out & v)
    return out


def holes_in(win_bg):
    """Page px of this window that the window border cannot reach through page (= enclosed)."""
    reach = np.zeros_like(win_bg)
    reach[0, :] = win_bg[0, :]; reach[-1, :] = win_bg[-1, :]
    reach[:, 0] = win_bg[:, 0]; reach[:, -1] = win_bg[:, -1]
    while True:
        grown = reach.copy()
        grown[1:, :] |= reach[:-1, :]; grown[:-1, :] |= reach[1:, :]
        grown[:, 1:] |= reach[:, :-1]; grown[:, :-1] |= reach[:, 1:]
        grown &= win_bg
        if (grown == reach).all():
            return win_bg & ~reach
        reach = grown


def main():
    sites_path, frame_path = sys.argv[1], sys.argv[2]
    out_path = sys.argv[3] if len(sys.argv) > 3 else None
    L = np.asarray(Image.open(frame_path).convert("L")).astype(np.int16)
    M = L <= THR_INK
    dt_ink = chamfer_dt(M)          # at ink px: distance to page; at page px: 0
    dt_bg = chamfer_dt(~M)          # at page px: distance to ink
    mx = np.maximum.reduce([np.roll(np.roll(dt_ink, dy, 0), dx, 1)
                            for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    ridge = M & (dt_ink >= mx - 1e-9) & (dt_ink > 1.2)
    W = 2.0 * float(np.median(dt_ink[ridge])) if ridge.any() else 6.0
    S2 = M & ~opening(M, 2)
    S3 = M & ~opening(M, 3)
    closed_add = morph(morph(M, 5, "dil"), 5, "ero") & ~M
    nb = np.zeros_like(M, dtype=np.int16)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy or dx:
                nb += np.roll(np.roll(M, dy, 0), dx, 1)
    tips = M & (nb == 1)
    bgmx = np.maximum.reduce([np.roll(np.roll(dt_bg, dy, 0), dx, 1)
                              for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    bgridge = (~M) & (dt_bg >= bgmx - 1e-9)
    sites = json.load(open(sites_path))["sites"]
    rows = ["site\tx\ty\tW\twedge\twedgeF\tnotch\tnotchF\tsliver\tsliverF\tsliverPx\tthin\tthinF\tthin2\tbstub\tbstubF"]
    nflag = {k: 0 for k in THRESH}
    for s in sites:
        x, y = round(s["x"]), round(s["y"])
        x0, x1, y0, y1 = x - R, x + R + 1, y - R, y + R + 1
        wedge = 2.0 * float(dt_ink[y0:y1, x0:x1].max()) / W
        hole = holes_in(~M[y0:y1, x0:x1])
        hole_px = int(hole.sum())
        yy, xx = np.mgrid[y0:y1, x0:x1]
        rr = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
        sliver = int((bgridge[y0:y1, x0:x1] & (dt_bg[y0:y1, x0:x1] >= 0.8)
                      & (dt_bg[y0:y1, x0:x1] <= 0.45 * W) & (rr <= 22)).sum())
        notch = int((closed_add[y0:y1, x0:x1] & ~hole).sum())
        thin = int(S3[y0:y1, x0:x1].sum()); thin2 = int(S2[y0:y1, x0:x1].sum())
        bstub = int(tips[y0:y1, x0:x1].sum())
        num = {"wedge": wedge, "notch": notch, "sliver": sliver, "thin": thin, "bstub": bstub}
        fl = {k: int(THRESH[k] is not None and num[k] >= THRESH[k]) for k in THRESH}
        for k in THRESH:
            nflag[k] += fl[k]
        rows.append(f"{s['site']}\t{x}\t{y}\t{W:.1f}\t{wedge:.3f}\t{fl['wedge']}\t{notch}\t{fl['notch']}"
                    f"\t{sliver}\t{fl['sliver']}\t{hole_px}\t{thin}\t{fl['thin']}\t{thin2}\t{bstub}\t{fl['bstub']}")
    text = "\n".join(rows) + "\n"
    if out_path:
        open(out_path, "w").write(text)
    else:
        sys.stdout.write(text)
    print(f"# frame stroke width W={W:.1f}px; sites {len(sites)}; flagged " +
          " ".join(f"{k} {nflag[k]}" for k in THRESH), file=sys.stderr)


if __name__ == "__main__":
    main()
