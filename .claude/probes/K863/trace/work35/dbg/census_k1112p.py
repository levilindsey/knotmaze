# K1112 Run P: copy of work27/dbg/census_k1027.py (J3d's, untouched) by work35/dbg/mk_tools_k1112p.py:
# work27/dbg on the import path after this folder, so gen_k1027 imports. J3d's header:
# K1027 (J3d): copy of work26/dbg/census_k1009c.py by work27/dbg/mk_tools_k1027.py; the default generator is gen_k1027.
"""K1009b (J3b, v6.4) copy of B3's census (work23/dbg/census_k1019.py, untouched), made by mk_census_k1009b.py:
  - K1028: a solved join is measured against gen_k1009b's ref_join (j["ref"]): the font's connector cut at the join's
    own ends and run on along the font letters' skeletons to the attach points (dist_max_u, the ranking's). Kept
    beside it: dist_max_frame_u (gen_k1009's ref, cut at the build's entry frame) and dist_max_b3_u (B3's measure:
    the connector cut at the join's ends, not run on); ref_info (head and tail gaps, the skeleton runs).
  - a cusp exit's seam (o's top) is designed: the row adds the turn's error from 180 deg, the overstroke band (the
    connector's arc from its start within 0.5 u of the body's last 12 u) and the largest distance within its first
    4 u; the left context is dropped (the ink turns back at the seam).
  - a corner entry's seam is designed: the row adds the arrival angle, the stem's angle there, the side margin (the
    solve's side_min_u) and the connector's crossings of the stem (its last 1 u excluded); no right context.
  - words += subgroup, lawgiver, vg (bg, wg, vg); gen_k1009b is the default gen; the dbg dir is on the path.
K1019 (B3): census_k1012 with one change (call 4, brief docs/design/K1019_cursive_b3.md): a solved
(port) join is measured against the font's connector cut at the join's own ends (pair_reference with the
join's fL and fR), not at the build's entry frame; the census_k1012 number follows as "dist at the frame".
K1012 (B2, v6.2) copy of K1009's census (work21/dbg/census_k1009.py): one change, DESIGNED_BODY names g's and q's top
corners (K1012: the body starts at the stem top, as a's since K990). Run as below with work22\dbg\census_k1012.py.

K1009 (J3a, v6.1) copy of K990's census: with --ports <ports_k1009.json> [--variant A|B|C] it calls
gen_k1009.assemble with ports, and a SOLVED join's seams are measured where the solve attached it: the exit against L's
stroke cut at the exit port, the entry against R's stroke as written (it starts at the attach point; a retraced entry
runs up from there first), all as G2 merges (kind port-merge | port-cusp | port-fused; none is a corner by design, so
a ported cusp entry's angle is counted). Preset joins are measured as K990 did. Run from the trace dir:
  venv\Scripts\python.exe -I work21\dbg\census_k1009.py run <font> <bodies> <params> <out.txt> <out.json> --gen gen_k1009
      [--ports work21\ports_k1009.json --variant A] [--label L] [--words ...]

K990 copy of J2's census (K962 step 1): the join census. Every derived piece of the words sheet (words_k980.WORDS; the combs sheet's words
minimum, hippo and "be we shoe maze huge bye" are among them) and the e variants' start curves, measured on the
curves as written (connectors through fewnode_k930.conn_beziers, the bodies' cubics as stored):

  - dist: distance to the font's path, in u. Joins: max = the two-way Hausdorff against the font's connector between
    the same frames (gen's pair_reference, which for a fused entry adds the up pass to the junction; the words
    report's "join alone"), mean = the mean of the piece's samples' nearest distances to it. Leads and tails:
    one-sided, the piece's samples to the skeleton of the font's glyph of that letter at its shaped position (the .ini
    / .fin glyph draws the lead or the tail). e variants: one-sided, the start curve (C to J) to the variant glyph's
    skeleton path (evar's e0 -> e1 path, less the shift). Virtual leads: n/a (the font draws no lead there).
    Budget (call 4): 2.5 u, 3.0 u into a fused entry (the K960 junction stretch).
  - seams: at each end that meets a body, the piece's end frame against the body's own frame there: position gap
    (u), tangent angle (deg), curvature gap (1/u). The body's frame is the adjacent stroke's end (an exit) or start
    (an entry; a trimmed or variant body starts there); for a fused entry, where the pen retraces from the junction,
    it is the untrimmed body's frame at the junction (bk, bt), running up as the ink does. A cusp entry (kind cusp:
    i j p r s t u w y) is a corner by design: its tangent gap is listed, not counted.
    G2 = gap < 0.01 u, angle < 0.05 deg, dk < 5e-4 /u.
  - hooks: near-cusps inside a piece: the tangent turns more than 20 deg within 0.5 u of arc (a radius under about
    1.4 u, or a reversal: a connector whose a0 or a1 sits at its 0.02 floor leaves its frame and turns back within
    hundredths of a u). Each is listed with its turn and its distance from the piece's start and end. A hook at an
    end is a corner the seam numbers hide (the frames match exactly, the ink turns at once).
  - peak |dk/ds| (1/u^2, and as a ratio to rough_k969.SCALE_DK) on the piece, extended 2 u into the bodies across
    each seam (so a curvature step at a seam shows), on a 0.25 u grid with a central difference over 1 u; skips
    1.5 u either side of a hook or a designed corner and 1 u at a free end.
  - comb spikes: the combs sheet's rule (combs_k980: samples every 0.5 fu per cubic, the row's scale 22 u over the
    95th-percentile |k|, a tooth over CAP 66 u drawn red): samples of the piece whose |k| exceeds 3x the word's
    95th-percentile |k|; spk = the count, k/p95 = the worst ratio.
  - kinks: tangent breaks over 0.5 deg between the piece's own cubics.
  - rough: rough_k969.band on the piece (pieces >= 30 u): facet and wobble against rough_k969's CHECK limits.

Ranked worst first by: badness = 100 per hook, internal kink or undesigned seam break (> 0.5 deg) + 50 per seam
curvature step (not G2) + 20 per comb spike sample (capped at 5) + 10 per unit of budget excess + 20 per rough fail
+ peak ratio / 10.

python -I census_k962.py run <font> <bodies.json> <join_params.json> <out.txt> <out.json> [--gen gen_k980|gen_k962]
    [--label <s>] [--words w1,w2,...]
python -I census_k962.py cmp <before.json> <after.json> <out.txt>   (per piece before -> after, worst first)
"""
import importlib
import json
import math
import os
import sys

