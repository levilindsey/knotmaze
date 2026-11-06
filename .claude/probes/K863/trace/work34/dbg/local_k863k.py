r"""K863 J3k task 6: the candidates' locality and their spots, piece by piece, against v6.8.
For every word: v6.8 and each candidate assembled by gen_k863k (with_ref off: the pieces only), and every piece compared
exactly (letters' strokes by their cubics; joins, leads and tails by their quintic coefficients). A piece that differs
is IN the candidate's spot when it is the stroke a form names (a dot form: every own i/j's dot stroke; a fin form: the
word's last letter's stroke), a tail of q when the candidate refits q's prm, or a tail the candidate adds; anything else
that differs is OUTSIDE the spot (the check: 0). The words each candidate changes are listed (its census runs on them).
At the spot:
  cuts (s, p): the stroke's end (body fu), direction, curvature, the length removed, the end's distance to the font
      skeleton and to the skeleton's nearest end; the stroke's two-sided distance to the glyph's skeleton (ink off the
      font's path: max over the stroke; font's path not drawn: max over the skeleton within 60 fu of the end).
  dots (i, j): the pen ink (every point within half the pen of the centreline) against the font's dot (the glyph's
      contour above y 600 at wght 100), rastered at 4 px/fu: IoU, areas, ink outside the font dot, font dot uncovered,
      centroid offset, the ink's semi-axes and major axis (area moments), and the unfilled hole inside a closed loop.
  q's tail: Hausdorff to v6.8's tail, the direction range along it (a backtrack shows as a range past the exit angle).
The join solver's result is memoised by its own arguments (bodies, ports, pair, offset, shear, pins: no join_params
field reaches it), so each pair is solved once per process; everything that reads join_params is recomputed per
candidate.
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\local_k863k.py <v6.8 dir> <ports.json> <variant> <cand dir> <out.txt> <out.json>
      <cand,cand,...> --words "<w,w,...>"     (a word may hold spaces: the list is split on commas)"""
import copy
import json
import math
import os
import sys
import time

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k863k as G  # noqa: E402
import gen_k1027 as G27  # noqa: E402
import join_k926 as J  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
U = 0.24
H = 9.2 / 2.0 / U
PX = 4.0                       # raster px per fu (dots)

_solve = G27.solve_join
_memo = {}


def _plain(o):
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (list, tuple)):
        return [_plain(x) for x in o]
    if isinstance(o, dict):
        return {str(k): _plain(v) for k, v in o.items()}
    return o


def solve_memo(B, ports, Lk, Rk, dxR, shearR, pins):
    key = (id(B), id(ports), Lk, Rk, float(dxR), repr(_plain(shearR)), json.dumps(_plain(pins), sort_keys=True, default=str))
    if key not in _memo:
        _memo[key] = _solve(B, ports, Lk, Rk, dxR, shearR, pins)
    return copy.deepcopy(_memo[key])


G27.solve_join = solve_memo


