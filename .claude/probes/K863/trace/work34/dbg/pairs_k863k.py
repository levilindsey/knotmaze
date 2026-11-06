# K863 J3k: copy of work33/dbg/pairs_k863j.py (J3j's, untouched) by work34/dbg/mk_tools_k863k.py (K1212): SU.g2 reads
# the census's ang_deg; each census keyed by the piece's id without its word number (a repeat stops the run);
# angle_only(), the seams g2 now fails on the angle alone, run after seam_detail(). J3j's header:
# K863 J3j: copy of work32/dbg/pairs_k1112cusp.py (J3i's, untouched) by work33/dbg/mk_tools_k863j.py, plus
# seam_detail() (every undesigned seam: piece, where, gap / angle / dk), run after main().
r"""K1112 (J3i, v7.2): the census JSONs (census_k1027.py run) read for the cusp-entry rule. For each census: the counts
(pieces with a hook, comb spike, rough FAIL, undesigned seam not G2, over the budget; sum_k1113's definitions,
copied below: that tool runs on import) and the undesigned seams by piece. Then every rule pair (a low exit a c d e f h i n into a cusp window
i j p r s t u w y) in its two-letter word, census by census: where the attach sits, the font distance (dist_max_u, the
over-budget measure) and the flags; then every piece whose flags differ between the first census and each later one
(new flags are what "must not rise" means), and every piece whose attach or distance moved.
Run from the trace dir: venv\Scripts\python.exe -I work32\dbg\pairs_k1112cusp.py <out.txt> name=census.json ..."""
import json
import re
import sys


class SU:
    """work29/dbg/sum_k1113.py's definitions, copied; K863 J3k (K1212): g2 reads the census's ang_deg (sum_k1113
    and J3j read angle_deg, which the census never writes, so a seam's angle never counted)."""

    @staticmethod
    def g2(s):
        return s.get("gap_u", 0) < 0.01 and s.get("ang_deg", 0) < 0.05 and s.get("dk_u", 0) < 0.0005

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
        # K863 J3k (K1212): keyed by the id without its word number (w<n>:), so the word lists' order does not
        # matter; a word list holds each id once, and a repeated id stops the run
        R = {}
        for r in rows:
            k = re.sub(r"^w\d+:", "", r["id"])
            assert k not in R, f"{p}: the id {k} twice (K1212: a word list holds each id once)"
            R[k] = r
        C.append((n, R))
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


def seam_detail():
    """K863 J3j: every undesigned seam of each census (not designed, not G2 by SU.g2), one line each: the piece, where
    (the seam's text), gap u, angle deg (the census's ang_deg, which SU.g2 reads since K863 J3k; J3j's
    SU.g2 read angle_deg, never written, so the angle never counted there) and dk 1/u; entries into i j p r s t u w y (the cusp corners) apart from the rest.
    Appended to the output file."""
    out = sys.argv[1]
    L = ["", "K863 J3k (g2 reads the angle): every undesigned seam, per census (piece, where: gap u / angle deg / dk 1/u), largest dk first"]
    for a in sys.argv[2:]:
        name, path = a.split("=", 1)
        rows = json.load(open(path))["rows"]
        cusp, rest = [], []
        for r in rows:
            for s in r.get("seams", []):
                if s.get("designed") or SU.g2(s):
                    continue
                txt = s.get("seam", "")
                (cusp if txt.startswith("entry ") and txt[6:7] in "ijprstuwy" else rest).append((s.get("dk_u", 0), r, s))
        L.append(f"  {name}: {len(cusp) + len(rest)} undesigned seams, {len(cusp)} at an entry into i j p r s t u w y")
        for hd, lst in (("cusp corners", cusp), ("the rest", rest)):
            L.append(f"    {hd} ({len(lst)}):")
            for dk, r, s in sorted(lst, key=lambda x: -x[0]):
                L.append(f"      {r['pair']:4s} {r['id']:36s} {s['seam']}: gap {s.get('gap_u', 0):.3g} u, "
                         f"angle {s.get('ang_deg', 0):.3g} deg, dk {dk:.3g} /u")
    with open(out, "a", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L))


def angle_only():
    """K863 J3k (K1212): the seams g2 fails on the angle alone, per census: not designed, gap < 0.01 u and dk < 5e-4 /u
    (G2 by J3j's angle-blind SU.g2) but angle >= 0.05 deg. One line each: the pair, the piece (id), where (the seam's
    text), angle deg, gap u, dk /u, largest angle first; then the count by pair and by where. Appended to the output
    file."""
    out = sys.argv[1]
    L = ["", "K863 J3k (K1212): the seams g2 fails on the angle alone (not designed; gap < 0.01 u and dk < 5e-4 /u; "
         "angle >= 0.05 deg), per census, largest angle first"]
    for a in sys.argv[2:]:
        name, path = a.split("=", 1)
        rows = json.load(open(path, encoding="utf-8"))["rows"]
        hits, also = [], 0
        for r in rows:
            for s in r.get("seams", []):
                if s.get("designed") or s.get("ang_deg", 0) < 0.05:
                    continue
                if s.get("gap_u", 0) < 0.01 and s.get("dk_u", 0) < 0.0005:
                    hits.append((s.get("ang_deg", 0), r, s))
                else:
                    also += 1
        L.append(f"  {name}: {len(hits)} seams on {len({r['id'] for _, r, _ in hits})} pieces fail on the angle alone "
                 f"({also} more undesigned seams have angle >= 0.05 deg and fail on gap or dk too)")
        for ang, r, s in sorted(hits, key=lambda x: -x[0]):
            L.append(f"      {r['pair']:4s} {r['id']:36s} {s['seam']}: angle {ang:.3g} deg, gap {s.get('gap_u', 0):.3g} u, "
                     f"dk {s.get('dk_u', 0):.3g} /u")
        byp, byw = {}, {}
        for ang, r, s in hits:
            byp.setdefault(r["pair"], []).append(ang)
            byw.setdefault(r["type"] + " " + s["seam"].split(" ")[0], []).append(ang)
        L.append("    by pair: " + ", ".join(f"{p} {len(v)} (max {max(v):.3g})"
                                            for p, v in sorted(byp.items(), key=lambda x: -max(x[1]))))
        L.append("    by piece type and seam end: " + ", ".join(f"{p} {len(v)}" for p, v in sorted(byw.items())))
    with open(out, "a", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print("\n".join(L))


main()
seam_detail()
angle_only()
