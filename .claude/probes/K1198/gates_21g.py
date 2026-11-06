# K1198 Run G (21G) tasks 3-5 tables: 20G's bench against this run's ligature-off
# censuses, the hidden join's own numbers, the side screen and determinism.
# Inputs (all in this folder unless named): census_Plc1m.json/.txt (20G bench),
# census_Plc1m_off/off2.json/.txt and census_v72_off.json/.txt (calt off everywhere,
# census_21g_off.py), trace work32/census_v72.json (v7.2 bench, read-only),
# side_Plc1m.txt and ij_Plc1m.txt. The side screen re-assembles the 72 cusp pairs
# calt-off under each hand (solver calls; K926_FINAL_E=shear, pins default).
# Writes gates_21g.txt/.json beside it.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\gates_21g.py
import hashlib
import json
import math
import os
import re
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ["K926_FINAL_E"] = "shear"
os.environ.pop("K1009_PINS", None)


def load(p):
    return json.load(open(p, encoding="utf-8"))


def counts(txt_path):
    t = open(txt_path, encoding="utf-8").read()
    def grab(pat, cast=str):
        m = re.search(pat, t)
        return cast(m.group(1)) if m else None
    return dict(
        pieces=grab(r"pieces (\d+):", int),
        hooks=grab(r"hooks \(near-cusps inside a piece\): (\d+) pieces", int),
        over=grab(r"over the budget: (\d+):", int),
        seams=grab(r"seams not G2 \(undesigned\): (\d+):", int),
        spikes=grab(r"comb spikes: (\d+):", int),
        rough=grab(r"rough FAIL: (\d+):", int),
    )


def rowmap(d):
    return {r["id"]: r for r in d["rows"]}


def finite(v):
    return isinstance(v, (int, float)) and math.isfinite(v)


def first_divergence(a, b):
    """First row id (sorted) whose gated fields differ; nan counts as a value."""
    A, B = rowmap(a), rowmap(b)
    for rid in sorted(set(A) | set(B)):
        if rid not in A:
            return rid, "only in second"
        if rid not in B:
            return rid, "only in first"
        ra, rb = A[rid], B[rid]
        for f in ("dist_max_u", "dist_mean_u", "peak_dkds_u", "spikes", "rough"):
            va, vb = ra.get(f), rb.get(f)
            if isinstance(va, float) and isinstance(vb, float) and math.isnan(va) and math.isnan(vb):
                continue
            if va != vb:
                return rid, f"{f} {va} -> {vb}"
        if len(ra.get("hooks", [])) != len(rb.get("hooks", [])):
            return rid, f"hooks {len(ra.get('hooks', []))} -> {len(rb.get('hooks', []))}"
        for sa, sb in zip(ra.get("seams", []), rb.get("seams", [])):
            for f in ("gap_u", "ang_deg", "dk_u"):
                if sa.get(f) != sb.get(f):
                    return rid, f"seam {f} {sa.get(f)} -> {sb.get(f)}"
    return None, "identical gated fields"


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]


