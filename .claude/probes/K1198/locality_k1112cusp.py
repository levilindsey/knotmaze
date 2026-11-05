# K1198 (Muse batch 20 Run G) COPY of work32/dbg/locality_k1112cusp.py (untouched in
# .claude/probes/K863/trace/): retargeted - T below is the trace's absolute path (read-only font,
# tools, work26/work27 dbg, work31/base and J3h's ports) instead of three folders up from this file;
# the candidate's ports are this folder's ports_k1112cusp.json and its base defaults to the trace's
# work31/base (the rule moves no body, so it is work32/base byte for byte; checks det in J3i).
# K1112 (J3i, v7.2): copy of work31/dbg/locality_k1112c.py (J3h's, untouched), retargeted: v7.1 (work31/base, ports
# work31/ports_k1112c.json Pc10) against v7.2 (argv[2], default work32/base; ports work32/ports_k1112cusp.json, variant
# argv[3], default Plc2). Touched: every solved join from a low exit (a letter with an exit port, not in HIGH = bovw)
# into a letter whose entry record has a cusp window (the rule's joins), the right letter's stroke 0 after one (its entry
# cut), the left letter's stroke the join's exit cuts (the exit stays free in its stretch), and the pairs named in
# argv[4] (comma-separated). Every other piece must be byte-identical (the coefficient arrays equal), and no body or
# join parameter may differ. The words: J3h's list plus every low-exit pair into a cusp-window letter.
# Run: venv\Scripts\python.exe -I work32\dbg\locality_k1112cusp.py <out.txt> [work32\base] [variant] [pairs]
# (J3h's header, for the lineage) K1112 (J3h, v7.1): copy of work30/dbg/locality_k1119.py (J3g's, untouched),
# retargeted: v7.0 against v7.1; K1119 (J3g), K1113 (J3f), K990e (J3e), K1027 (J3d) and K1009c (J3c) before it.
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

S = 0.24
TOUCH = set()
WORDS = ["and", "hippo", "knotmaze", "woven", "boxes", "brown", "fox", "jumps", "over", "the", "dog", "hex"]
CENSUS = ["minimum", "bow", "woven", "boxes", "people", "hippo", "puppy", "and", "knotmaze", "cursive", "quick", "brown",
          "fox", "jumps", "over", "the", "lazy", "dog", "be", "we", "shoe", "maze", "huge", "bye", "ice", "jet", "even",
          "coffee", "which", "oat", "bad", "subgroup", "lawgiver", "vg", "nt", "at", "it", "et", "bt", "vt", "wt", "to",
          "go", "too", "photo", "bob", "after"]
OPAIRS = ["o" + c for c in "abcdefghijklmnopqrstuvwxyz"]
EXTRA = ["aqua", "equal", "banquet", "quag", "squad"]
AQPAIRS = [p for c in "abcdefghijklmnopqrstuvwxyz" for p in (c + "a", "a" + c, c + "q", "q" + c)]
CWORDS = ["c" + c for c in "abcdefghijklmnopqrstuvwxyz"] + [c + "c" for c in "abcdefghijklmnopqrstuvwxyz"] + ["cursive", "quick", "ice", "coffee", "which", "cc", "acc"]
BVW = [x + c for x in "bvw" for c in "abcdefghijklmnopqrstuvwxyz"] + [c + x for x in "bvw" for c in "abcdefghijklmnopqrstuvwxyz"] + ["wave", "lawgiver", "subgroup", "which", "even"]
FWORDS = ["f" + c for c in "abcdefghijklmnopqrstuvwxyz"] + [c + "f" for c in "abcdefghijklmnopqrstuvwxyz"] + ["coffee", "of", "off", "fifty"]
LOWCUSP = [a + b for a in "acdefhin" for b in "ijprstuwy"] + ["air", "hairy", "dirt", "eyes", "first", "fruit", "hit", "nest", "inside", "cyst"]


