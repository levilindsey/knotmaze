# K863 audit 22L: measure the 30 cursive residuals on v6.8.
# Baseline: work34/base (J3k's kit-fixed rebuild of v6.8, byte-identical to
# work33/base; censuses work34/census_v68.json (J3e's words, 347 rows) and
# census_v68x.json (J3i's words, 713 rows), both from the kit's census tool).
# Read-only on the kit: this script only reads work34/work28 files and writes
# measures.txt / measures.json beside itself.
# Run from the trace dir:
#   venv\Scripts\python.exe -I ..\audit_22l\measures.py  (paths below are absolute)
import json
import math
import os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
U = 0.24  # template u per fu (x-height 500 fu = 120 u)

C68 = json.load(open(os.path.join(T, "work34", "census_v68.json")))
C68X = json.load(open(os.path.join(T, "work34", "census_v68x.json")))
B = json.load(open(os.path.join(T, "work34", "base", "bodies.json")))
PORTS = json.load(open(os.path.join(T, "work28", "ports_k990e.json")))

OUT = []


def say(s=""):
    OUT.append(s)
    print(s)


def rows(C):
    return C["rows"]


def by_pair(C, pair):
    return [r for r in C["rows"] if r.get("pair") == pair]


def fmt(r):
    if r is None:
        return "ABSENT"
    hooks = len(r["hooks"]) if isinstance(r["hooks"], list) else r["hooks"]
    prm = " ".join("%.4g" % v for v in r["prm"]) if r.get("prm") else "-"
    return (f"{r['id']} type={r['type']} kind={r['kind']} dmax={r['dist_max_u']:.2f} "
            f"dmean={r['dist_mean_u']:.2f} bud={r['budget']} peak={r['peak_dkds_u']:.4g} "
            f"spk={r['spikes']} hooks={hooks} rough={r['rough']} facet={r['facet']:.4g} "
            f"len={r['len_u']:.1f} prm=[{prm}] at_floor={r['at_floor']} "
            f"src={r['src']}")


def show(C, label, pair):
    rr = by_pair(C, pair)
    if not rr:
        say(f"  [{label}] pair {pair}: ABSENT from census")
    for r in rr:
        say(f"  [{label}] {fmt(r)}")
        for sm in r["seams"]:
            say(f"      seam {sm.get('seam')}: gap={sm.get('gap_u'):.3g} ang={sm.get('ang_deg'):.4g} "
                f"dk={sm.get('dk_u'):.4g} designed={sm.get('designed')}")
    return rr


def seam_rows(C, pred, label):
    n = 0
    for r in C["rows"]:
        for sm in r["seams"]:
            if pred(r, sm):
                say(f"  {label}: {r['id']} pair={r['pair']} seam={sm.get('seam')} "
                    f"gap={sm.get('gap_u'):.3g} ang={sm.get('ang_deg'):.4g} dk={sm.get('dk_u'):.4g} "
                    f"designed={sm.get('designed')}")
                n += 1
    say(f"  {label}: total {n}")
    return n


say("=" * 100)
say("22L measures on v6.8 (work34/base, kit-fixed rebuild; censuses work34/census_v68*.json)")
say(f"census_v68: {len(C68['rows'])} rows label={C68['label']}; census_v68x: {len(C68X['rows'])} rows")
say("")

# ---- K903: k X angle, f coverage, p stem kink --------------------------------
say("## K903 (v3: k X 61.3 deg vs font 3.2; coverage 4.3 u in f; p stem kink unmeasured)")
for L in ("k", "f", "p"):
    b = B[L]
    say(f"  {L}: body_x={b.get('body_x')} fid={b.get('fid_unit_u'):.3f} u cov={b.get('cov_unit_u'):.3f} u "
        f"crossings={b.get('crossings')}")
say("")

# ---- K912: ok, or (o/b exits per class); f exit -------------------------------
say("## K912 (v4: ok 10.9, or 6.5 u; f's exit walk; per-left split)")
for p in ("ok", "or", "fo", "br"):
    show(C68X, "v68x", p)