def main():
    bench = load(os.path.join(KDIR, "census_Plc1m.json"))
    off = load(os.path.join(KDIR, "census_Plc1m_off.json"))
    off2 = load(os.path.join(KDIR, "census_Plc1m_off2.json"))
    v72off = load(os.path.join(KDIR, "census_v72_off.json"))
    v72bench = load(os.path.join(T, "work32", "census_v72.json"))
    lines = ["K1198 Run G (21G) gates: 20G bench (Plc1m, calt on) against Run G "
             "(calt off everywhere; Plc1m and v7.2), plus determinism (off vs off2)."]
    for name, jp, tp in (
            ("bench Plc1m on", "census_Plc1m.json", "census_Plc1m.txt"),
            ("Plc1m off", "census_Plc1m_off.json", "census_Plc1m_off.txt"),
            ("Plc1m off2", "census_Plc1m_off2.json", "census_Plc1m_off2.txt"),
            ("v7.2 off", "census_v72_off.json", "census_v72_off.txt")):
        c = counts(os.path.join(KDIR, tp))
        d = load(os.path.join(KDIR, jp))
        joins = [r for r in d["rows"] if r.get("type") == "join"]
        nan = [r for r in joins if not finite(r.get("dist_max_u"))]
        lines.append(f"  {name}: {c}; joins {len(joins)}, joins with non-finite dmax {len(nan)}; "
                     f"sha txt {sha(os.path.join(KDIR, tp))} json {sha(os.path.join(KDIR, jp))}")
    for name, d in (("bench Plc1m on", bench), ("Plc1m off", off), ("v7.2 off", v72off),
                    ("bench v7.2 on", v72bench)):
        for r in d["rows"]:
            if r.get("word") == "ij" and r.get("type") == "join":
                lines.append(f"  ij join {name}: {r['id']} dmax {r.get('dist_max_u')} "
                             f"kind {r.get('kind')} solve {r.get('solve')} seams {r.get('seams')}")
        if not any(r.get("word") == "ij" and r.get("type") == "join" for r in d["rows"]):
            tails = [r["id"] for r in d["rows"] if r.get("word") == "ij"]
            lines.append(f"  ij join {name}: none (ij rows: {tails})")
    for a_name, a, b_name, b in (("bench Plc1m", bench, "Plc1m off", off),
                                 ("bench v7.2", v72bench, "v7.2 off", v72off),
                                 ("Plc1m off", off, "Plc1m off2", off2)):
        rid, why = first_divergence(a, b)
        lines.append(f"  first divergence {a_name} -> {b_name}: {rid} ({why})")
    # the same, keyed by (word, pair, type) so the cnct-index shift in join IDs
    # (J0-2 on, J0-1 off) does not hide the first gated-field change
    def by_pair(d):
        m = {}
        for r in sorted(d["rows"], key=lambda r: r["id"]):
            m.setdefault((r.get("word"), r.get("pair"), r.get("type")), []).append(r)
        return m
    for a_name, a, b_name, b in (("bench Plc1m", bench, "Plc1m off", off),
                                 ("bench v7.2", v72bench, "v7.2 off", v72off)):
        A, B = by_pair(a), by_pair(b)
        done = False
        for k in sorted(set(A) | set(B), key=str):
            if k not in A or k not in B or len(A[k]) != len(B[k]):
                lines.append(f"  first gated divergence by (word,pair) {a_name} -> {b_name}: "
                             f"{k} (row count {len(A.get(k, []))} -> {len(B.get(k, []))})")
                done = True
                break
            for ra, rb in zip(A[k], B[k]):
                if finite(ra.get("dist_max_u")) and not finite(rb.get("dist_max_u")):
                    lines.append(f"  first gated divergence by (word,pair) {a_name} -> {b_name}: "
                                 f"{k} {ra['id']} dmax {ra.get('dist_max_u')} -> nan (no font "
                                 f"connector to measure against, calt off)")
                    done = True
                    break
            if done:
                break
        if not done:
            lines.append(f"  first gated divergence by (word,pair) {a_name} -> {b_name}: none in dmax")
    # side screen: the 72 cusp pairs calt-off, per hand (assemble; side_min_u)
    import k886lib as L
    import gen_k1027 as G
    import trace_k879 as KK
    from k863lib import Font
    orig = L.feats_for

    def off_feats(text):
        f = dict(orig(text))
        f["calt"] = False
        return f
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    pairs = [a + b for a in "acdefhin" for b in "ijprstuwy"] + ["ij"]
    L.feats_for = off_feats
    try:
        for name, base, pp, var in (
                ("Plc1m", "work31/base", os.path.join(KDIR, "ports_k1112cusp.json"), "Plc1m"),
                ("v7.2", "work32/base", os.path.join(T, "work32", "ports_k1112cusp.json"), "Plc2m")):
            B = json.load(open(os.path.join(T, base, "bodies.json")))
            P = json.load(open(os.path.join(T, base, "join_params.json")))
            ports = G.load_ports(pp, var)
            sides = {}
            for w in pairs:
                A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=ports)
                for j in A["joins"]:
                    if "port" in j:
                        sides[w] = j["port"]["solve"].get("side_min_u")
            below = {k: v for k, v in sides.items() if v is not None and v < -0.05}
            lines.append(f"  side screen {name} calt-off (72 cusp pairs + ij): solved {len(sides)}, "
                         f"min side {min(v for v in sides.values() if v is not None):.4f} "
                         f"(ij {sides.get('ij')}), below -0.05 u: {below}")
    finally:
        L.feats_for = orig
    # shaping move screen: every census string's shaping on vs off
    sys.path.insert(0, KDIR)
    import ligature_21g as LG
    moved, steady = [], []
    for w in LG.census_strings():
        _, lon, _ = LG.letter_glyphs(font, w, orig(w))
        _, loff, _ = LG.letter_glyphs(font, w, off_feats(w))
        sh_on = KK.shape(font, w, 100, orig(w))
        sh_off = KK.shape(font, w, 100, off_feats(w))
        same = [(s["name"], s["x"], s["adv"]) for s in sh_on] == [(s["name"], s["x"], s["adv"]) for s in sh_off]
        (steady if same else moved).append(w)
    lines.append(f"  shaping screen (census strings): moved {len(moved)}, steady {len(steady)}; "
                 f"steady list: {steady[:20]}")
    outj = dict(moved=moved, steady=steady)
    with open(os.path.join(KDIR, "gates_21g.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(outj, fh, indent=1)
        fh.write("\n")
    with open(os.path.join(KDIR, "gates_21g.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