def bez_pts(bzs, n=40):
    out = []
    for b in bzs:
        b = np.asarray(b, float)
        t = np.linspace(0, 1, n)[:, None]
        out.append(((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + (t ** 3) * b[3])
    return np.vstack(out)


def resample(P, n=400):
    d = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    if d[-1] <= 0:
        return np.repeat(P[:1], n, axis=0)
    u = np.linspace(0, d[-1], n)
    return np.c_[np.interp(u, d, P[:, 0]), np.interp(u, d, P[:, 1])]


def dist(a, b):
    return float(np.linalg.norm(resample(a) - resample(b), axis=1).max()) * S


def raw(x):
    return json.dumps(x, default=lambda o: np.asarray(o).tolist())


def rule_pairs(ports):
    """The rule's pairs: a low exit with a port (not in HIGH) into a letter whose entry record is a cusp window."""
    PT = ports["ports"]
    low = sorted(X for X in PT if "exit" in PT[X] and X not in G.HIGH)
    cusp = sorted(X for X in PT if PT[X].get("entry", {}).get("kind") == "cusp")
    return low, cusp, {a + b for a in low for b in cusp}


def pieces(font, B, P, ports, words, rule):
    """key -> (touched by the rule?, points, raw, group)."""
    out = {}
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=ports)
        hot = {}
        for j in A["joins"]:
            if (j["L"] + j["R"]) in rule or (j["L"] + j["R"]) in TOUCH:
                hot[(j["iR"], 0)] = "stroke 0 after a touched join"
                if "port" in j:
                    hot[(j["iL"], j["port"]["exit"]["stroke"])] = "exit stroke of a touched join"
        for k, lt in enumerate(A["letters"]):
            for si, st in enumerate(lt["strokes"]):
                grp = hot.get((lt["i"], si))
                tch = grp is not None
                out[f"{w}|letter {k} {lt['ch']} s{si}"] = (tch, bez_pts(st), raw(st), grp or ("letter " + lt["ch"]))
        for k, j in enumerate(A["joins"]):
            tch = (j["L"] + j["R"]) in rule or (j["L"] + j["R"]) in TOUCH
            out[f"{w}|join {j['L']}{j['R']} #{k}" + ("" if tch else " solved" if "port" in j else " preset")] = (
                tch, bez_pts(FN.conn_beziers(j["coeffs"])), raw(j["coeffs"]),
                ("touched join " + j["L"] + j["R"]) if tch else "join " + j["L"] + j["R"])
        for nm in ("leads", "tails"):
            for k, j in enumerate(A[nm]):
                ch = j.get("ch")
                out[f"{w}|{nm[:-1]} {ch} #{k}"] = (False, bez_pts(FN.conn_beziers(j["coeffs"])), raw(j["coeffs"]),
                                                   f"{nm[:-1]} {ch}")
    return out


def part_data(B5, B6, P5, P6, lines):
    lines.append("(0) the data, v7.1 (work31/base) against v7.2, raw JSON per key")
    for nm, X, Y in (("bodies.json", B5, B6), ("join_params.json", P5, P6)):
        keys = sorted(set(X) | set(Y))
        diff = [k for k in keys if raw(X.get(k)) != raw(Y.get(k))]
        lines.append(f"  {nm}: {len(keys)} keys, {len(diff)} differ: {diff}")
    bd = [k for k in sorted(set(B5) | set(B6)) if raw(B5.get(k)) != raw(B6.get(k))]
    pd = [k for k in sorted(set(P5) | set(P6)) if raw(P5.get(k)) != raw(P6.get(k))]
    return bd + pd


def main():
    out = sys.argv[1]
    d6 = sys.argv[2] if len(sys.argv) > 2 else os.path.join("work31", "base")
    var6 = sys.argv[3] if len(sys.argv) > 3 else "Plc2"
    TOUCH.update(p for p in (sys.argv[4].split(",") if len(sys.argv) > 4 else []) if p)
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    d5 = os.path.join(T, "work31", "base")
    d6 = d6 if os.path.isabs(d6) else os.path.join(T, d6)
    B5 = json.load(open(os.path.join(d5, "bodies.json")))
    P5 = json.load(open(os.path.join(d5, "join_params.json")))
    B6 = json.load(open(os.path.join(d6, "bodies.json")))
    P6 = json.load(open(os.path.join(d6, "join_params.json")))
    p5 = G.load_ports(os.path.join(T, "work31", "ports_k1112c.json"), "Pc10")
    p6 = G.load_ports(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ports_k1112cusp.json"), var6)
    low, cusp, rule = rule_pairs(p6)
    assert rule_pairs(p5)[2] == rule
    lines = [f"K1112 cusp locality: v7.1 (work31/base, ports Pc10) against v7.2 ({os.path.relpath(d6, T)}, K1198 ports {var6}); "
             f"the rule's pairs: low exits {''.join(low)} into cusp windows {''.join(cusp)} ({len(rule)} pairs); named pairs {sorted(TOUCH)}"]
    moved_data = part_data(B5, B6, P5, P6, lines)
    words = list(dict.fromkeys(WORDS + CENSUS + OPAIRS + EXTRA + AQPAIRS + FWORDS + BVW + CWORDS + LOWCUSP + ["oe", "ae", "ee", "ie"]))
    U = pieces(font, B5, P5, p5, words, rule)
    E = pieces(font, B6, P6, p6, words, rule)
    miss = sorted(set(U) ^ set(E))
    un_same = un_diff = 0
    bad, groups = [], {}
    for k in U:
        if k not in E:
            continue
        same = U[k][2] == E[k][2]
        if U[k][0] or E[k][0]:
            g = groups.setdefault(E[k][3] if E[k][0] else U[k][3], [0, 0, []])
            g[0] += 1
            if not same:
                g[1] += 1
                g[2].append((dist(U[k][1], E[k][1]), k))
        else:
            un_same += same
            un_diff += not same
            if not same:
                bad.append((dist(U[k][1], E[k][1]), k))
    ok = un_diff == 0 and not miss and not moved_data
    lines.append(f"\n(1) the pieces, {len(words)} words (J3h's list plus every low-exit pair into a cusp window and words holding one), {len(U)} pieces")
    lines.append(f"  untouched (not a rule's join, its right letter's stroke 0 or its exit stroke): {un_same + un_diff} pieces, {un_diff} not byte-identical "
                 f"{'PASS' if ok else 'FAIL'}" + (f"; pieces only in one build: {miss}" if miss else ""))
    for d, k in sorted(bad, reverse=True):
        lines.append(f"      untouched piece changed: {k} {d:.3e} u")
    lines.append("  touched, by kind: pieces, moved, the largest move")
    for g in sorted(groups):
        n, m, lst = groups[g]
        top = max(lst) if lst else None
        lines.append(f"    {g:34s} {n:4d} pieces, {m:4d} moved" +
                     (f", largest {top[0]:.3f} u ({top[1]})" if top else ""))
    lines.append("\n  every moved touched piece (move in u, max distance after resampling)")
    for g in sorted(groups):
        for d, k in sorted(groups[g][2], reverse=True):
            lines.append(f"    {g:34s} {d:8.3f}  {k}")
    lines.append(f"\nsummary: data that differ {moved_data}; untouched pieces {'PASS' if ok else 'FAIL'}")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines[:60]))


if __name__ == "__main__":
    main()
