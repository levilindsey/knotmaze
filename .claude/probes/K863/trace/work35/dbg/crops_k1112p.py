r"""K1112 Run P task 6: the 3x crops in work35/look. For every candidate in work35/dist_gate.json, the
five pairs out of m and u with the largest gate distance: a one-case sheet (font | v6.8 | the candidate)
for the word that holds that largest, rendered to PNG at dpi 144 (3x the sheets' 48). Plus two mid-word
joins per letter (a join out of m or u inside a longer word, not a standalone pair), the same way.
Run from the trace dir: venv\Scripts\python.exe -I work35\dbg\crops_k1112p.py"""
import json
import os
import subprocess
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PY = sys.executable
INK = r"C:\Program Files\Inkscape\bin\inkscape.com"
V68 = "approved (v6.8)=work34/base|ports|M|work28/ports_k990e.json"


def col(var):
    return f"{var}=work34/base|ports|{var}|work35/ports_k1112p.json"


def crop(case, cols, name, title):
    svg = os.path.join(T, "work35", "look", name + ".svg")
    png = os.path.join(T, "work35", "look", name + ".png")
    a = [PY, "-I", os.path.join(T, "work35", "dbg", "sheet_k1112p.py"), svg, title, case]
    for c in cols:
        a += ["--col", c]
    a += ["--report", os.path.join(T, "work35", "look", name + ".txt"),
          "--sidecar", os.path.join(T, "work35", "look", name + "_sidecar.json")]
    subprocess.run(a, cwd=T, check=True, capture_output=True, text=True)
    subprocess.run([INK, svg, "--export-type=png", "--export-dpi=144", "--export-background=white",
                    "--export-background-opacity=1", "--export-filename=" + png],
                   cwd=T, check=True, capture_output=True, text=True)
    print(name + ".png", os.path.getsize(png), "bytes")


def main():
    dist = json.load(open(os.path.join(T, "work35", "dist_gate.json")))
    made = []
    # the per-letter candidates only: Pmu10's and Pmu2_2's joins out of m (u) are Pm10's/Pm2's (Pu10's/
    # Pu2's) to the last digit (dist_gate.txt), so their five largest pairs are the same pairs
    for cand, rows in sorted(dist.items()):
        if cand not in ("Pm10", "Pm2", "Pu10", "Pu2"):
            continue
        by_pair = {}
        for r in rows:
            if not r.get("missing"):
                by_pair.setdefault(r["pair"], []).append(r)
        tops = []
        for p, rs in by_pair.items():
            top = max(rs, key=lambda r: r["hausdorff_u"])
            tops.append((top["hausdorff_u"], p, top))
        for haus, p, top in sorted(tops, reverse=True)[:5]:
            name = f"crop_{cand}_{p}"
            crop(top["word"], [V68, col(cand)], name,
                 f"K1112 Run P crop at 3x: {p} in '{top['word']}', {cand} against v6.8 (gate {haus:.3f} u)")
            made.append(name)
    for letter, cases in (("m", ("minimum", "jumps")), ("u", ("cursive", "jumps"))):
        cand = "Pm10" if letter == "m" else "Pu10"
        for w in cases:
            name = f"crop_mid_{letter}_{w}"
            crop(w, [V68, col(cand), col("Pmu10")], name,
                 f"K1112 Run P crop at 3x: a mid-word join out of {letter} in '{w}'")
            made.append(name)
    print("crops:", ", ".join(made))


main()
