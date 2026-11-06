r"""K1112 Run P locality, after work31/dbg/locality_k1112c.py (J3h's): v6.8 (work34/base, ports
work28/ports_k990e.json variant M) against a candidate (the same bodies, work35/ports_k1112p.json, the
named variant). Touched: the strokes of m and u, every join out of m and u, their tails, and the right
letter's stroke 0 after m or u (its entry cut). Every other piece must be byte-identical (the raw
coefficient arrays equal); every moved touched piece is listed with its move (max distance after
resampling, u).
Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\locality_k1112p.py <out.txt> <variant> [<words,comma | words file>]"""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

S = 0.24
LETTERS = set("mu")


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


def pieces(font, B, P, ports, words):
    out = {}
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=ports)
        chars = [lt["ch"] for lt in A["letters"]]
        for k, lt in enumerate(A["letters"]):
            prv = chars[k - 1] if k > 0 else None
            for si, st in enumerate(lt["strokes"]):
                if chars[k] in LETTERS:
                    tch, grp = True, "stroke of " + chars[k]
                elif prv in LETTERS and si == 0:
                    tch, grp = True, "stroke 0 after " + prv
                else:
                    tch, grp = False, "letter " + chars[k]
                out[f"{w}|letter {k} {lt['ch']} s{si}"] = (tch, bez_pts(st), raw(st), grp)
        for k, j in enumerate(A["joins"]):
            tch = j["L"] in LETTERS
            out[f"{w}|join {j['L']}{j['R']} #{k}" + ("" if tch else " solved" if "port" in j else " preset")] = (
                tch, bez_pts(FN.conn_beziers(j["coeffs"])), raw(j["coeffs"]),
                ("join out of " + j["L"]) if tch else "join " + j["L"] + j["R"])
        for nm in ("leads", "tails"):
            for k, j in enumerate(A[nm]):
                ch = j.get("ch")
                out[f"{w}|{nm[:-1]} {ch} #{k}"] = (nm == "tails" and ch in LETTERS,
                                                   bez_pts(FN.conn_beziers(j["coeffs"])), raw(j["coeffs"]),
                                                   f"{nm[:-1]} {ch}")
    return out


def main():
    out, var = sys.argv[1], sys.argv[2]
    words = []
    if len(sys.argv) > 3:
        words = ([w.strip() for w in open(sys.argv[3], encoding="utf-8").read().replace("\n", ",").split(",") if w.strip()]
                 if sys.argv[3].endswith(".txt")
                 else [w for w in sys.argv[3].split(",") if w])
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    B = json.load(open(os.path.join(T, "work34", "base", "bodies.json")))
    P = json.load(open(os.path.join(T, "work34", "base", "join_params.json")))
    p_ref = G.load_ports(os.path.join(T, "work28", "ports_k990e.json"), "M")
    p_new = G.load_ports(os.path.join(T, "work35", "ports_k1112p.json"), var)
    lines = [f"K1112 Run P locality: v6.8 (work34/base, M) against {var} (same bodies, work35 ports)"]
    U = pieces(font, B, P, p_ref, words)
    E = pieces(font, B, P, p_new, words)
    miss = sorted(set(U) ^ set(E))
    un_same = un_diff = 0
    bad, groups = [], {}
    for k in U:
        if k not in E:
            continue
        same = U[k][2] == E[k][2]
        if U[k][0] or E[k][0]:
            g = groups.setdefault(U[k][3], [0, 0, []])
            g[0] += 1
            if not same:
                g[1] += 1
                g[2].append((dist(U[k][1], E[k][1]), k))
        else:
            un_same += same
            un_diff += not same
            if not same:
                bad.append((dist(U[k][1], E[k][1]), k))
    ok = un_diff == 0 and not miss
    lines.append(f"\n(1) the pieces, {len(words)} words, {len(U)} pieces")
    lines.append(f"  untouched (not m/u, a join out of m/u, its tails or the stroke 0 after m/u): "
                 f"{un_same + un_diff} pieces, {un_diff} not byte-identical {'PASS' if ok else 'FAIL'}"
                 + (f"; pieces only in one build: {miss}" if miss else ""))
    for d, k in sorted(bad, reverse=True):
        lines.append(f"      untouched piece changed: {k} {d:.3e} u")
    lines.append("  touching m/u, by kind: pieces, moved, the largest move")
    for g in sorted(groups):
        n, m, lst = groups[g]
        top = max(lst) if lst else None
        lines.append(f"    {g:34s} {n:4d} pieces, {m:4d} moved" + (f", largest {top[0]:.3f} u ({top[1]})" if top else ""))
    lines.append("\n  every moved piece touching m/u (move in u, max distance after resampling)")
    for g in sorted(groups):
        for d, k in sorted(groups[g][2], reverse=True):
            lines.append(f"    {g:34s} {d:8.3f}  {k}")
    lines.append(f"\nsummary: untouched pieces {'PASS' if ok else 'FAIL'}")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines[:40]))


main()
