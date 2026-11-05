r"""K1198 (Muse batch 20 Run G) COPY of work29/dbg/sum_k1113.py (untouched in
.claude/probes/K863/trace/): argv-driven, no retarget needed; called by this folder's checks copy.
K1113 (J3f, v6.9): census JSONs (census_k1027.py run ... json) summarised for the b/v/w exit variants: the counts of
pieces with hooks, comb spikes, rough FAIL, seams not G2 (undesigned) and over the budget, overall and on the joins out
of the given letters; per letter, the font distance (dmax) of its joins in the two-letter words, mean and max; and the
joins out of the letters that carry a hook, spike, rough FAIL or undesigned seam. Run from the trace dir:
venv\Scripts\python.exe -I work29\dbg\sum_k1113.py <out.txt> <letters> <a.json> [<b.json> ...]"""
import json
import sys


def g2(s):
    return s.get("gap_u", 0) < 0.01 and s.get("angle_deg", 0) < 0.05 and s.get("dk_u", 0) < 0.0005


def seams_bad(r):
    return sum(1 for s in r.get("seams", []) if not s.get("designed") and not g2(s))


def hooks(r):
    h = r.get("hooks") or []
    return len(h) if isinstance(h, list) else int(h)


def flags(r):
    f = []
    if hooks(r):
        h = r["hooks"]
        f.append("hook " + (",".join("%.0f" % (x[0] if isinstance(x, (list, tuple)) else x)
                                      for x in h) if isinstance(h, list) else str(h)))
    if r.get("spikes", 0):
        f.append("spk %d" % r["spikes"])
    if r.get("rough") == "FAIL":
        f.append("rough")
    if seams_bad(r):
        f.append("seam")
    return f


def counts(rows):
    return dict(pieces=len(rows), hooks=sum(hooks(r) > 0 for r in rows), spikes=sum(r.get("spikes", 0) > 0 for r in rows),
                rough=sum(r.get("rough") == "FAIL" for r in rows), seams=sum(seams_bad(r) > 0 for r in rows),
                over=sum((r.get("dist_max_u") or 0) > r.get("budget", 2.5) for r in rows))


def main():
    out_path, letters, paths = sys.argv[1], sys.argv[2], sys.argv[3:]
    out = []
    for p in paths:
        C = json.load(open(p))
        rows = C["rows"]
        mine = [r for r in rows if r.get("type") == "join" and (r.get("pair") or "  ")[0] in letters]
        ca, cm = counts(rows), counts(mine)
        out.append("%s (%s)" % (C["label"], p))
        out.append("  all:   " + ", ".join("%s %d" % kv for kv in ca.items()))
        out.append("  %s joins: " % letters + ", ".join("%s %d" % kv for kv in cm.items()))
        for L in letters:
            two = [r for r in mine if r["pair"][0] == L and r["word"] == r["pair"]]
            d = [r.get("dist_max_u") or 0 for r in two]
            dm = [r.get("dist_mean_u") or 0 for r in two]
            src = {}
            for r in two:
                src[r.get("src")] = src.get(r.get("src"), 0) + 1
            if d:
                out.append("  %s: %d joins (%s), dmax mean %.2f max %.2f (%s), dmean mean %.2f" % (
                    L, len(d), ", ".join("%s %d" % kv for kv in sorted(src.items(), key=lambda kv: str(kv[0]))),
                    sum(d) / len(d), max(d), two[d.index(max(d))]["pair"], sum(dm) / len(dm)))
                out.append("     joins out of %s in every word: " % L + ", ".join(
                    "%s %d" % kv for kv in counts([r for r in mine if r["pair"][0] == L]).items()))
        bad = ["%s(%s) %s" % (r["pair"], r["word"][:12], "/".join(flags(r))) for r in mine if flags(r)]
        out.append("  flagged %s joins (%d): %s" % (letters, len(bad), "; ".join(bad)))
    txt = "\n".join(out)
    print(txt)
    open(out_path, "w", encoding="utf-8").write(txt + "\n")


main()