say("")

# ---- K913: a fused junction, frames -------------------------------------------
say("## K913 (v4: a fused junction at font's 47.5 u; frame in kink 30.2 vs 52.6 deg; d after-o frame 36.3)")
for L in ("a", "c", "d", "g", "q", "o"):
    e = B[L]["entry"]
    fz = e.get("fused") or {}
    fj = fz.get("font_junction") or [0, 0]
    say(f"  {L}: entry kind={e['kind']} entry_pt_y={e['pt'][1] * U:.2f} u "
        f"(rule y_u={fz.get('y_u')}) font_junction_y={fj[1] * U:.2f} u")
d = B["d"]
say(f"  d after_o frame: {json.dumps(d.get('after_o', {}).get('frame', {}), default=str)[:400]}")
say(f"  a entry fit T={B['a']['entry'].get('fit')}")
say("")

# ---- K927: nfev caps ------------------------------------------------------------
say("## K927 (v5.1: fits stop at nfev 600 for 16/26 letters; a 5.0, q 4.0 u off trace)")
for L in "abcdefghijklmnopqrstuvwxyz":
    fn = B[L].get("fewnode") or {}
    say(f"  {L}: fewnode tol={fn.get('tol_u')} dev_u={fn.get('dev_u')} strokes_n={len(B[L]['strokes'])} "
        f"n_bez_in={[s.get('n_bez_in') for s in fn.get('strokes', [])]}")
say("  (v6.8 bodies come from the template through the few-node writer; no per-letter")
say("   trace fit with an nfev 600 cap exists in this pipeline. Solve nfev: see sheets.)")
say("")

# ---- K937: connector into o -----------------------------------------------------
say("## K937 (J2 mod_n_o set: ho 2.85, no 2.89, do 2.76, ro 2.89 u, inside 3.0)")
for p in ("ho", "no", "do", "ro", "ma", "la", "ug", "po", "to", "io", "mo", "ng", "ao", "qo", "eo", "co"):
    show(C68X, "v68x", p)
say("")

# ---- K938: zo 142 u; crossings into o -------------------------------------------
say("## K938 (v5.2: zo 142 u at every height; five new crossings into o)")
for p in ("zo", "po", "no", "ro", "do", "eo"):
    show(C68X, "v68x", p)
say("  crossings into o on the sheet: see sheets_o.txt (solve crossings per pair)")
say("")

# ---- K947: f frames sharing a node; bodies size; ot crossing --------------------
say("## K947 (v5.3: f's frames share a node; bodies.json 4.5 MB; ot crossing)")
say(f"  bodies.json bytes={os.path.getsize(os.path.join(T, 'work34', 'base', 'bodies.json'))}")
say(f"  f after_o={json.dumps(B['f'].get('after_o'), default=str)[:300]}")
say(f"  f after_b={json.dumps(B['f'].get('after_b'), default=str)[:300]}")
for p in ("ot", "pp", "mp"):
    show(C68X, "v68x", p)
say("")

# ---- K948: e after o/b/v/w elbow; b/v/w exits 3-9 deg steeper -------------------
say("## K948 (e after o,b,v,w elbow; b,v,w exits leave 3-9 deg steeper than font's)")
for p in ("be", "we", "ve", "oe", "fe"):
    show(C68X, "v68x", p)
for L in "bvw":
    T_ = B[L]["exit"]["T"]
    say(f"  {L} exit angle={math.degrees(math.atan2(T_[1], T_[0])):.2f} deg (font about -12.5 to -14.5)")
say("")

# ---- K949: fe, bk, ee, br, y tail ------------------------------------------------
say("## K949 (fe 18.8 / v5.8 15.34, bk 7.85, ee 6.9, br 5.18, y tail 3.55 u)")
for p in ("fe", "bk", "ee", "br"):
    show(C68X, "v68x", p)
