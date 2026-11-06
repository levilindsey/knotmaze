r"""K1112 Run P task 3: the gate's distance. For every word that holds a pair out of the named letters, and
every such join in it, the symmetric Hausdorff distance (u) between the candidate's drawn join centreline
and v6.8's, the mean distance (both directions' samples pooled), and where the largest sits (the piece
and its arc length along the centreline that attains it, in u from that join's start).
A build is named <label>=<dir>|<ports file>|<variant>|<letters>; the first build is the reference
(v6.8, variant M). The centreline is the join's quintic sampled through fewnode_k930.conn_beziers, in u
(font units x 0.24). Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\dist_k1112p.py <out.txt> <out.json> <words,comma> <build> [<build> ...]"""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

S = 0.24


def bez_pts(bzs):
    out = []
    for b in bzs:
        b = np.asarray(b, float)
        ln = float(np.linalg.norm(np.diff(b, axis=0), axis=1).sum())
        n = max(24, int(ln / 1.2) + 2)
        t = np.linspace(0.0, 1.0, n)[:, None]
        out.append(((1 - t) ** 3) * b[0] + 3 * ((1 - t) ** 2) * t * b[1] + 3 * (1 - t) * t * t * b[2] + t ** 3 * b[3])
    return np.vstack(out) * S


def arc(P):
    return np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]


def joins_of(font, spec, words):
    label, d, pp, var, letters = spec
    B = json.load(open(os.path.join(T, d, "bodies.json")))
    P = json.load(open(os.path.join(T, d, "join_params.json")))
    ports = G.load_ports(os.path.join(T, pp), var)
    out = {}
    for w in words:
        A = G.assemble(font, B, P, w, with_ref=False, B_ref=B, ports=ports)
        for k, j in enumerate(A["joins"]):
            if j["L"] in letters:
                pts = bez_pts(FN.conn_beziers(j["coeffs"]))
                out[(w, k, j["L"] + j["R"])] = pts
    return out


def main():
    out_txt, out_json, words = sys.argv[1], sys.argv[2], [w for w in sys.argv[3].split(",") if w]
    specs = []
    for a in sys.argv[4:]:
        label, spec = a.split("=", 1)
        d, pp, var, letters = spec.split("|")
        specs.append((label, d, pp, var, set(letters)))
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    ref_label, ref = specs[0][0], None
    res, lines = {}, []
    per = {}
    for si, spec in enumerate(specs):
        got = joins_of(font, spec, words)
        if si == 0:
            ref = got
            lines.append(f"reference {spec[0]}: {len(ref)} joins out of {''.join(sorted(spec[4]))} in {len(words)} words")
            continue
        rows = []
        for key in sorted(set(ref) | set(got)):
            if key not in ref or key not in got:
                rows.append(dict(word=key[0], join_index=key[1], pair=key[2], missing=True))
                continue
            A, B = got[key], ref[key]
            dA, _ = cKDTree(B).query(A)
            dB, _ = cKDTree(A).query(B)
            haus_a, haus_b = float(dA.max()), float(dB.max())
            if haus_a >= haus_b:
                i = int(np.argmax(dA))
                haus, side, at, piece = haus_a, spec[0] + "->" + ref_label, float(arc(A)[i]), spec[0]
            else:
                i = int(np.argmax(dB))
                haus, side, at, piece = haus_b, ref_label + "->" + spec[0], float(arc(B)[i]), ref_label
            rows.append(dict(word=key[0], join_index=key[1], pair=key[2], hausdorff_u=haus,
                             mean_u=float(np.concatenate([dA, dB]).mean()), at_u=at, side=side, piece=piece,
                             len_u=float(arc(A)[-1])))
        res[spec[0]] = rows
        ok = [r for r in rows if not r.get("missing")]
        by_pair = {}
        for r in ok:
            by_pair.setdefault(r["pair"], []).append(r)
        lines.append(f"\n{spec[0]} against {ref_label}: {len(ok)} joins, {sum(1 for r in rows if r.get('missing'))} missing")
        for p in sorted(by_pair):
            rs = by_pair[p]
            top = max(rs, key=lambda r: r["hausdorff_u"])
            per.setdefault(spec[0], {})[p] = top
            lines.append(f"  {p}: largest {top['hausdorff_u']:.4f} u in '{top['word']}' join #{top['join_index']} "
                         f"at arc {top['at_u']:.2f} u ({top['side']}, piece {top['piece']}), mean {top['mean_u']:.4f} u; "
                         f"mean of largests {float(np.mean([r['hausdorff_u'] for r in rs])):.4f} u over {len(rs)} words")
    open(out_txt, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    json.dump(res, open(out_json, "w"), indent=1)
    print("\n".join(lines))


main()
