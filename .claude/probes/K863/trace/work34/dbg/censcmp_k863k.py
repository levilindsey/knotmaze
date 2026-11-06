r"""K863 J3k task 6: each candidate's census rows against v6.8's, matched by the id without its word number (K1212).
Every field but the label and the id is compared (NaN-aware, lists recursively). A row is IN the candidate's spot when it
is a tail of q and the candidate refits q's prm ('q' in its spots), or a tail the candidate adds (src not 'tail'); every
other row is outside it: its differing fields are listed, and a row whose only differences are the word's p95
curvature (kmax_p95, spikes, and badness through spikes: census_k863k.word_p95 takes every stroke of the word, so a
cut or a new dot moves it) is counted apart from a real difference (the check: 0 real differences). Spot rows are
printed beside v6.8's: seams (gap, angle, dk), font distance, hooks, rough, peak dk/ds ratio, length, badness.
A spec may be name=json or name=json@q (q's tail is in its spot).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\censcmp_k863k.py <out.txt> <v6.8 census json> <spec> [<spec> ...]"""
import json
import math
import re
import sys

P95 = {"kmax_p95", "spikes", "badness"}
SKIP = {"label", "id"}


def key(r):
    return re.sub(r"^w\d+:", "", r["id"])


def eq(a, b):
    if isinstance(a, float) and isinstance(b, float):
        return (math.isnan(a) and math.isnan(b)) or a == b
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(eq(a[k], b[k]) for k in a)
    return a == b


def seams_s(r):
    return "; ".join(f"{s['seam']}: gap {s['gap_u']:.2e} u, angle {s['ang_deg']:.3g} deg, dk {s['dk_u']:.3g} /u"
                     for s in r["seams"])


def row_s(r):
    return (f"{seams_s(r)} | font dist max {r['dist_max_u']:.2f} u mean {r['dist_mean_u']:.2f} u | hooks {len(r['hooks'])} "
            f"| rough {r['rough']} (facet {r['facet']:.3f}, wobble {r['wobble']:.3f}) | peak ratio {r['peak_ratio']:.2f} | "
            f"len {r['len_u']:.2f} u | badness {r['badness']:.1f}")


def main():
    out, base = sys.argv[1], sys.argv[2]
    R0 = {key(r): r for r in json.load(open(base))["rows"]}
    lines = [f"K863 J3k: census rows against v6.8's ({base}), by id without the word number"]
    for spec in sys.argv[3:]:
        name, path = spec.split("=", 1)
        spots = set()
        if "@" in path:
            path, sp = path.split("@", 1)
            spots = set(sp.split("+"))
        rows = json.load(open(path))["rows"]
        missing, same, p95, real, spot = [], 0, [], [], []
        for r in rows:
            k = key(r)
            r0 = R0.get(k)
            is_spot = r["type"] == "tail" and (("q" in spots and r["pair"] == "q$") or r.get("src") != "tail")
            if r0 is None:
                (spot if is_spot else missing).append((k, r, None))
                continue
            diff = sorted(f for f in set(r) | set(r0) if f not in SKIP and not eq(r.get(f), r0.get(f)))
            if is_spot:
                spot.append((k, r, r0))
            elif not diff:
                same += 1
            elif set(diff) <= P95:
                p95.append((k, diff, r, r0))
            else:
                real.append((k, diff))
        words = sorted({r["word"] for r in rows})
        lines.append("")
        lines.append(f"{name} ({path}): {len(rows)} rows in {len(words)} words; outside the spot: {same} equal, "
                     f"{len(p95)} differ in the word's p95 only, {len(real)} differ otherwise, {len(missing)} not in "
                     f"v6.8's census; in the spot: {len(spot)}")
        for k, d in real:
            lines.append(f"  REAL {k}: {', '.join(d)}")
        for k, r, _ in missing:
            lines.append(f"  MISSING {k}")
        if p95:
            ks = [abs(r["kmax_p95"] - r0["kmax_p95"]) / max(abs(r0["kmax_p95"]), 1e-12) for _, _, r, r0 in p95]
            sp = sum(r["spikes"] != r0["spikes"] for _, _, r, r0 in p95)
            lines.append(f"  p95 only: kmax_p95 moves by up to {100 * max(ks):.1f}% (median {100 * sorted(ks)[len(ks) // 2]:.1f}%);"
                         f" spikes change in {sp} rows")
            for k, d, r, r0 in p95:
                if r["spikes"] != r0["spikes"]:
                    lines.append(f"    {k}: spikes {r0['spikes']} -> {r['spikes']}, kmax_p95 {r0['kmax_p95']:.1f} -> "
                                 f"{r['kmax_p95']:.1f}, badness {r0['badness']:.1f} -> {r['badness']:.1f}")
        for k, r, r0 in spot:
            lines.append(f"  SPOT {k}")
            if r0 is not None:
                lines.append(f"    v6.8: {row_s(r0)}")
            lines.append(f"    {name}: {row_s(r)}")
    txt = "\n".join(lines) + "\n"
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(txt)
    print(txt)


if __name__ == "__main__":
    main()