for r in C68X["rows"]:
    if r["type"] == "tail" and r["pair"] and r["pair"].endswith("y"):
        say(f"  tail-y row: {fmt(r)}")
say("")

# ---- K951: no final tail for b f p v o s w ---------------------------------------
say("## K951 (v5.4: b,f,p,v,o,s,w end without a final tail, as the font's do)")
tails = [r for r in C68X["rows"] if r["type"] == "tail"]
say(f"  tail rows in v68x: {len(tails)}; sample ids: {[r['id'] for r in tails[:5]]}")
for r in tails[:40]:
    say(f"    {fmt(r)}")
if len(tails) > 40:
    say(f"    ... ({len(tails) - 40} more tail rows; full list in census_v68x.txt)")
say(f"  k863k fin forms in v6.8 join_params: {'k863k' in json.load(open(os.path.join(T, 'work34', 'base', 'join_params.json')))}")
say("")

# ---- K961: node counts -------------------------------------------------------------
say("## K961 (v5.8: 8 of 30 body strokes over 12 nodes: m21 k18 h16 w16 y15 p14 a13 n13)")
cnt = {}
for L in "abcdefghijklmnopqrstuvwxyz":
    fn = B[L].get("fewnode") or {}
    n = fn.get("strokes", [{}])[0].get("nodes") if fn.get("strokes") else None
    # fewnode nodes counts the main stroke; total strokes per letter:
    tot = sum(len(s["beziers"]) for s in B[L]["strokes"])
    cnt[L] = (n, tot)
    say(f"  {L}: fewnode nodes={n} cubics_total={tot} strokes={len(B[L]['strokes'])}")
say(f"  letters with fewnode nodes > 12: {[L for L, (n, t) in cnt.items() if n and n > 12]}")
say("")

# ---- K977: b/z notches, b comb steps, k peak, f hook nodes ----------------------------
say("## K977 (v5.8: b notch 1.77->0.46, z notch 0.43->0.25 still show; b comb steps unmeasured;")
say("         k peak 2.71 (its fair's own); f hook three nodes about 13 u apart)")
for L in ("b", "z", "k", "f"):
    fn = B[L]["fewnode"]["strokes"][0]
    say(f"  {L}: nodes={fn['nodes']} pieces:")
    for pc in fn["pieces"]:
        if "nodes" in pc:
            say(f"    piece len={pc['len_fu']:.0f} fu nodes(s_fu, kind, dk?)={pc['nodes']}")
# curvature jumps at b's nodes and comb proxy: census spikes on b pieces
for p in ("bb",):
    show(C68X, "v68x", p)
say("  (notch depth / comb steps need the sampled curve: see bodies_sample.py output)")
say("")

# ---- K986: rough fails n --------------------------------------------------------------
say("## K986 (K944 n edit: rough FAIL facet 0.0056 > 0.0053, peak 14.67 at 166 u)")
say(open(os.path.join(T, "work34", "base", "rough_check.txt")).read()[:2000])
for r in C68X["rows"]:
    if r["pair"] and (r["pair"].endswith("n") or r["pair"].startswith("n")) and r["type"] in ("tail", "lead", "vlead"):
        say(f"  {fmt(r)}")
say("")

# ---- K990: f ends in curl (fe 22.55, ff 16.55, fo 9.07) ---------------------------------
say("## K990 (B1/v6.0 left: f ends in a curl below the crossing, not a cusp into its exit;")
say("         fe 22.55, ff 16.55, fo 9.07 u off the font)")
for p in ("fe", "ff", "fo"):
    show(C68X, "v68x", p)
say(f"  f corners={B['f'].get('corners')} fewnode nodes={B['f']['fewnode']['strokes'][0]['nodes']}")
say("")

# ---- K991: cusp entries -------------------------------------------------------------------
say("## K991 (J2 left cusp entries at 143-172 deg, crossing about 20 u lower)")
n_des = 0
for r in C68X["rows"]:
    for sm in r["seams"]:
        if sm.get("designed"):
            n_des += 1
