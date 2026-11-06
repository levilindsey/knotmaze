r"""K1112 Run P: writes work35/SUMMARY.md from work35/tables.json, work35/tables.txt's census counts,
work35/dist_gate.json and work35/dist_calib_c.json. Run from the trace dir:
  venv\Scripts\python.exe -I work35\dbg\sum_k1112p.py"""
import json
import os

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W = os.path.join(T, "work35")


def load(p):
    return json.load(open(os.path.join(W, p)))


def top5(rows, letter):
    by = {}
    for r in rows:
        if not r.get("missing") and r["pair"][0] == letter:
            by.setdefault(r["pair"], []).append(r)
    tops = []
    for p, rs in by.items():
        t = max(rs, key=lambda r: r["hausdorff_u"])
        tops.append((t["hausdorff_u"], p, t))
    return sorted(tops, reverse=True)


def main():
    tab = load("tables.json")
    gate = load("dist_gate.json")
    calib = load("dist_calib_c.json")
    counts = {}
    for line in open(os.path.join(W, "tables.txt")):
        line = line.strip()
        if " all: " in line and line.split()[0].rstrip(":") in (
                "v6.8", "Pm10", "Pu10", "Pmu10", "Pm2", "Pu2", "Pmu2_2"):
            counts[line.split()[0].rstrip(":")] = line
    L = []
    L.append("# K1112 Run P (22P): m's and u's exits on one port each, against v6.8's joins")
    L.append("")
    L.append("Started 2026-11-05 16:04 -08:00, cap 18:04. Probes only: `work35/`, `out35/`, one NOTES.md "
             "entry. Nothing in `src/` or `test/`. The bodies are v6.8's (`work34/base`); every candidate "
             "is variant M of `work28/ports_k990e.json` plus an exit record, in `work35/ports_k1112p.json`: "
             "Pm10/Pu10 (m's exit = n's record, u's = i's: a merge at the end node, stretch [0, 10] u), "
             "Pmu10 (both), and the second candidates Pm2/Pu2/Pmu2_2 (stretch [0, 2] u, task 5).")
    L.append("")
    L.append("The gate's measure (task 3): per join out of m or u, the symmetric Hausdorff distance between "
             "the candidate's drawn join centreline and v6.8's (the quintic sampled in u), its mean over "
             "both directions' samples, and where the largest sits. A letter passes when every pair out of "
             "it lies within 1.0 u.")
    L.append("")
    verdict = {}
    for letter, cands in (("m", ("Pm10", "Pm2")), ("u", ("Pu10", "Pu2"))):
        L.append(f"## {letter}")
        L.append("")
        for cand in cands:
            tops = top5(gate[cand], letter)
            vals = [t[0] for t in tops]
            verdict[(letter, cand)] = (min(vals), sum(vals) / len(vals), max(vals))
            L.append(f"### {cand}: gate FAIL (no pair within 1.0 u; smallest {min(vals):.2f} u, "
                     f"mean of per-pair largests {sum(vals) / len(vals):.2f} u, largest {max(vals):.2f} u)")
            L.append("")
            L.append("| pair | largest (u) | where (word, join, arc u) | mean at largest (u) | "
                     "font dmax v6.8 -> cand (u) | font dmean v6.8 -> cand (u) | flags v6.8 -> cand |")
            L.append("|---|---|---|---|---|---|---|")
            for haus, p, t in sorted(tops, key=lambda x: x[1]):
                d = tab["candidates"][cand][letter][p]
                L.append(f"| {p} | {haus:.4f} | '{t['word']}' join #{t['join_index']} at {t['at_u']:.2f} "
                         f"({t['side']}) | {t['mean_u']:.4f} | {d['font_ref']:.2f} -> {d['font_cand']:.2f} | "
                         f"{d['font_ref_mean']:.2f} -> {d['font_cand_mean']:.2f} | "
                         f"{d['flags_ref'] or '-'} -> {d['flags_cand'] or '-'} |")
            L.append("")
        a, b = cands
        closer = a if verdict[(letter, a)][1] <= verdict[(letter, b)][1] else b
        L.append(f"Closer of the two, by the mean of the per-pair largests: {closer} "
                 f"({verdict[(letter, closer)][1]:.2f} u against {verdict[(letter, a if closer == b else b)][1]:.2f} u). "
                 "Neither passes, so the letter keeps its presets (task 5). The full per-word rows are in "
                 "`work35/dist_gate.txt`; the census rows in `work35/tables.txt`.")
        L.append("")
    L.append("## Both exits at once")
    L.append("")
    for cand, first in (("Pmu10", "Pm10"), ("Pmu2_2", "Pm2")):
        letter = "m"
        tops = top5(gate[cand], letter)
        vals = [t[0] for t in tops]
        tops_u = top5(gate[cand], "u")
        vals_u = [t[0] for t in tops_u]
        L.append(f"- {cand}: gate FAIL on both letters (m: smallest {min(vals):.2f}, mean-largest "
                 f"{sum(vals) / len(vals):.2f}, largest {max(vals):.2f} u; u: smallest {min(vals_u):.2f}, "
                 f"mean-largest {sum(vals_u) / len(vals_u):.2f}, largest {max(vals_u):.2f} u). Its joins "
                 "out of m and u are the single-letter candidates' to the last digit in `dist_gate.txt`.")
    L.append("")
    L.append("## The calibration on c (task 3)")
    L.append("")
    ctops = top5(calib["v7.1"], "c")
    cvals = [t[0] for t in ctops]
    L.append(f"J3h's v7.0 (presets) against v7.1 (c's port, Pc10), the same measure, on ca..cz: "
             f"smallest {min(cvals):.2f} u (cy), mean of largests {sum(cvals) / len(cvals):.2f} u, "
             f"largest {max(cvals):.2f} u (ct). No c pair reads within 1.0 u (0 of 26), so the 1.0 u gate "
             "would have turned c's port down too, as Levi did (K1197). Per pair: "
             + ", ".join(f"{p} {h:.2f}" for h, p, t in sorted(ctops, key=lambda x: x[1])) + ".")
    L.append("")
    L.append("## The checks (task 4)")
    L.append("")
    L.append("Census on J3i's 232 words plus ma..mz and ua..uz (284 words, 829 pieces; "
             "`work35/census_*.json`, counts from `work35/tables.txt`):")
    L.append("")
    for nm in ("v6.8", "Pm10", "Pu10", "Pmu10", "Pm2", "Pu2", "Pmu2_2"):
        if nm in counts:
            L.append(f"- {counts[nm]}")
    L.append("")
    L.append("Hooks (105) and spikes (149) do not rise under any candidate. Rough FAIL falls (213 -> 211 "
             "per single letter, -> 209 with both). Undesigned seams rise: 27 -> 31 per single letter "
             "(+4; Pu2 +5), -> 35 with both at [0, 10] and 36 at [0, 2]: the same port-cusp class as c's "
             "four (ci, cr, cs, cy in J3h). Over-budget joins out of m/u rise (7 of 65 -> 33 per letter). "
             "On the joins out of m/u alone (65 pieces): v6.8 hooks 0, spikes 0, rough 4, seams 0; each "
             "single-letter candidate rough 2, seams 4 (Pu2 5); both-exits rough 0, seams 8 (Pmu2_2 9).")
    L.append("")
    L.append("- Locality (`work35/locality_<variant>.txt`): PASS for all six candidates. 1348 untouched "
             "pieces per candidate, 0 not byte-identical; the moved pieces are only m's and u's strokes, "
             "the joins out of them, their tails and the following letter's stroke 0.")
    L.append("- Solves (`work35/solves.txt`): Pm10 and Pmu10 stop at maxfev on me (status 1, nfev 3000 of "
             "3000); Pu10 and Pmu10 on uf; Pu2 and Pmu2_2 on um and us; Pm2 converges on all 26. Every "
             "other solve of the 52 pairs converges in every build.")
    L.append("- The side test (K991, `work35/side.txt`): PASS. 72 cusp entries counted over the builds "
             "(18 distinct pairs per candidate family), none below -0.05 u; the lowest is uw at "
             "0.0002 u.")
    L.append("- Determinism: a second census of Pmu10 (`work35/det/`) is byte-identical to the first, "
             "JSON (SHA256 920BEA917EB36E18...) and text (DBB11131A102924A...) both.")
    L.append("- The guard (`work20/dbg/check_out_k990.py out35`): ALL CLEAN on the three SVGs.")
    L.append("")
    L.append("## Sheets and crops (task 6)")
    L.append("")
    L.append("- `out35/m_v68.svg` (PNG `out35/png/m_v68.png`, dpi 48): font | approved (v6.8) | Pm10 | "
             "Pm2 | Pmu10; m alone, ma..mz and the census words holding a join out of m.")
    L.append("- `out35/u_v68.svg` (PNG `out35/png/u_v68.png`): the same for u (Pu10, Pu2, Pmu10).")
    L.append("- `out35/overlay_v68.svg` (PNG `out35/png/overlay_v68.png`): ma..mz and ua..uz, the font's "
             "fill in light grey with v6.8 in black, Pm10 red, Pu10 blue, Pmu10 purple on the same axes.")
    L.append("- Crops at 3x (dpi 144, `work35/look/crop_*.png`): the five pairs with the largest distance "
             "per per-letter candidate (Pm10: mt, me, ml, mr, mf; Pm2: the same five; Pu10: ut, ue, ul, "
             "uh, ur; Pu2: ut, ue, ul, uh, uf), and two mid-word joins per letter (`crop_mid_m_minimum`, "
             "`crop_mid_m_jumps`, `crop_mid_u_cursive`, `crop_mid_u_jumps`).")
    L.append("")
    L.append("What was measured, not judged: no candidate draws v6.8's joins within 1.0 u on any pair, "
             "so no sheet goes forward as a pick on these numbers; both letters keep their presets unless "
             "Claude's eye and Levi decide otherwise. Nothing is left undone from the brief; the second "
             "candidates were the last task the cap allowed beside the sheets.")
    open(os.path.join(W, "SUMMARY.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
    print("wrote work35/SUMMARY.md")


main()
