r"""K863 J3n (a copy of work37/dbg/climb_k863m.py, J3m's, untouched; builds v6.8 | J3M | J3N, gen_k863n): v6.9's three flaws, measured on the joins out of b, v and w into a..z, for v6.8, J3L and the candidate.
For each pair, per build: the top (the highest point of the exit stroke's last two cubics), the drop below it before the
join climbs (u), the lowest point (u), the climb's bow (the largest distance of the path from its chord, from the lowest
point to the join's end, over the chord's length: 0 is a straight climb), the join's largest curvature (1/u; a spike or
a bump shows here) and where the join ends against J3L's (fu: v6.9's straight climbs met an ascender's stem partway up,
not at the loop's top).
Run from the trace dir, with $env:K926_FINAL_E = "shear" and no $env:K1009_PINS (as checks_k863n.ps1 sets them):
  venv\Scripts\python.exe -I work38\dbg\climb_k863n.py <out.txt> [<letters>=bvw]"""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work34", "dbg"))
sys.path.insert(2, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
import gen_k863n as G  # noqa: E402
from k863lib import Font  # noqa: E402

U = 0.24
BUILDS = [("v6.8", r"work34\base"), ("J3M", r"work37\cand\J3M"), ("J3N", r"work38\cand\J3N")]
LOW = "ehkrs"


def bez(c, n=60):
    c = np.asarray(c, float)
    t = np.linspace(0.0, 1.0, n)[:, None]
    return ((1 - t) ** 3) * c[0] + 3 * ((1 - t) ** 2) * t * c[1] + 3 * (1 - t) * (t ** 2) * c[2] + (t ** 3) * c[3]


def kmax(g):
    # from the join's own samples, so a preset (not a quintic) is measured the same way as a fitted join
    d1 = np.gradient(g, axis=0)
    d2 = np.gradient(d1, axis=0)
    v = np.linalg.norm(d1, axis=1)
    k = (d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.maximum(v, 1e-9) ** 3
    return float(np.abs(k[3:-3]).max()) / U


def measure(A):
    j = next(j for j in A["joins"] if j["iL"] == 0)
    st = np.asarray(A["letters"][0]["strokes"][-1], float)
    body = np.vstack([bez(c) for c in st[-2:]])
    g = np.asarray(j["gen"], float)
    top = int(np.argmax(body[:, 1]))
    seq = np.vstack([body[top:], g])
    imin = int(np.argmin(seq[:, 1]))
    clim = seq[imin:]
    ch = clim[-1] - clim[0]
    L_ = float(np.linalg.norm(ch))
    if L_ > 1e-6 and len(clim) > 2:
        nrm = np.array([-ch[1], ch[0]]) / L_
        bow = float(np.abs((clim - clim[0]) @ nrm).max()) / L_
    else:
        bow = 0.0
    return dict(top=body[top, 1] * U, drop=(body[top, 1] - seq[imin, 1]) * U, miny=seq[imin, 1] * U, bow=bow,
                kmax=kmax(g), end=g[-1] - A["letters"][1]["x"] * np.array([1.0, 0.0]), src=str(j.get("src")))


def main():
    out = sys.argv[1]
    lets = sys.argv[2] if len(sys.argv) > 2 else "bvw"
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    ports = G.load_ports(os.path.join(T, r"work28\ports_k990e.json"), "M")
    data = {}
    for nm, d in BUILDS:
        B = json.load(open(os.path.join(T, d, "bodies.json")))
        P = json.load(open(os.path.join(T, d, "join_params.json")))
        for X in lets:
            for Y in "abcdefghijklmnopqrstuvwxyz":
                data[(nm, X + Y)] = measure(G.assemble(font, B, P, X + Y, with_ref=False, ports=ports))
    rows = ["K863 J3m: the joins out of " + lets + " into a..z, per build v6.8 | J3M | J3N: drop below the top (u), "
            "lowest point (u), the climb's bow (0 = straight), the join's largest curvature (1/u); end = J3N's join end "
            "against J3M's (fu)", ""]
    for X in lets:
        for Y in "abcdefghijklmnopqrstuvwxyz":
            w = X + Y
            cls = "low" if Y in LOW else "high"
            c = [data[(nm, w)] for nm, _ in BUILDS]
            e = float(np.linalg.norm(c[2]["end"] - c[1]["end"]))
            rows.append(f"{w} {cls:4s} | " + " | ".join(f"drop {m['drop']:5.1f} min {m['miny']:5.1f} bow {m['bow']:.3f} "
                                                        f"k {m['kmax']:.3f}" for m in c) + f" | end {e:.2f}")
    rows.append("")
    groups = [("into b f l (ascenders, high)", "bfl"), ("into h k (ascenders, low)", "hk"), ("into r", "r"),
              ("into e", "e"), ("into s", "s"), ("high, all", "abcdfgijlmnopqtuvwxyz"), ("low, all", LOW)]
    for gname, ys in groups:
        parts = []
        for nm, _ in BUILDS:
            ms = [data[(nm, X + Y)] for X in lets for Y in ys]
            parts.append(f"{nm}: drop {np.mean([m['drop'] for m in ms]):.1f} [{min(m['drop'] for m in ms):.1f}, "
                         f"{max(m['drop'] for m in ms):.1f}], min y {np.mean([m['miny'] for m in ms]):.1f}, bow "
                         f"{np.mean([m['bow'] for m in ms]):.3f} [{min(m['bow'] for m in ms):.3f}, "
                         f"{max(m['bow'] for m in ms):.3f}], kmax {max(m['kmax'] for m in ms):.3f}")
        ends = [float(np.linalg.norm(data[('J3N', X + Y)]['end'] - data[('J3M', X + Y)]['end'])) for X in lets for Y in ys]
        rows.append(f"{gname}: " + "; ".join(parts) + f"; J3N end vs J3M max {max(ends):.2f} fu")
    txt = "\n".join(rows) + "\n"
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(txt)
    print("\n".join(rows[-len(groups):]))


if __name__ == "__main__":
    main()
