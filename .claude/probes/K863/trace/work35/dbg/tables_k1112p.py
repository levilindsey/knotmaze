r"""K1112 Run P: the tables behind SUMMARY.md, from the census JSONs and the gate's distance JSON.
Per candidate: the census counts (pieces with hooks, comb spikes, rough FAIL, undesigned seams -- g2
reading the census's ang_deg, K1212 -- and over budget) over all pieces and over the joins out of m and
u, against v6.8's; and per pair out of m and u (the two-letter word's join): v6.8's and the candidate's
font distance (dist_max_u, dist_mean_u), the census flags, and the gate's largest Hausdorff distance
and where it sits. Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\tables_k1112p.py <out.txt> <out.json> <dist.json> <label>=<census.json> ...
The first census is v6.8's."""
import json
import sys


def g2(s):
    return s.get("gap_u", 0) < 0.01 and s.get("ang_deg", 0) < 0.05 and s.get("dk_u", 0) < 0.0005


def seams_bad(r):
    return sum(1 for s in r.get("seams", []) if not s.get("designed") and not g2(s))


def hooks(r):
    h = r.get("hooks") or []
    return len(h) if isinstance(h, list) else int(h)


def flags(r):
    f = []
    if hooks(r):
        f.append("hooks %d" % hooks(r))
    if r.get("spikes", 0):
        f.append("spk %d" % r["spikes"])
    if r.get("rough") == "FAIL":
        f.append("rough FAIL")
    if seams_bad(r):
        f.append("seam x%d" % seams_bad(r))
    return ", ".join(f)


def counts(rows):
    return dict(pieces=len(rows), hooks=sum(hooks(r) > 0 for r in rows),
                spikes=sum(r.get("spikes", 0) > 0 for r in rows),
                rough=sum(r.get("rough") == "FAIL" for r in rows),
                seams=sum(seams_bad(r) > 0 for r in rows),
                over=sum((r.get("dist_max_u") or 0) > r.get("budget", 2.5) for r in rows))


def main():
    out_txt, out_json, dist_path = sys.argv[1], sys.argv[2], sys.argv[3]
    cens = []
    for a in sys.argv[4:]:
        nm, p = a.split("=", 1)
        cens.append((nm, json.load(open(p))))
    dist = json.load(open(dist_path)) if dist_path != "-" else {}
    ref_nm, ref = cens[0]
    lines, data = [], {"reference": ref_nm, "candidates": {}}
    lines.append(f"census counts: {ref_nm} against " + ", ".join(nm for nm, _ in cens[1:]))
    for nm, C in cens:
        rows = C["rows"]
        mine = [r for r in rows if r.get("type") == "join" and (r.get("pair") or " ")[0] in "mu"]
        lines.append(f"  {nm:8s} all: " + ", ".join("%s %d" % kv for kv in counts(rows).items())
                     + " | joins out of m/u: " + ", ".join("%s %d" % kv for kv in counts(mine).items()))
    for nm, C in cens[1:]:
        rows = {r["id"]: r for r in C["rows"]}
        refr = {r["id"]: r for r in ref["rows"]}
        moved = [k for k in sorted(set(rows) & set(refr)) if any(rows[k].get(f) != refr[k].get(f) for f in
                 ("dist_max_u", "dist_mean_u", "spikes", "rough", "hooks", "badness"))]
        lines.append(f"  {nm}: census rows differing from {ref_nm} beyond the label/id: {len(moved)} "
                     f"(of {len(set(rows) & set(refr))} shared ids)")
    for L in "mu":
        lines.append(f"\njoins out of {L}: pair | gate largest (u, where) | gate mean at largest | "
                     f"font dmax {ref_nm} -> candidate | font dmean | flags {ref_nm} -> candidate")
        for cand_nm, C in cens[1:]:
            rows = {r["pair"]: r for r in C["rows"] if r.get("type") == "join" and r.get("word") == r.get("pair")}
            rrows = {r["pair"]: r for r in ref["rows"] if r.get("type") == "join" and r.get("word") == r.get("pair")}
            drows = dist.get(cand_nm, []) if cand_nm in dist else dist.get("dist", {}).get(cand_nm, [])
            by_pair = {}
            for r in drows:
                if not r.get("missing"):
                    by_pair.setdefault(r["pair"], []).append(r)
            data["candidates"].setdefault(cand_nm, {})[L] = {}
            for p in sorted(x for x in rows if x[0] == L):
                rs = by_pair.get(p, [])
                top = max(rs, key=lambda r: r["hausdorff_u"]) if rs else None
                r0, r1 = rrows.get(p), rows.get(p)
                line = (f"  [{cand_nm}] {p}: gate "
                        + (f"{top['hausdorff_u']:.4f} u in '{top['word']}' at arc {top['at_u']:.2f} u, mean {top['mean_u']:.4f}"
                           if top else "n/a")
                        + f" | font dmax {(r0 or {}).get('dist_max_u', float('nan')):.2f} -> {(r1 or {}).get('dist_max_u', float('nan')):.2f}"
                        + f" | dmean {(r0 or {}).get('dist_mean_u', float('nan')):.2f} -> {(r1 or {}).get('dist_mean_u', float('nan')):.2f}"
                        + f" | flags [{flags(r0) if r0 else ''}] -> [{flags(r1) if r1 else ''}]")
                lines.append(line)
                data["candidates"][cand_nm][L][p] = dict(
                    gate_u=top["hausdorff_u"] if top else None, gate_word=top["word"] if top else None,
                    gate_at_u=top["at_u"] if top else None, gate_mean_u=top["mean_u"] if top else None,
                    font_ref=(r0 or {}).get("dist_max_u"), font_cand=(r1 or {}).get("dist_max_u"),
                    font_ref_mean=(r0 or {}).get("dist_mean_u"), font_cand_mean=(r1 or {}).get("dist_mean_u"),
                    flags_ref=flags(r0) if r0 else "", flags_cand=flags(r1) if r1 else "")
    open(out_txt, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    json.dump(data, open(out_json, "w"), indent=1)
    print("\n".join(lines))


main()
