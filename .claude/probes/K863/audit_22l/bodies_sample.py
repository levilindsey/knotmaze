# K863 audit 22L: sample v6.8's body strokes (work34/base/bodies.json, read-only)
# for the body-internal measures the census has no rows for: node curvature
# jumps and turns (K903 p, K977 b/z, K987 n), peak |dk/ds| (K977 k, K1044 a vs g),
# f's hook node spacing (K977), a/g/q corner heights (K1021).
# Units: bodies are in fu; 1 u = 1/0.24 fu. k in 1/u, s in u, dk/ds in 1/u^2.
import json
import os

import numpy as np

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
U = 0.24
B = json.load(open(os.path.join(T, "work34", "base", "bodies.json")))
OUT = []


def say(s=""):
    OUT.append(s)
    print(s)


def bez(bz, t):
    p = [np.asarray(q, float) for q in bz]
    mt = 1 - t
    pt = mt**3 * p[0] + 3 * mt * mt * t * p[1] + 3 * mt * t * t * p[2] + t**3 * p[3]
    d1 = 3 * mt * mt * (p[1] - p[0]) + 6 * mt * t * (p[2] - p[1]) + 3 * t * t * (p[3] - p[2])
    d2 = 6 * mt * (p[2] - 2 * p[1] + p[0]) + 6 * t * (p[3] - 2 * p[2] + p[1])
    return pt, d1, d2


def sample(letter, per=40):
    """(s_u, pts, k_u, turn_at_nodes, node_k_jumps) for stroke 0 of letter."""
    bzs = B[letter]["strokes"][0]["beziers"]
    S, K, PTS = [], [], []
    s_acc = 0.0
    node_info = []  # (s_u, turn_deg, k_left_u, k_right_u)
    prev_end = None
    for i, bz in enumerate(bzs):
        ts = np.linspace(0, 1, per, endpoint=False)
        pts = []
        for t in ts:
            pt, d1, d2 = bez(bz, t)
            pts.append(pt)
        pts = np.array(pts)
        seg = np.hypot(*np.diff(pts, axis=0).T)
        ss = np.concatenate([[0], np.cumsum(seg)]) * U + s_acc
        for t, p_ in zip(ts, pts):
            pt, d1, d2 = bez(bz, float(t))
            sp = np.hypot(*d1)
            k_fu = (d1[0] * d2[1] - d1[1] * d2[0]) / max(sp**3, 1e-12)
            S.append(ss[list(ts).index(t)] if False else 0)
            K.append(k_fu / U)
            PTS.append(pt)
        # rebuild s properly below (placeholder replaced)
        s_acc = ss[-1] + float(np.hypot(*(bez(bz, 1.0)[0] - pts[-1]))) * U
        if i + 1 < len(bzs):
            _, d1a, d2a = bez(bz, 1.0)
            _, d1b, d2b = bez(bzs[i + 1], 0.0)
            def kof(d1, d2):
                sp = np.hypot(*d1)
                return (d1[0] * d2[1] - d1[1] * d2[0]) / max(sp**3, 1e-12) / U
            ta = math_ang(d1a)
            tb = math_ang(d1b)
            turn = (tb - ta + 180) % 360 - 180
            node_info.append((s_acc, turn, kof(d1a, d2a), kof(d1b, d2b)))
    # proper s: resample uniformly by chord accumulation over dense points
    dense = []
    for bz in bzs:
        for t in np.linspace(0, 1, 200, endpoint=False):
            dense.append(bez(bz, float(t))[0])
    dense = np.array(dense)
    s_dense = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(dense, axis=0).T))]) * U
    # k on the same dense grid
    kd = []
    idx = 0
    for bz in bzs:
        for t in np.linspace(0, 1, 200, endpoint=False):
            _, d1, d2 = bez(bz, float(t))
            sp = np.hypot(*d1)
            kd.append((d1[0] * d2[1] - d1[1] * d2[0]) / max(sp**3, 1e-12) / U)
            idx += 1
    kd = np.array(kd)
    return s_dense, kd, node_info, len(bzs)


def math_ang(d):
    import math
    return math.degrees(math.atan2(d[1], d[0]))


for L in ("p", "b", "z", "n", "k", "a", "g", "f", "q"):
    s, k, nodes, nbz = sample(L)
    dkds = np.gradient(k, s)
    # peak away from the first/last 4 u (rough's rule of thumb)
    m = (s > 4) & (s < s[-1] - 4)
    pk = np.abs(dkds[m]).max() if m.any() else float("nan")
    pk_at = s[m][np.abs(dkds[m]).argmax()] if m.any() else float("nan")
    say(f"{L}: cubics={nbz} len={s[-1]:.1f} u peak|dk/ds|={pk:.4g} /u^2 at {pk_at:.0f} u "
        f"(excl 4 u ends); node turns/jumps:")
    for (su, turn, kl, kr) in nodes:
        say(f"    node at {su:7.1f} u: turn={turn:+7.2f} deg  k {kl:+.4f} -> {kr:+.4f} /u  jump={kr-kl:+.4f}")
    say("")