say(f"  designed (cusp/corner) seams in v68x: {n_des}")
seam_rows(C68X, lambda r, sm: bool(sm.get("designed")), "designed seam")
say("  side margins / crossings: see sheets_cusp.txt (sheet reports)")
say("")

# ---- K998: coverage -------------------------------------------------------------------------
say("## K998 (census coverage: add fe, bk, ee, na, nq, to, io, mo, ng; over-budget list)")
pairs68x = {r["pair"] for r in C68X["rows"] if r.get("pair")}
for p in ("fe", "bk", "ee", "na", "nq", "to", "io", "mo", "ng"):
    say(f"  pair {p} in v68x census: {p in pairs68x}")
for p in ("ot", "oe", "br", "fo"):
    show(C68X, "v68x", p)
for r in C68X["rows"]:
    if r["id"].endswith("tail0t") or r["id"].endswith("tail1t") or (r["type"] == "lead" and r["pair"] and r["pair"].startswith("f")):
        say(f"  {fmt(r)}")
        break
leads_f = [r for r in C68X["rows"] if r["type"] == "lead" and r["pair"] and r["pair"][0] == "f"]
if leads_f:
    say(f"  lead f example: {fmt(leads_f[0])}")
say("")

# ---- K1006: knees, hump, tail q ---------------------------------------------------------------
say("## K1006 (knees in e,f,l leads 0.0373/0.0397/0.0343; h hump 0.0053; tail0q exit not G2, 151 deg hook)")
for first in ("e", "f", "l", "h", "k", "c"):
    rr = [r for r in C68X["rows"] if r["type"] in ("lead", "vlead") and r["id"].endswith("lead0" + first)]
    if rr:
        say(f"  lead {first}: {fmt(rr[0])}")
for r in C68X["rows"]:
    if r["id"].endswith("tail0q"):
        say(f"  {fmt(r)}")
        for sm in r["seams"]:
            say(f"      seam {sm.get('seam')}: gap={sm.get('gap_u'):.3g} ang={sm.get('ang_deg'):.4g} dk={sm.get('dk_u'):.4g}")
        break
say("")

# ---- K1014: 0 u cusp entries, maxfev, bounds ---------------------------------------------------
say("## K1014 (J3a leftovers: 0 u cusp entries hi x2, er, es, ow x2; 12 maxfev solves; bounds)")
seam_rows(C68X, lambda r, sm: (sm.get("ang_deg") or 0) > 90 and not sm.get("designed"), "undesigned >90deg seam")
say(f"  at_floor rows in v68x: {sum(1 for r in C68X['rows'] if r['at_floor'])}")
for p in ("ea", "et", "ne", "he"):
    show(C68X, "v68x", p)
say("  solve status / nfev / bounds: see sheets_o.txt, sheets_cusp.txt reports")
say("")

# ---- K1021: g/q corners ---------------------------------------------------------------------------
say("## K1021 (B2: g,q corners 1.96/1.89 u above a's; new tops 9.2-9.3 u off font (a 8.0); og dmax 20.74)")
ya = B["a"]["corners"][0]["pt"][1]
for L in ("a", "g", "q"):
    c = B[L]["corners"][0]
    say(f"  {L}: corner pt={c['pt']} y={c['pt'][1] * U:.3f} u, {(c['pt'][1] - ya) * U:+.2f} u vs a, turn={c['turn_deg']:.1f} deg")
for L in ("a", "g", "q"):
    e = B[L]["entry"]
    say(f"  {L}: entry kind={e['kind']} junction={e['junction']} s_junction={e.get('s_junction')}")
for p in ("og",):
    show(C68X, "v68x", p)
say("")

# ---- K1035: oi two minima, corners at 30 deg, os dip, bounds, oe crossing ------------------------------
say("## K1035 (J3b leftovers: oi switches two minima 13.71 u; corners at 30 deg low end; oe crossed once)")
for p in ("oi", "oj", "os", "ou", "ow", "oy", "op", "oe", "ob", "of", "oh", "ok", "ol"):
    show(C68X, "v68x", p)