def bez_pts(b, n=64):
    b = np.asarray(b, float)
    t = np.linspace(0.0, 1.0, n)[:, None]
    return ((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + t ** 3 * b[3]


def dense(bzs, step=0.1):
    out = []
    for b in bzs:
        b = np.asarray(b, float)
        ln = float(np.linalg.norm(np.diff(b, axis=0), axis=1).sum())
        out.append(bez_pts(b, max(8, int(ln / step) + 2)))
    return np.vstack(out)


def length(P):
    return float(np.linalg.norm(np.diff(P, axis=0), axis=1).sum())


def same_arr(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    return a.shape == b.shape and bool(np.array_equal(a, b))


def same_coeffs(c0, c1):
    return len(c0) == len(c1) and all(same_arr(a, b) for a, b in zip(c0, c1))


def moments(mask, x0, y0):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return None
    px = x0 + (xs + 0.5) / PX
    py = y0 - (ys + 0.5) / PX
    c = np.array([px.mean(), py.mean()])
    cov = np.cov(np.vstack([px, py]))
    w, v = np.linalg.eigh(cov)
    d = v[:, 1] if v[0, 1] >= 0 else -v[:, 1]
    return dict(c=c, semi=2.0 * np.sqrt(np.maximum(w, 0.0)), ang=math.degrees(math.atan2(d[1], d[0])),
                area=len(xs) / PX / PX)


_DOT, _SKG = {}, {}


def dot_measure(stroke, poly):
    """The pen ink of a dot stroke against the font's dot polygon (both word fu); memoised by content."""
    key = (np.asarray(stroke, float).tobytes(), np.asarray(poly, float).tobytes())
    if key not in _DOT:
        _DOT[key] = _dot_measure(stroke, poly)
    return _DOT[key]


def _dot_measure(stroke, poly):
    P = dense(stroke, 0.1)
    lo = np.minimum(P.min(0) - H, poly.min(0)) - 4.0
    hi = np.maximum(P.max(0) + H, poly.max(0)) + 4.0
    x0, y0 = float(lo[0]), float(hi[1])
    W, Hh = int((hi[0] - lo[0]) * PX) + 1, int((hi[1] - lo[1]) * PX) + 1
    xs = x0 + (np.arange(W) + 0.5) / PX
    ys = y0 - (np.arange(Hh) + 0.5) / PX
    gx, gy = np.meshgrid(xs, ys)
    d = cKDTree(P).query(np.stack([gx.ravel(), gy.ravel()], 1))[0].reshape(Hh, W)
    ink = d <= H
    im = Image.new("L", (W, Hh), 0)
    ImageDraw.Draw(im).polygon([((x - x0) * PX, (y0 - y) * PX) for x, y in poly], fill=1)
    font = np.asarray(im, bool)
    closed = float(np.linalg.norm(np.asarray(stroke[0][0], float) - np.asarray(stroke[-1][3], float))) < 1e-6
    hole = 0.0
    if closed:
        im2 = Image.new("L", (W, Hh), 0)
        ImageDraw.Draw(im2).polygon([((x - x0) * PX, (y0 - y) * PX) for x, y in P], fill=1)
        inside = np.asarray(im2, bool)
        hole = float((inside & ~ink).sum()) / PX / PX
    inter, uni = float((ink & font).sum()), float((ink | font).sum())
    mi, mf = moments(ink, x0, y0), moments(font, x0, y0)
    a2 = U * U
    return dict(iou=inter / uni, ink_u2=ink.sum() / PX / PX * a2, font_u2=font.sum() / PX / PX * a2,
                out_u2=float((ink & ~font).sum()) / PX / PX * a2, uncov_u2=float((font & ~ink).sum()) / PX / PX * a2,
                c_off_u=float(np.linalg.norm(mi["c"] - mf["c"])) * U,
                ink_axes_u=[float(mi["semi"][1] * 2 * U), float(mi["semi"][0] * 2 * U)], ink_ang=mi["ang"],
                font_axes_u=[float(mf["semi"][1] * 2 * U), float(mf["semi"][0] * 2 * U)], font_ang=mf["ang"],
                hole_u2=hole * a2, closed=closed)


def end_info(bzs):
    p, Tn, kk = L.bez_frame(bzs[-1], 1.0)
    return np.asarray(p, float), math.degrees(math.atan2(Tn[1], Tn[0])), float(kk) / U


def cut_measure(font, g, st0, st1, x0):
    kg = (g["name"], round(float(g["x"]), 3))
    if kg not in _SKG:
        _SKG[kg] = J.skel_graph(font, g, origin=0.0)
    sk = _SKG[kg]
    S = np.asarray(sk.fu, float)
    ends = S[sk.deg == 1]
    tS = cKDTree(S)
    out = {}
    for nm, st in (("v68", st0), ("cand", st1)):
        p, ang, k = end_info(st)
        D = dense(st, 0.25)
        dS = tS.query(D)[0]
        near = S[np.linalg.norm(S - p, axis=1) <= 60.0]
        dD = cKDTree(D).query(near)[0] if len(near) else np.zeros(1)
        out[nm] = dict(end=[float(p[0] - x0), float(p[1])], dir=ang, k_u=k, len_u=length(D) * U,
                       skel_u=float(tS.query(p)[0]) * U, skel_end_u=float(np.min(np.linalg.norm(ends - p, axis=1))) * U,
                       off_path_u=float(dS.max()) * U, undrawn_u=float(dD.max()) * U)
    D0 = dense(st0, 0.25)
    keep = cKDTree(dense(st1, 0.25)).query(D0)[0] > 0.3
    out["removed_u"] = out["v68"]["len_u"] - out["cand"]["len_u"]
    out["removed_off_path_u"] = float(tS.query(D0[keep])[0].max()) * U if keep.any() else 0.0
    return out


def tail_measure(c0, c1):
    P0, P1 = L.sample_c(c0, 1500), L.sample_c(c1, 1500)
    h = max(cKDTree(P0).query(P1)[0].max(), cKDTree(P1).query(P0)[0].max()) * U
    rng = []
    for c in (c0, c1):
        t = np.linspace(0, 1, 1500)
        D1 = np.stack([sum(i * ci[d] * t ** (i - 1) for i, ci in enumerate(c) if i >= 1) for d in (0, 1)], 1)
        a = np.degrees(np.arctan2(D1[:, 1], D1[:, 0]))
        rng.append([float(a.min()), float(a.max())])
    return dict(haus_u=float(h), dir_v68=rng[0], dir_cand=rng[1], len_v68_u=length(P0) * U, len_cand_u=length(P1) * U)


def main():
    a = sys.argv[1:]
    i = a.index("--words")
    words = a[i + 1].split(",")
    a = a[:i] + a[i + 2:]
    bd, pp, var, cd, out_txt, out_json, names = a[0], a[1], a[2], a[3], a[4], a[5], a[6].split(",")
    t_start = time.time()
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(bd, "bodies.json")))
    P0 = json.load(open(os.path.join(bd, "join_params.json")))
    ports = G.load_ports(pp, var)
    PC = {n: json.load(open(os.path.join(cd, n, "join_params.json"))) for n in names}
    res = {n: dict(changed_words=[], outside=[], inside=0, cuts=[], dots=[], tails=[], words=0) for n in names}
    for w in words:
        A0 = G.assemble(font, B, P0, w, with_ref=False, ports=ports)
        for n in names:
            Pn = PC[n]
            F = Pn.get("k863k", {})
            fins, dts = F.get("fin", {}), F.get("dot", {})
            qref = Pn["tail_letter"]["q"]["prm"] != P0["tail_letter"]["q"]["prm"]
            A1 = G.assemble(font, B, Pn, w, with_ref=False, ports=ports)
            r = res[n]
            r["words"] += 1
            chg = False
            if len(A0["letters"]) != len(A1["letters"]):
                r["outside"].append(f"{w}: letter count {len(A0['letters'])} -> {len(A1['letters'])}")
            for l0, l1 in zip(A0["letters"], A1["letters"]):
                X = l0["ch"]
                own = str(A0["shaping"][l0["i"]].get("name", "")).split(".")[0] == X
                for si, (s0, s1) in enumerate(zip(l0["strokes"], l1["strokes"])):
                    if same_arr(s0, s1):
                        continue
                    spot = own and ((X in dts and si == int(dts[X].get("stroke", 1)))
                                    or (X in fins and l0["last"] and si == int(fins[X].get("stroke", 0))))
                    if not spot:
                        r["outside"].append(f"{w}: letter {X} (i {l0['i']}) stroke {si}")
                        continue
                    r["inside"] += 1
                    chg = True
                    g = A0["shaping"][l0["i"]]
                    if X in dts:
                        polys = [np.asarray(p, float) for p in K.placed_polys(font, g, 100, 0.0)
                                 if len(p) > 2 and np.asarray(p, float)[:, 1].min() > 600.0]
                        m0, m1 = dot_measure(s0, polys[0]), dot_measure(s1, polys[0])
                        r["dots"].append(dict(word=w, ch=X, glyph=g["name"], v68=m0, cand=m1))
                    else:
                        r["cuts"].append(dict(word=w, ch=X, glyph=g["name"], **cut_measure(font, g, s0, s1, l0["x"])))
                if len(l0["strokes"]) != len(l1["strokes"]):
                    r["outside"].append(f"{w}: letter {X} stroke count")
            for nm in ("joins", "leads"):
                if len(A0[nm]) != len(A1[nm]):
                    r["outside"].append(f"{w}: {nm} count")
                for k_, (j0, j1) in enumerate(zip(A0[nm], A1[nm])):
                    if not same_coeffs(j0["coeffs"], j1["coeffs"]):
                        r["outside"].append(f"{w}: {nm[:-1]} {k_} ({j0.get('L', j0.get('ch'))}{j0.get('R', '')})")
            t0s, t1s = A0["tails"], A1["tails"]
            for k_, j1 in enumerate(t1s):
                j0 = t0s[k_] if k_ < len(t0s) else None
                if j0 is not None and same_coeffs(j0["coeffs"], j1["coeffs"]):
                    continue
                if j0 is None and j1.get("form") == "k863k fin":
                    r["inside"] += 1
                    chg = True
                    r["tails"].append(dict(word=w, ch=j1["ch"], added=True))
                elif j0 is not None and qref and j0["ch"] == "q" and j1["ch"] == "q":
                    r["inside"] += 1
                    chg = True
                    r["tails"].append(dict(word=w, ch="q", **tail_measure(j0["coeffs"], j1["coeffs"])))
                else:
                    r["outside"].append(f"{w}: tail {k_} ({j1['ch']})")
            if len(t0s) > len(t1s):
                r["outside"].append(f"{w}: tails {len(t0s)} -> {len(t1s)}")
            if chg:
                r["changed_words"].append(w)
    el = time.time() - t_start
    L_ = [f"K863 J3k locality: {len(words)} words, candidates {', '.join(names)}, against v6.8 ({bd}; ports {pp} "
          f"{var}); {len(_memo)} pairs solved once each; {el:.0f} s"]
    for n in names:
        r = res[n]
        L_.append("")
        L_.append(f"{n}: {r['words']} words; pieces in the spot that differ: {r['inside']} in {len(r['changed_words'])} "
                  f"words; pieces OUTSIDE the spot that differ: {len(r['outside'])}"
                  + (" (" + "; ".join(r["outside"][:20]) + ")" if r["outside"] else ""))
        L_.append(f"  changed words: {','.join(r['changed_words'])}")
        for c in r["cuts"]:
            v, k = c["v68"], c["cand"]
            L_.append(f"  cut {c['word']!r} {c['ch']} ({c['glyph']}): end body ({v['end'][0]:.1f}, {v['end'][1]:.1f}) -> "
                      f"({k['end'][0]:.1f}, {k['end'][1]:.1f}); dir {v['dir']:.1f} -> {k['dir']:.1f} deg; end k "
                      f"{v['k_u']:.4f} -> {k['k_u']:.4f} /u; removed {c['removed_u']:.2f} u (off the font's path by up to "
                      f"{c['removed_off_path_u']:.2f} u); end to skeleton {v['skel_u']:.2f} -> {k['skel_u']:.2f} u, to its "
                      f"nearest end {v['skel_end_u']:.2f} -> {k['skel_end_u']:.2f} u; stroke off the font's path max "
                      f"{v['off_path_u']:.2f} -> {k['off_path_u']:.2f} u; font's path near the end undrawn max "
                      f"{v['undrawn_u']:.2f} -> {k['undrawn_u']:.2f} u")
        for d in r["dots"]:
            v, k = d["v68"], d["cand"]
            L_.append(f"  dot {d['word']!r} {d['ch']} ({d['glyph']}): IoU {v['iou']:.3f} -> {k['iou']:.3f}; ink "
                      f"{v['ink_u2']:.0f} -> {k['ink_u2']:.0f} u^2 (font dot {k['font_u2']:.0f}); ink outside the font dot "
                      f"{v['out_u2']:.0f} -> {k['out_u2']:.0f} u^2; font dot uncovered {v['uncov_u2']:.0f} -> "
                      f"{k['uncov_u2']:.0f} u^2; centroid off {v['c_off_u']:.2f} -> {k['c_off_u']:.2f} u; ink axes "
                      f"{v['ink_axes_u'][0]:.1f} x {v['ink_axes_u'][1]:.1f} @ {v['ink_ang']:.0f} -> {k['ink_axes_u'][0]:.1f}"
                      f" x {k['ink_axes_u'][1]:.1f} @ {k['ink_ang']:.0f} deg (font {k['font_axes_u'][0]:.1f} x "
                      f"{k['font_axes_u'][1]:.1f} @ {k['font_ang']:.0f}); hole {k['hole_u2']:.3f} u^2")
        for t in r["tails"]:
            if t.get("added"):
                L_.append(f"  tail {t['word']!r} {t['ch']}: added")
                continue
            L_.append(f"  tail {t['word']!r} q: Hausdorff to v6.8's {t['haus_u']:.2f} u; direction "
                      f"{t['dir_v68'][0]:.1f}..{t['dir_v68'][1]:.1f} -> {t['dir_cand'][0]:.1f}..{t['dir_cand'][1]:.1f} deg;"
                      f" length {t['len_v68_u']:.2f} -> {t['len_cand_u']:.2f} u")
    txt = "\n".join(L_) + "\n"
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write(txt)
    with open(out_json, "w", encoding="utf-8") as fh:
        json.dump(dict(words=words, cands=names, res=res), fh, indent=1, default=float)
    print(txt)


if __name__ == "__main__":
    main()