TR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(TR, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(TR, "work27", "dbg"))  # K1112 Run P: gen_k1027 from J3d's folder
import numpy as np  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import k886lib as L  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
import rough_k969 as R  # noqa: E402
import join_k926 as J  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
U = L.S_TPL                      # u per fu
WORDS = ["minimum", "bow", "woven", "boxes", "people", "hippo", "puppy", "and", "knotmaze", "cursive",
         "quick brown fox", "jumps over the lazy dog", "be we shoe maze huge bye", "ice jet even",
         # K990: pairs whose pieces the body edits move and no word above holds (fe, ff, of; wh, ch, hi; oa; ba)
         "coffee", "which", "oat", "bad",
         # K1028 (J3b): bg, wg (and vg) joins
         "subgroup", "lawgiver", "vg"]
BUDGET, BUDGET_FUSED = 2.5, 3.0
G2_POS_U, G2_ANG_DEG, G2_DK_U = 0.01, 0.05, 5e-4
KINK_DEG = 0.5
HOOK_DEG, HOOK_WIN_U = 20.0, 0.5
DS_U = 0.25
H_U = 1.0
CTX_U = 2.0
SPIKE_X = 3.0                    # combs_k980: CAP 66 u at the row's scale 22 u / p95
A_FLOOR = 0.0205                 # a connector's a0 / a1 at its 0.02 floor
SCALE_DK_U = R.SCALE_DK / (U * U)   # rough's scale in 1/u^2
VARIANTS = {"o": ("oen", "e.ful.med_o_"), "g": ("gen", "e.ful.med_g_")}
VLEAD_LEFT = "n"


# ---------------------------------------------------------------- curve helpers

def seg_eval(b, t):
    P0, P1, P2, P3 = [np.asarray(q, float) for q in b]
    t = np.asarray(t, float)[:, None]
    B = (1 - t) ** 3 * P0 + 3 * (1 - t) ** 2 * t * P1 + 3 * (1 - t) * t ** 2 * P2 + t ** 3 * P3
    d1 = 3 * (1 - t) ** 2 * (P1 - P0) + 6 * (1 - t) * t * (P2 - P1) + 3 * t ** 2 * (P3 - P2)
    d2 = 6 * (1 - t) * (P2 - 2 * P1 + P0) + 6 * t * (P3 - 2 * P2 + P1)
    return B, d1, d2


def end_frame(bzs, at_end):
    """(P, T, k) at a chain's end (at_end) or start, analytic; a zero handle is stepped past."""
    b = bzs[-1] if at_end else bzs[0]
    for eps in (0.0, 1e-6, 1e-4, 1e-3):
        t = 1.0 - eps if at_end else eps
        B, d1, d2 = seg_eval(b, [t])
        v = float(np.hypot(*d1[0]))
        if v > 1e-9:
            T = d1[0] / v
            k = float(d1[0][0] * d2[0][1] - d1[0][1] * d2[0][0]) / v ** 3
            return B[0], T, k
    return np.asarray(b[3 if at_end else 0], float), np.array([1.0, 0.0]), 0.0