# f hook nodes: fewnode node arclengths near the end
fn = B["f"]["fewnode"]["strokes"][0]
say("f fewnode pieces (s in fu; spacing in u = fu*0.24):")
for pc in fn["pieces"]:
    if "nodes" in pc:
        ns = [n[0] for n in pc["nodes"]]
        say(f"  len={pc['len_fu']:.0f} fu nodes={ns} spacings_u={[round((b-a)*U, 2) for a, b in zip(ns, ns[1:])]}")

say("")
say("## a/g/q tops: peak |dk/ds| from the corner to the bowl's leftmost point (K1044's segment)")
for L in ("a", "g", "q"):
    bzs = B[L]["strokes"][0]["beziers"]
    dense, kk = [], []
    for bz in bzs:
        for t in np.linspace(0, 1, 200, endpoint=False):
            pt, d1, d2 = bez(bz, float(t))
            sp = np.hypot(*d1)
            dense.append(pt)
            kk.append((d1[0] * d2[1] - d1[1] * d2[0]) / max(sp**3, 1e-12) / U)
    dense = np.array(dense)
    kk = np.array(kk)
    ss = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(dense, axis=0).T))]) * U
    cnr = B[L]["corners"][0]["pt"]
    ci = int(np.argmin(np.hypot(*(dense - np.asarray(cnr)).T)))
    # the bowl's leftmost: the first local x minimum after the corner (the stroke goes on to a descender)
    li = ci
    for i in range(ci + 20, min(len(dense) - 20, ci + int(260 / max(ss[1] - ss[0], 1e-9)))):
        if dense[i, 0] <= dense[i - 20:i + 20, 0].min() + 1e-9:
            li = i
            break
    if li <= ci + 8:
        li = ci + 8 + int(np.argmin(dense[ci + 8:ci + 400, 0]))
    seg = slice(ci + 8, li)  # skip 8 dense steps (~1.5 u) past the corner, as the census does
    dkds = np.gradient(kk, ss)
    pk = np.abs(dkds[seg]).max()
    say(f"  {L}: corner at s={ss[ci]:.1f} u, leftmost at s={ss[li]:.1f} u, "
        f"peak |dk/ds| on the segment={pk:.4g} /u^2 at {ss[seg][np.abs(dkds[seg]).argmax()]:.0f} u; "
        f"font distance of corner pt: see sheets")

say("")
say("## a/g/q tops against the font (K1021: new tops 9.2-9.3 u off the font, a's 8.0)")
try:
    import sys
    sys.path.insert(0, os.path.join(T, "tools"))
    sys.path.insert(0, os.path.join(T, "work27", "dbg"))
    from k863lib import Font
    import join_k926 as J
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    for L in ("a", "g", "q"):
        g = dict(name=B[L]["body_glyph"], x=0.0, y=0.0, adv=B[L]["adv"])
        sg = J.skel_graph(font, g, origin=0.0)
        skel = np.array(sg.fu, float)
        bzs = B[L]["strokes"][0]["beziers"]
        dense = []
        for bz in bzs:
            for t in np.linspace(0, 1, 100, endpoint=False):
                dense.append(bez(bz, float(t))[0])
        dense = np.array(dense)
        cnr = np.asarray(B[L]["corners"][0]["pt"], float)
        ci = int(np.argmin(np.hypot(*(dense - cnr).T)))
        # segment: corner to the end of the cubic past the bowl's leftmost point (B4's T -> N2)
        xs = dense[ci:, 0]
        li = ci + int(np.argmin(xs[: int(180 / 0.24 / 5)])) if len(xs) > 10 else ci
        seg_pts = dense[ci:li + 100]
        d = np.hypot(*(seg_pts[:, None, :] - skel[None, :, :]).transpose(2, 0, 1)).min(axis=1) * U if False else None
        # nearest skeleton point per segment sample (fu -> u)
        dd = np.sqrt(((seg_pts[:, None, :] - skel[None, :, :]) ** 2).sum(-1)).min(axis=1) * U
        say(f"  {L}: glyph {g['name']}, top segment {len(seg_pts)} samples, "
            f"font distance max={dd.max():.2f} u mean={dd.mean():.2f} u")
except Exception as e:
    say(f"  font skeleton measure failed: {e!r}")

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "bodies_sample.txt"), "w") as f:
    f.write("\n".join(OUT) + "\n")
print("wrote bodies_sample.txt")