say("  corner arrival angles / attach bounds / crossings: see sheets_o.txt")
say("")

# ---- K1044: a peak, fa/fq coverage, oa/oq dip -------------------------------------------------------------
say("## K1044 (v6.5: a largest |dk/ds| 8.51e-4 above g's 7.07e-4; fa, fq in no census word; oa/oq dip)")
for p in ("fa", "fq", "oa", "oq", "ba", "va", "wa", "bq", "vq", "wq"):
    show(C68X, "v68x", p)
say("  body |dk/ds| peaks (a vs g): from bodies sampling, see bodies_sample.py output")
say("")

# ---- K1090: o joins at bounds --------------------------------------------------------------------------------
say("## K1090 (v6.6 o joins: oi oj os ou ow oy corners at +40 deg bound; op side -0.05;")
say("         ob oh ok ol at [0,100] end, oe at [0,90], oc od lower; os,oh,ok 34.8-36.2 u)")
for p in ("oc", "od"):
    show(C68X, "v68x", p)
say("  (oi..oy, ob..ol rows under K1035 above; bounds/side/corners in sheets_o.txt)")
say("")

# ---- K1116: f joins farther than v6.7 presets ---------------------------------------------------------------------
say("## K1116 (v6.8: fm 6.41, fn 10.29, fv 6.59, fz 11.46 u vs v6.7 presets 3.23/3.17/3.15/10.09;")
say("         attaches on a bound; fe at 2.00 u bound; fr/fs 2 u entry bound; fj/fw side slightly negative)")
for p in ("fm", "fn", "fv", "fz", "fe", "fr", "fs", "fj", "fw", "bq", "vq", "wq"):
    show(C68X, "v68x", p)
say(f"  ports pins: {json.dumps(PORTS.get('pins'))}")
say(f"  ports variants: {list((PORTS.get('variants') or {}).keys())}")
say("")

# ---- K1194: c lead rough, er/es MAXFEV --------------------------------------------------------------------------------
say("## K1194 (v7.0: c lead-in rough FAIL facet 0.0098; er, es solves stop at MAXFEV 3000)")
for r in C68X["rows"]:
    if r["type"] in ("lead", "vlead") and r["id"].endswith("lead0c"):
        say(f"  lead c: {fmt(r)}")
        break
for p in ("er", "es"):
    show(C68X, "v68x", p)
say("  er/es solve status in v6.8: see sheets_cusp.txt (preset joins have no solve)")
say("")

# ---- global census counts ------------------------------------------------------------------------------------------------
say("## Census totals on v6.8 (v68x, 713 rows)")
rr = C68X["rows"]
say(f"  hooks pieces={sum(1 for r in rr if (len(r['hooks']) if isinstance(r['hooks'], list) else r['hooks']))} "
    f"spike pieces={sum(1 for r in rr if r['spikes'])} rough FAIL={sum(1 for r in rr if r['rough'] == 'FAIL')} "
    f"over budget={sum(1 for r in rr if r['dist_max_u'] > r['budget'])}")
notg2 = [(r, sm) for r in rr for sm in r["seams"] if not sm.get("designed")
         and not (sm.get("gap_u", 0) < 0.01 and sm.get("ang_deg", 0) < 0.05 and sm.get("dk_u", 0) < 0.0005)]
say(f"  undesigned seams not G2: {len(notg2)}")
for r, sm in notg2:
    say(f"    {r['id']} seam={sm.get('seam')} gap={sm.get('gap_u'):.3g} ang={sm.get('ang_deg'):.4g} dk={sm.get('dk_u'):.4g}")

with open(os.path.join(HERE, "measures.json"), "w") as f:
    json.dump({"note": "see measures.txt"}, f)
with open(os.path.join(HERE, "measures.txt"), "w") as f:
    f.write("\n".join(OUT) + "\n")
print(f"\nwrote measures.txt ({len(OUT)} lines)")