def dense(bzs, n_per=64):
    """Samples of a chain: points (fu), unit tangents, k (1/fu), cubic index."""
    Ps, Ts, ks, ix = [], [], [], []
    for i, b in enumerate(bzs):
        t = np.linspace(0, 1, n_per + 1)
        if i > 0:
            t = t[1:]
        B, d1, d2 = seg_eval(b, t)
        v = np.maximum(np.hypot(d1[:, 0], d1[:, 1]), 1e-12)
        Ps.append(B)
        Ts.append(d1 / v[:, None])
        ks.append((d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / v ** 3)
        ix.append(np.full(len(t), i))
    return np.vstack(Ps), np.vstack(Ts), np.concatenate(ks), np.concatenate(ix)


def comb_k(bzs, step=0.5):
    """|k| (1/fu) at the combs sheet's samples (combs_k980.sample: every 0.5 fu per cubic, ends included)."""
    out = []
    for seg in bzs:
        P0, P1, P2, P3 = [np.asarray(q, float) for q in seg]
        ln = np.linalg.norm(P1 - P0) + np.linalg.norm(P2 - P1) + np.linalg.norm(P3 - P2)
        n = max(8, int(ln / step))
        B, d1, d2 = seg_eval(seg, np.linspace(0, 1, n + 1))
        v = np.maximum(np.hypot(d1[:, 0], d1[:, 1]), 1e-12)
        out.append(np.abs((d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / v ** 3))
    return np.concatenate(out)


def arc_u(P):
    return np.concatenate([[0.0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]) * U


def chain_len_u(bzs):
    return float(arc_u(dense(bzs, 32)[0])[-1])


def tail_part(bzs, length_u, from_end):
    """The last (from_end) or first length_u of a chain, whole cubics (enough context for the seam window)."""
    out, acc = [], 0.0
    seq = bzs[::-1] if from_end else bzs
    for b in seq:
        out.append(b)
        acc += chain_len_u([b])
        if acc >= length_u:
            break
    return out[::-1] if from_end else out


def angle_deg(a, b):
    c = float(np.clip(np.dot(a, b) / max(np.linalg.norm(a) * np.linalg.norm(b), 1e-18), -1, 1))
    return math.degrees(math.acos(c))


def internal_kinks(bzs):
    """Tangent breaks (deg) and curvature jumps (1/u) at the piece's own internal nodes."""
    angs, dks = [], []
    for a, b in zip(bzs, bzs[1:]):
        Pa, Ta, ka = end_frame([a], True)
        Pb, Tb, kb = end_frame([b], False)
        angs.append(angle_deg(Ta, Tb))
        dks.append(abs(ka - kb) / U)
    return angs, dks


def turning(P, T):
    """Per sample: the largest tangent turn (rad) within HOOK_WIN_U of arc ahead, and the arc length (u)."""
    s = arc_u(P)
    th = np.unwrap(np.arctan2(T[:, 1], T[:, 0]))
    je = np.searchsorted(s, s + HOOK_WIN_U, side="right")
    turn = np.array([np.abs(th[i:max(je[i], i + 2)] - th[i]).max() for i in range(len(s))])
    return s, turn


def hooks(piece):
    """Near-cusps inside a piece: [(turn deg, s from start u, s from end u, |k| max 1/u)]."""
    P, T, k, ix = dense(piece, 256)
    s, turn = turning(P, T)
    hit = turn > math.radians(HOOK_DEG)
    out = []
    i = 0
    while i < len(s):
        if not hit[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(s) and hit[j + 1]:
            j += 1
        m = i + int(np.argmax(turn[i:j + 1]))
        je = int(np.searchsorted(s, s[m] + HOOK_WIN_U, side="right"))
        mk = m + int(np.argmax(np.abs(k[m:max(je, m + 1)])))
        out.append((math.degrees(float(turn[m])), float(s[mk]), float(s[-1] - s[mk]),
                    float(np.abs(k[m:max(je, m + 1)]).max()) / U))
        i = j + 1
    return out


def profile(ctxL, piece, ctxR, free_start, free_end):
    """k (1/u) and |dk/ds| (1/u^2) on a uniform 0.25 u grid over ctxL + piece + ctxR; returns (s, k, dkds, mask, in
    piece) where mask is the window: the piece extended CTX_U into each context, less 1.5 u around any hook or corner
    (a turn over 20 deg within 0.5 u) and 1 u at a free end."""
    segs = list(ctxL) + list(piece) + list(ctxR)
    P, T, k, ix = dense(segs, 128)
    s, turn = turning(P, T)
    k = k / U
    nL, nP = len(ctxL), len(piece)
    i0 = int(np.argmax(ix >= nL)) if nL else 0
    i1 = int(np.nonzero(ix < nL + nP)[0].max())
    s0, s1 = float(s[max(i0 - 1, 0)]), float(s[i1])
    keep = np.concatenate([[True], np.diff(s) > 1e-12])
    s_, k_ = s[keep], k[keep]
    g = np.arange(0.0, s_[-1], DS_U)
    kg = np.interp(g, s_, k_)
    hh = int(round(H_U / DS_U))
    dk = np.full(len(g), np.nan)
    if len(g) > 2 * hh:
        dk[hh:-hh] = (kg[2 * hh:] - kg[:-2 * hh]) / (2 * hh * DS_U)
    m = (g >= s0 - (CTX_U if nL else 0.0)) & (g <= s1 + (CTX_U if ctxR else 0.0))
    if free_start:
        m &= g >= s0 + 1.0
    if free_end:
        m &= g <= s1 - 1.0
    bad = s[turn > math.radians(HOOK_DEG)]
    if len(bad):
        lo, hi = bad - 1.5, bad + HOOK_WIN_U + 1.5
        for a_, b_ in zip(lo, hi):
            m &= ~((g >= a_) & (g <= b_))
    inp = (g >= s0) & (g <= s1)
    return g, kg, dk, m, inp


def nearest_end(strokes, pt, use_end):
    best = (1e18, None)
    for si, st in enumerate(strokes):
        q = np.asarray(st[-1][3] if use_end else st[0][0], float)
        d = float(np.linalg.norm(q - pt))
        if d < best[0]:
            best = (d, si)
    return best


# ---------------------------------------------------------------- seams

def seam_frames(Pp, Tp, kp, Pb, Tb, kb):
    return dict(gap_u=float(np.linalg.norm(np.asarray(Pp) - np.asarray(Pb))) * U, ang_deg=angle_deg(Tp, Tb),
                dk_u=abs(kp - kb) / U, k_piece_u=kp / U, k_body_u=kb / U)


def seam(piece, body, piece_at_end, body_at_end):
    Pp, Tp, kp = end_frame(piece, piece_at_end)
    Pb, Tb, kb = end_frame(body, body_at_end)
    return seam_frames(Pp, Tp, kp, Pb, Tb, kb)


def fused_seam(piece, B, X, fr, x0, shear=None):
    """A piece arriving at X's fused junction: its end against the untrimmed body's frame there (running up, as the
    ink does; the pen's retrace down to the cusp is drawn once)."""
    fz = B[X]["entry"].get("fused", {})
    bk = fr.get("bk", fz.get("bk"))
    bt = fr.get("bt", fz.get("bt"))
    bz = B[X]["strokes"][0]["beziers"]
    p, T, k = L.bez_frame(bz[int(bk)], float(bt))
    Pp, Tp, kp = end_frame(piece, True)
    # the body runs from the cusp down through the junction; the ink arrives and goes back up it: reversed frame
    return seam_frames(Pp, Tp, kp, np.asarray(p, float) + np.array([x0, 0.0]), -np.asarray(T, float), -float(k))


def g2_ok(sm):
    return sm["gap_u"] < G2_POS_U and sm["ang_deg"] < G2_ANG_DEG and sm["dk_u"] < G2_DK_U


_SKEL = {}


def glyph_skel(font, g):
    key = (g["name"], round(float(g["x"]), 3))
    if key not in _SKEL:
        sg = J.skel_graph(font, g, origin=0.0)    # placed_polys puts the glyph at g["x"] - origin: word coordinates
        _SKEL[key] = (sg.fu, cKDTree(sg.fu))
    return _SKEL[key]


def word_p95(A):
    ks = []
    for lt in A["letters"]:
        for st in lt["strokes"]:
            ks.append(comb_k(st))
    for nm in ("joins", "leads", "tails"):
        for j in A[nm]:
            ks.append(comb_k(FN.conn_beziers(j["coeffs"])))
    return float(np.percentile(np.concatenate(ks), 95))


def measure(row, piece, ctxL, ctxR, free_start, free_end, p95_fu, ref=None, one_sided=None):
    g, kg, dk, m, inp = profile(ctxL, piece, ctxR, free_start, free_end)
    ok = m & np.isfinite(dk)
    a = np.abs(dk[ok])
    row["peak_dkds_u"] = float(a.max()) if len(a) else 0.0
    row["peak_ratio"] = row["peak_dkds_u"] / SCALE_DK_U
    row["peak_at_u"] = float(g[ok][int(np.argmax(a))] - g[inp][0]) if (len(a) and inp.any()) else float("nan")
    kk = comb_k(piece)
    row["kmax_p95"] = float(kk.max() / p95_fu) if p95_fu > 0 else 0.0
    row["spikes"] = int((kk > SPIKE_X * p95_fu).sum())
    angs, dks = internal_kinks(piece)
    row["int_kinks"] = int(sum(a_ > KINK_DEG for a_ in angs))
    row["int_ang_max"] = float(max(angs, default=0.0))
    row["int_dk_max"] = float(max(dks, default=0.0))
    row["hooks"] = hooks(piece)
    rb = R.band(R.to_u(piece))
    if rb:
        row["facet"] = max(p["facet"] for p in rb)
        row["wobble"] = max(p["wobble"] for p in rb)
        bandf = max(p["wobble"] / max(p["level"], R.LEVEL_FLOOR) for p in rb)
        row["rough"] = "FAIL" if (row["facet"] > R.CHECK_FACET or row["wobble"] > R.CHECK_WOB or bandf > R.CHECK_BAND) \
            else "ok"
    else:
        row["facet"] = row["wobble"] = float("nan")
        row["rough"] = "short"
    row["len_u"] = chain_len_u(piece)
    Ps = dense(piece, 64)[0]
    if ref is not None and len(ref) > 1:
        rt = cKDTree(ref)
        d1 = rt.query(Ps)[0]
        d2 = cKDTree(Ps).query(ref)[0]
        row["dist_max_u"] = float(max(d1.max(), d2.max())) * U
        row["dist_mean_u"] = float(d1.mean()) * U
    elif one_sided is not None:
        d1 = one_sided[1].query(Ps)[0]
        row["dist_max_u"] = float(d1.max()) * U
        row["dist_mean_u"] = float(d1.mean()) * U
    else:
        row["dist_max_u"] = row["dist_mean_u"] = float("nan")
    return row


def badness(r):
    b = 0.0
    for sm in r["seams"]:
        if sm.get("designed"):
            continue
        if sm["ang_deg"] > KINK_DEG or sm["gap_u"] > 0.05:
            b += 100
        elif not g2_ok(sm):
            b += 50
    b += 100 * len(r["hooks"]) + 20 * min(r["spikes"], 5) + 100 * r["int_kinks"]
    if np.isfinite(r["dist_max_u"]):
        b += 10 * max(0.0, r["dist_max_u"] - r["budget"])
    b += 20 * (r["rough"] == "FAIL") + r["peak_ratio"] / 10
    return b


def letter_for(letters, pt, flag, use_end):
    best = (1e18, None, None)
    for lt in letters:
        if not lt[flag]:
            continue
        d, si = nearest_end(lt["strokes"], pt, use_end)
        if d < best[0]:
            best = (d, lt, si)
    return best


def _two_sided(pc, ref):
    ref = np.asarray(ref, float)
    Ps = dense(pc, 64)[0]
    d1 = cKDTree(ref).query(Ps)[0]
    d2 = cKDTree(Ps).query(ref)[0]
    return float(max(d1.max(), d2.max())) * U, float(d1.mean()) * U


def cusp_exit_info(pc, stL, s1, band_u=0.5, over_u=4.0, top_u=12.0):
    """A cusp exit's seam: the turn's error from 180 deg, the overstroke's band and its largest distance."""
    Pb = dense(tail_part(stL, top_u, True), 64)[0]
    sb = arc_u(Pb)
    Pb = Pb[sb >= sb[-1] - top_u]
    P = dense(pc, 64)[0]
    s = arc_u(P)
    d = cKDTree(Pb).query(P)[0] * U
    out_i = np.nonzero(d > band_u)[0]
    band = float(s[out_i[0]]) if len(out_i) else float(s[-1])
    m = s <= over_u
    return dict(turn_err_deg=abs(180.0 - s1["ang_deg"]), over_band_u=band, over_dmax_u=float(d[m].max()),
                extra=f"cusp exit: turn {s1['ang_deg']:.3f} deg (|180 - turn| {abs(180.0 - s1['ang_deg']):.3f}), "
                      f"overstroke in the {band_u:g} u band for {band:.2f} u, max {float(d[m].max()):.3f} u over the "
                      f"first {over_u:g} u")


def corner_info(pc, stR, solve):
    """A corner entry: the arrival angle, the stem's angle, the side margin and the stem crossings."""
    Pe, Te, ke = end_frame(pc, True)
    Pb, Tb, kb = end_frame(stR, False)
    arr = math.degrees(math.atan2(Te[1], Te[0]))
    stem = math.degrees(math.atan2(Tb[1], Tb[0]))
    P = dense(pc, 64)[0]
    s = arc_u(P)
    Q = P[s <= s[-1] - 1.0]
    S_ = dense(stR, 64)[0]
    ss = arc_u(S_)
    S_ = S_[ss <= 100.0]
    a0, a1, b0, b1 = Q[:-1], Q[1:], S_[:-1], S_[1:]

    def orient(p, q, r):
        return (q[..., 0] - p[..., 0]) * (r[..., 1] - p[..., 1]) - (q[..., 1] - p[..., 1]) * (r[..., 0] - p[..., 0])
    A0, A1, B0, B1 = a0[:, None], a1[:, None], b0[None], b1[None]
    nx = int(np.count_nonzero((orient(A0, A1, B0) * orient(A0, A1, B1) < 0) & (orient(B0, B1, A0) * orient(B0, B1, A1) < 0)))
    sm = solve.get("side_min_u")
    return dict(arrive_deg=arr, stem_deg=stem, stem_cross=nx, side_min_u=sm,
                extra=f"corner: arrives at {arr:.1f} deg, the stem leaves at {stem:.1f} deg, side margin "
                      f"{'n/a' if sm is None else f'{sm:.2f} u'}, stem crossings {nx}")


def run(font_path, bodies_path, params_path, out_txt, out_json, gen="gen_k980", label="", words=None, ports=None,
         variant="A"):
    G = importlib.import_module(gen)
    kw = {} if ports is None else dict(ports=G.load_ports(ports, variant))
    font = Font(font_path)
    B = json.load(open(bodies_path))
    P = json.load(open(params_path))
    rows = []
    for wi, w in enumerate(words or WORDS):
        A = G.assemble(font, B, P, w, with_ref=True, **kw)
        sh = A["shaping"]
        p95 = word_p95(A)
        lets = {lt["i"]: lt for lt in A["letters"]}
        tag = f"w{wi + 1}:{w}"
        for j in A["joins"]:
            pc = FN.conn_beziers(j["coeffs"])
            lL, lR = lets[j["iL"]], lets[j["iR"]]
            dL, sL = nearest_end(lL["strokes"], np.asarray(pc[0][0], float), True)
            dR, sR = nearest_end(lR["strokes"], np.asarray(pc[-1][3], float), False)
            stL, stR = lL["strokes"][sL], lR["strokes"][sR]
            fr, which = J.entry_rec(B, j["R"], j["L"])
            kind = fr.get("kind", B[j["R"]]["entry"]["kind"])
            s1 = dict(seam="exit " + j["L"], **seam(pc, stL, False, True))
            if "port" in j:
                pe = j["port"]["entry"]
                kind = "port-" + pe["kind"]
                which = f"port at {pe['s_u']:.2f} u" + (", retrace" if pe["retrace"] else "")
                s1["seam"] = f"exit {j['L']} (port at {j['port']['exit']['from_end_u']:.2f} u from the end)"
                s2 = dict(seam=f"entry {j['R']} ({which}, {kind})", **seam(pc, stR, True, False))
                ctxR = tail_part(stR, 12.0, False)
                if j["port"]["exit"]["kind"] == "cusp_exit":
                    s1.update(cusp_exit_info(pc, stL, s1), designed=True)
                if pe["kind"] == "corner":
                    s2.update(corner_info(pc, stR, j["port"]["solve"]))
                    ctxR = []
            elif kind == "fused":
                s2 = dict(seam=f"entry {j['R']} ({which}, fused junction)", **fused_seam(pc, B, j["R"], fr, lR["x"]))
                ctxR = []   # the ink turns back down at the junction: no context across it
            else:
                s2 = dict(seam=f"entry {j['R']} ({which}, {kind})", **seam(pc, stR, True, False))
                ctxR = tail_part(stR, 12.0, False)
            s2["designed"] = kind in ("cusp", "port-corner")
            cex = "port" in j and j["port"]["exit"]["kind"] == "cusp_exit"
            prm = [float(v) for v in j["prm"]]
            row = dict(id=f"{tag}:J{j['iL']}-{j['iR']}{j['L']}{j['R']}", word=w, type="join", pair=j["L"] + j["R"],
                       kind=kind, which=which, cls=j["cls"], src=str(j["src"]), prm=prm,
                       at_floor=[i_ for i_ in (0, 1) if prm[i_] < A_FLOOR], seams=[s1, s2],
                       budget=BUDGET_FUSED if kind in ("fused", "port-fused") else BUDGET,
                       dist_words_u=float(j["dist_u"]) if j["dist_u"] == j["dist_u"] else float("nan"))
            measure(row, pc, [] if cex else tail_part(stL, 12.0, True), ctxR, cex, kind in ("fused", "port-corner"), p95,
                    ref=j["ref"])
            if "port" in j:
                # K1019 (call 4): j["ref"] is the font's connector cut at the build's entry frame (after_o / after_b),
                # where a solved join does not end; keep that number, then measure against the connector cut at the
                # join's own ends (its exit point and its attach point)
                # K1028 (J3b): measure() used gen_k1009b's ref_join (own ends, run on along the skeletons)
                if j.get("ref_frame") is not None and len(j["ref_frame"]) > 1:
                    row["dist_max_frame_u"], row["dist_mean_frame_u"] = _two_sided(pc, j["ref_frame"])
                row["ref_info"] = j.get("ref_info")
                sv = j["port"]["solve"]
                row["solve"] = dict(status=sv.get("status"), nfev=sv.get("nfev"), maxfev=sv.get("maxfev"),
                                    kL_u=sv.get("kL_u"), th_deg=sv.get("th_deg"), kR_u=sv.get("kR_u"),
                                    s_u=j["port"]["entry"]["s_u"], from_end_u=j["port"]["exit"]["from_end_u"],
                                    stretch_solved_u=sv.get("stretch_solved_u"), ymin_u=sv.get("ymin_u"),
                                    crossings=sv.get("crossings"), after_high=sv.get("after_high"))
                row["extra"] = "; ".join(sm_["extra"] for sm_ in (s1, s2) if "extra" in sm_)
                sh2 = [dict(s) for s in sh]
                sh2[j["iL"]]["x"], sh2[j["iR"]]["x"] = lL["x"], lR["x"]
                fLj = (np.asarray(j["fL"][0], float), j["fL"][1], j["fL"][2])
                fRj = (np.asarray(j["fR"][0], float), j["fR"][1], j["fR"][2])
                ref_j, _ = J.pair_reference(font, B, j["L"], j["R"], sh2, j["iL"], j["iR"], fLj, fRj)
                if ref_j is not None and len(ref_j) > 1:
                    ref_j = np.asarray(ref_j, float)
                    Ps = dense(pc, 64)[0]
                    d1 = cKDTree(ref_j).query(Ps)[0]
                    d2 = cKDTree(Ps).query(ref_j)[0]
                    row["dist_max_b3_u"] = float(max(d1.max(), d2.max())) * U
                    row["dist_mean_b3_u"] = float(d1.mean()) * U
            rows.append(row)
        for k_, j in enumerate(A["leads"]):
            pc = FN.conn_beziers(j["coeffs"])
            d, lt, sR = letter_for(A["letters"], np.asarray(pc[-1][3], float), "first", False)
            stR = lt["strokes"][sR]
            virt = "virtual" in j
            if virt:
                fr, which = J.entry_rec(B, j["ch"], VLEAD_LEFT)
            else:
                fr, which = B[j["ch"]]["entry"], "entry"
            kind = fr.get("kind", B[j["ch"]]["entry"].get("kind", ""))
            if kind == "fused":
                s2 = dict(seam=f"entry {j['ch']} ({which}, fused junction)", **fused_seam(pc, B, j["ch"], fr, lt["x"]))
                ctxR = []
            else:
                s2 = dict(seam=f"entry {j['ch']} ({which}, {kind})", **seam(pc, stR, True, False))
                ctxR = tail_part(stR, 12.0, False)
            s2["designed"] = kind == "cusp"
            row = dict(id=f"{tag}:lead{k_}{j['ch']}", word=w, type="vlead" if virt else "lead", pair="^" + j["ch"],
                       kind=kind, seams=[s2], budget=BUDGET_FUSED if kind == "fused" else BUDGET, prm=None,
                       at_floor=[], letter_i=lt["i"], src=str(j.get("virtual", "lead")))
            ref = None if virt else glyph_skel(font, sh[lt["i"]])
            measure(row, pc, [], ctxR, True, kind == "fused", p95, one_sided=ref)
            rows.append(row)
        for k_, j in enumerate(A["tails"]):
            pc = FN.conn_beziers(j["coeffs"])
            d, lt, sL = letter_for(A["letters"], np.asarray(pc[0][0], float), "last", True)
            stL = lt["strokes"][sL]
            s1 = dict(seam="exit " + j["ch"], **seam(pc, stL, False, True))
            row = dict(id=f"{tag}:tail{k_}{j['ch']}", word=w, type="tail", pair=j["ch"] + "$", kind="", seams=[s1],
                       budget=BUDGET, prm=None, at_floor=[], letter_i=lt["i"], src="tail")
            measure(row, pc, tail_part(stL, 12.0, True), [], False, True, p95,
                    one_sided=glyph_skel(font, sh[lt["i"]]))
            rows.append(row)
    rows += variant_rows(font, B)
    for r in rows:
        r["badness"] = badness(r)
    rows.sort(key=lambda r: -r["badness"])
    with open(out_json, "w") as fh:
        json.dump(dict(label=label, bodies=bodies_path, params=params_path, rows=rows), fh, default=float)
    lines = [f"K962 join census of {label or bodies_path} ({len(rows)} pieces; bodies {bodies_path}, params "
             f"{params_path}, generator {gen})",
             "K1019: a solved (port) join's dmax is measured against the font's connector cut at the join's own ends; "
             "the census_k1012 number (cut at the build's entry frame) follows each such row as 'dist at the frame'",
             f"budget {BUDGET} u ({BUDGET_FUSED} u fused); G2 seam: gap < {G2_POS_U} u, angle < {G2_ANG_DEG} deg, "
             f"dk < {G2_DK_U} /u; hook: a turn over {HOOK_DEG:.0f} deg within {HOOK_WIN_U} u; spike: |k| > {SPIKE_X} x "
             f"the word's p95 (combs sheet sampling); peak |dk/ds| in 1/u^2 (ratio to rough's "
             f"{R.SCALE_DK * 1e6:.0f}/Mfu^2 = {SCALE_DK_U:.2e}/u^2); rough: rough_k969 limits", ""]
    lines += summary(rows)
    lines += body_corners(B)
    lines += ["", "ranked, worst first (prm* = a0 or a1 at the 0.02 floor; hooks: turn deg @ u from start/end):",
              f"{'#':>3} {'badness':>8}  {'piece':44s} {'type':7s} {'kind':6s} {'dmax':>6} {'dmean':>6} {'bud':>4} "
              f"{'peak':>8} {'ratio':>6} {'spk':>4} {'k/p95':>8} {'hook':>4} {'rough':6s} {'len':>6}  seams "
              f"(gap u / angle deg / dk 1/u); hooks; prm"]
    for i, r in enumerate(rows):
        lines.append(fmt_row(i, r))
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines[:14]))


def fmt_row(i, r):
    ss = "; ".join(f"{sm['seam']}: {sm['gap_u']:.3g}/{sm['ang_deg']:.3g}/{sm['dk_u']:.2g}"
                   + (" (corner by design)" if sm.get("designed") else "")
                   + ("" if sm.get("designed") or g2_ok(sm) else " NOT G2") for sm in r["seams"])
    hk = ", ".join(f"{h[0]:.0f}@{h[1]:.2f}/{h[2]:.2f}" for h in r["hooks"])
    pr = ""
    if r.get("prm"):
        pr = "prm " + ",".join(f"{v:.3g}" for v in r["prm"]) + ("*" if r["at_floor"] else "") + f" {r.get('src', '')}"
    return (f"{i + 1:3d} {r['badness']:8.1f}  {r['id']:44s} {r['type']:7s} {r['kind']:6s} "
            f"{r['dist_max_u']:6.2f} {r['dist_mean_u']:6.2f} {r['budget']:4.1f} {r['peak_dkds_u']:8.4f} "
            f"{r['peak_ratio']:6.1f} {r['spikes']:4d} {r['kmax_p95']:8.1f} {len(r['hooks']):4d} "
            f"{r['rough']:6s} {r['len_u']:6.1f}  {ss}" + (f"; hooks {hk}" if hk else "") + (f"; {pr}" if pr else "")
            + (f"; dist at the frame {r['dist_max_frame_u']:.2f} u (K1019)" if "dist_max_frame_u" in r else "")
            + (f"; B3's own-ends dist {r['dist_max_b3_u']:.2f} u" if "dist_max_b3_u" in r else "")
            + (f"; {r['extra']}" if r.get("extra") else "")
            + (f"; solve status {r['solve']['status']} nfev {r['solve']['nfev']}" if r.get("solve") else ""))


def variant_rows(font, B):
    """The e variants' start curves (glyph-local), once per record."""
    rows = []
    e = B.get("e", {})
    bz = e["strokes"][0]["beziers"]
    Pb, Kb, Tb, sb = (np.asarray(v) for v in L.samples(bz, 0.5))
    for rec in ("after_o", "after_g"):
        fr = (e.get(rec) or {}).get("frame")
        if not fr or "body0" not in fr:
            continue
        b0 = fr["body0"]
        u = float(np.interp(fr["sJ"], sb, Kb + Tb))
        k_ = min(int(math.floor(u)), len(bz) - 1)
        Jp = np.asarray(L.bez_pt(bz[k_], min(max(u - k_, 0.0), 1.0)), float)
        m = 1 + int(np.argmin([np.linalg.norm(np.asarray(b[3], float) - Jp) for b in b0[:-1]]))
        start, rest = b0[:m], b0[m:]
        key = "o" if rec == "after_o" else "g"
        text, name = VARIANTS[key]
        sh = K.shape(font, text, 100, L.feats_for(text))
        g = next(g_ for g_ in sh if g_["name"] == name)
        sg = J.skel_graph(font, g, origin=g["x"])
        ends = [int(x) for x in np.nonzero(sg.deg == 1)[0]]
        dx = np.array([fr.get("shift", 0.0), 0.0])
        fu = sg.fu - dx
        e0 = min(ends, key=lambda x: fu[x][1])
        e1 = max(ends, key=lambda x: fu[x][1])
        path = J.skel_path(sg, sg.fu[e0], sg.fu[e1]) - dx
        p95 = float(np.percentile(comb_k(b0), 95))
        s2 = dict(seam="J (body)", **seam(start, rest, True, False))
        row = dict(id=f"variant:e:{rec}", word="(e " + rec + ")", type="variant", pair="e/" + key, kind="smooth",
                   seams=[s2], budget=BUDGET, sJ=fr["sJ"], sC=fr.get("sC"), n_start=len(start),
                   J=[float(Jp[0]), float(Jp[1])], prm=[float(v) for v in fr.get("prm", [])], at_floor=[],
                   src="evar")
        measure(row, start, [], tail_part(rest, 12.0, False), True, False, p95, one_sided=(path, cKDTree(path)))
        rows.append(row)
    return rows


def short(r):
    return f"{r['id'].split(':', 2)[-1]}({r['word'][:12]})"


def summary(rows):
    n = len(rows)
    over = [r for r in rows if np.isfinite(r["dist_max_u"]) and r["dist_max_u"] > r["budget"]]
    # K990 (call 2): o's cusp and overstroke live in o's body now and its exit seam is G2 like any other, so the
    # J2 exemption of `exit o` is gone; the body's corners are named by body_corners().
    notg2 = [(r, sm) for r in rows for sm in r["seams"] if not sm.get("designed") and not g2_ok(sm)]
    corners = [(r, sm) for r in rows for sm in r["seams"] if sm.get("designed")]
    spk = [r for r in rows if r["spikes"] > 0]
    rf = [r for r in rows if r["rough"] == "FAIL"]
    hk = [r for r in rows if r["hooks"]]
    kk = [r for r in rows if r["int_kinks"] > 0]
    fl = [r for r in rows if r.get("at_floor")]
    out = [f"pieces {n}: joins {sum(r['type'] == 'join' for r in rows)}, leads {sum(r['type'] == 'lead' for r in rows)}, "
           f"virtual leads {sum(r['type'] == 'vlead' for r in rows)}, tails {sum(r['type'] == 'tail' for r in rows)}, "
           f"variants {sum(r['type'] == 'variant' for r in rows)}",
           f"hooks (near-cusps inside a piece): {len(hk)} pieces: " + ", ".join(
               short(r) + " " + "+".join(f"{h[0]:.0f}deg@{min(h[1], h[2]):.2f}u{'S' if h[1] <= h[2] else 'E'}"
                                         for h in r["hooks"]) for r in hk),
           f"connectors with a0 or a1 at the 0.02 floor: {len(fl)}: " + ", ".join(
               short(r) + " a" + "".join(str(i_) for i_ in r["at_floor"]) for r in fl),
           f"over the budget: {len(over)}: " + ", ".join(f"{short(r)} {r['dist_max_u']:.2f}" for r in
                                                         sorted(over, key=lambda r: -r['dist_max_u'])),
           f"seams not G2 (undesigned): {len(notg2)}: " + ", ".join(
               f"{short(r)} {sm['seam']} {sm['gap_u']:.2g}u {sm['ang_deg']:.2g}deg dk {sm['dk_u']:.2g}"
               for r, sm in notg2),
           f"designed corners (cusp entries): {len(corners)}: " + ", ".join(
               f"{short(r)} {sm['ang_deg']:.0f}deg" for r, sm in corners),
           f"comb spikes: {len(spk)}: " + ", ".join(f"{short(r)} {r['spikes']} k/p95 {r['kmax_p95']:.1f}" for r in spk),
           f"internal kinks: {len(kk)}; rough FAIL: {len(rf)}: " + ", ".join(
               f"{short(r)} facet {r['facet']:.4f} wob {r['wobble']:.4f}" for r in rf),
           "peak |dk/ds| top 15 (excl. hooks): " + ", ".join(f"{short(r)} {r['peak_dkds_u']:.4f}"
                                                            for r in sorted(rows, key=lambda r: -r['peak_dkds_u'])[:15])]
    return out


DESIGNED_BODY = {"o": "o's top cusp (K976)", "a": "a's top corner (K990)", "k": "k's leg meets the stem (K990)",
                 "f": "f's cusp (K990)", "g": "g's top corner (K1012)", "q": "q's top corner (K1012)"}


def body_corners(B, min_deg=20.0):
    """Tangent breaks over min_deg at the nodes inside each body (fu strokes). The ones Levi asked for (o, a, k, f)
    (and g, q since K1012) are named as designed; the rest are the bodies' retrace cusps (stems, n's and m's arches, ...)."""
    out, rest = [], []
    for X in sorted(B):
        for si, st in enumerate(B[X]["strokes"]):
            bz = [np.asarray(b, float) for b in st["beziers"]]
            for i in range(len(bz) - 1):
                t0 = bz[i][3] - bz[i][2]
                t1 = bz[i + 1][1] - bz[i + 1][0]
                if np.linalg.norm(t0) < 1e-9 or np.linalg.norm(t1) < 1e-9:
                    continue
                c = float(np.clip(np.dot(t0, t1) / np.linalg.norm(t0) / np.linalg.norm(t1), -1, 1))
                a = math.degrees(math.acos(c))
                if a > min_deg:
                    (out if X in DESIGNED_BODY else rest).append(f"{X} node {i + 1} {a:.0f}deg")
            if X in DESIGNED_BODY:
                # a corner made of two points that share coordinates (a's top: the body's start is the stem's top
                # node, the bowl's tangent there differs from the stem's)
                s0 = bz[0][0]
                ts = bz[0][1] - bz[0][0]
                for i in range(len(bz) - 1):
                    if np.linalg.norm(bz[i][3] - s0) < 0.05:
                        t0 = bz[i][3] - bz[i][2]
                        c = float(np.clip(np.dot(t0, ts) / np.linalg.norm(t0) / np.linalg.norm(ts), -1, 1))
                        out.append(f"{X} start = node {i + 1} (shared point), {math.degrees(math.acos(c)):.0f}deg "
                                   f"between the arrival there and the start")
    named = ", ".join(f"{DESIGNED_BODY[X]}" for X in DESIGNED_BODY if any(s.startswith(X + " ") for s in out))
    return [f"designed body corners (Levi's asks; not kinks): {len(out)}: " + ", ".join(out) + (f" [{named}]"
                                                                                               if named else ""),
            f"other body corners over {min_deg:.0f} deg (retrace cusps): {len(rest)}: " + ", ".join(rest)]


def cmp(a_path, b_path, out_txt):
    A = {r["id"]: r for r in json.load(open(a_path))["rows"]}
    Bj = json.load(open(b_path))
    Bm = {r["id"]: r for r in Bj["rows"]}

    def ws(r):
        v = [sm["dk_u"] for sm in r["seams"] if not sm.get("designed")]
        return max(v, default=0.0)

    def wa(r):
        v = [sm["ang_deg"] for sm in r["seams"] if not sm.get("designed")]
        return max(v, default=0.0)
    lines = [f"K962 census compare: {a_path} -> {b_path}", "",
             f"{'piece':44s} {'dmax':>13} {'dmean':>13} {'peak 1/u^2':>17} {'hooks':>6} {'spk':>8} {'rough':>12} "
             f"{'seam deg':>15} {'seam dk 1/u':>19} {'badness':>15}"]
    ids = sorted(set(A) | set(Bm), key=lambda i: -(Bm.get(i, A.get(i))["badness"]))
    for i in ids:
        a, b = A.get(i), Bm.get(i)
        if a is None or b is None:
            lines.append(f"{i:44s} only in {'after' if a is None else 'before'}")
            continue
        lines.append(f"{i:44s} {a['dist_max_u']:5.2f}->{b['dist_max_u']:5.2f} {a['dist_mean_u']:5.2f}->"
                     f"{b['dist_mean_u']:5.2f} {a['peak_dkds_u']:7.4f}->{b['peak_dkds_u']:7.4f} "
                     f"{len(a['hooks']):2d}->{len(b['hooks']):<2d} {a['spikes']:3d}->{b['spikes']:<3d} "
                     f"{a['rough']:>5}->{b['rough']:<5} {wa(a):6.2g}->{wa(b):<6.2g} {ws(a):8.2g}->{ws(b):<8.2g} "
                     f"{a['badness']:7.1f}->{b['badness']:<7.1f}"
                     + (f"  [dmax at the frame {a.get('dist_max_frame_u', float('nan')):5.2f}->"
                        f"{b.get('dist_max_frame_u', float('nan')):5.2f}]"
                        if ("dist_max_frame_u" in a or "dist_max_frame_u" in b) else ""))
    with open(out_txt, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines[:40]))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "run":
        gen = a[a.index("--gen") + 1] if "--gen" in a else "gen_k1027"
        label = a[a.index("--label") + 1] if "--label" in a else ""
        words = a[a.index("--words") + 1].split(",") if "--words" in a else None
        ports = a[a.index("--ports") + 1] if "--ports" in a else None
        variant = a[a.index("--variant") + 1] if "--variant" in a else "A"
        run(a[1], a[2], a[3], a[4], a[5], gen=gen, label=label, words=words, ports=ports, variant=variant)
    elif a[0] == "cmp":
        cmp(a[1], a[2], a[3])
