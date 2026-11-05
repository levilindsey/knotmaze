r"""K1198 (Muse batch 20 Run G) COPY of work32/dbg/pairs_k1112cusp.py (untouched in
.claude/probes/K863/trace/): argv-driven, no retarget needed; Run G points it at the trace's read-only
census_v71/census_v72/census_v72b JSONs beside this folder's census_Plc1m.json.
K1112 (J3i, v7.2): the census JSONs (census_k1027.py run) read for the cusp-entry rule. For each census: the counts
(pieces with a hook, comb spike, rough FAIL, undesigned seam not G2, over the budget; sum_k1113's definitions,
copied below: that tool runs on import) and the undesigned seams by piece. Then every rule pair (a low exit a c d e f h i n into a cusp window
i j p r s t u w y) in its two-letter word, census by census: where the attach sits, the font distance (dist_max_u, the
over-budget measure) and the flags; then every piece whose flags differ between the first census and each later one
(new flags are what "must not rise" means), and every piece whose attach or distance moved.
Run from the trace dir: venv\Scripts\python.exe -I work32\dbg\pairs_k1112cusp.py <out.txt> name=census.json ..."""
import json
import sys


class SU:
    """work29/dbg/sum_k1113.py's definitions, copied unchanged."""

    @staticmethod
    def g2(s):
        return s.get("gap_u", 0) < 0.01 and s.get("angle_deg", 0) < 0.05 and s.get("dk_u", 0) < 0.0005

    @staticmethod
    def seams_bad(r):
        return sum(1 for s in r.get("seams", []) if not s.get("designed") and not SU.g2(s))

    @staticmethod
    def hooks(r):
        h = r.get("hooks") or []
        return len(h) if isinstance(h, list) else int(h)

    @staticmethod
    def flags(r):
        f = []
        if SU.hooks(r):
            h = r["hooks"]
            f.append("hook " + (",".join("%.0f" % (x[0] if isinstance(x, (list, tuple)) else x)
                                          for x in h) if isinstance(h, list) else str(h)))
        if r.get("spikes", 0):
            f.append("spk %d" % r["spikes"])
        if r.get("rough") == "FAIL":
            f.append("rough")
        if SU.seams_bad(r):
            f.append("seam")
        return f

    @staticmethod
    def counts(rows):
        return dict(pieces=len(rows), hooks=sum(SU.hooks(r) > 0 for r in rows),
                    spikes=sum(r.get("spikes", 0) > 0 for r in rows),
                    rough=sum(r.get("rough") == "FAIL" for r in rows), seams=sum(SU.seams_bad(r) > 0 for r in rows),
                    over=sum((r.get("dist_max_u") or 0) > r.get("budget", 2.5) for r in rows))

RULE = [a + b for a in "acdefhin" for b in "ijprstuwy"]


def main():
    out = sys.argv[1]
    C = []
    for a in sys.argv[2:]:
        n, p = a.split("=", 1)
        rows = json.load(open(p, encoding="utf-8"))["rows"]
        C.append((n, {r["id"]: r for r in rows}))
    L = []
    for n, R in C:
        c = SU.counts(list(R.values()))
        L.append(f"{n}: " + ", ".join(f"{k} {v}" for k, v in c.items()))
        bad = [r for r in R.values() if SU.seams_bad(r)]
        L.append(f"  undesigned seams ({len(bad)}): " + ", ".join(f"{r['pair']}({r['word']})" for r in bad))
    L.append("\nthe rule's pairs in their two-letter words: attach | font distance dmax u | flags, census by census")
    L.append(f"{'pair':5s} " + " ".join(f"{n:>44s}" for n, _ in C))
    for p in RULE:
        cells = []
        for n, R in C:
            r = [x for x in R.values() if x["word"] == p and x["type"] == "join" and x["pair"] == p]
            if not r:
                cells.append(f"{'(no row)':>44s}")
                continue
            r = r[0]
            w = r.get("which", "").replace("port at ", "").replace(", retrace", " rt")
            f = ",".join(SU.flags(r)) or "-"
            cells.append(f"{w[:14]:>14s} {r.get('dist_max_u', 0):7.2f} {r.get('kind', '')[:10]:>10s} {f[:10]:>10s}")
        L.append(f"{p:5s} " + " ".join(cells))
    n0, R0 = C[0]
    for n, R in C[1:]:
        L.append(f"\nflags that differ, {n0} -> {n} (pieces in both)")
        k = 0
        for i in R0:
            if i not in R:
                continue
            a, b = SU.flags(R0[i]), SU.flags(R[i])
            if a != b:
                k += 1
                L.append(f"  {i:44s} {','.join(a) or '-':24s} -> {','.join(b) or '-'}")
        L.append(f"  {k} pieces; only in {n0}: {len(set(R0) - set(R))}, only in {n}: {len(set(R) - set(R0))}")
        L.append(f"pieces whose attach or font distance moved, {n0} -> {n} (dmax change > 0.005 u or a new attach)")
        k = 0
        for i in R0:
            if i not in R:
                continue
            a, b = R0[i], R[i]
            if a.get("which") != b.get("which") or abs(a.get("dist_max_u", 0) - b.get("dist_max_u", 0)) > 0.005:
                k += 1
                L.append(f"  {i:44s} {a.get('which', '')[:24]:24s} {a.get('dist_max_u', 0):7.2f} -> "
                         f"{b.get('which', '')[:24]:24s} {b.get('dist_max_u', 0):7.2f}")
        L.append(f"  {k} pieces")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L[:2 * len(C)]))


main()
