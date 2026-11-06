# K1198 Run G (Muse batch 22, 22G) task 3, shaping half: glyph for glyph.
# Shapes every string of J3i's census word list (taken from the bench census
# itself, work33/census_v68x.json, in bench word order, duplicates kept as the
# bench ran them) with the stock font and with the ligature-emptied font
# (v68_22g/font_nolig.ttf, font_nolig_22g.py), on the kit's own path (wght 100,
# k886lib.feats_for). Gate: every string without the substring ij shapes
# identically (name, cluster, x, y, adv); strings with ij are listed both ways.
# Also re-shapes all 676 ordered lowercase pairs with the emptied font: none may
# come back as one letter glyph for two letters. Kit inputs read in place.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\shape_gate_22g.py
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ.setdefault("K926_FINAL_E", "shear")

import trace_k879 as K  # noqa: E402
import k886lib as L  # noqa: E402
from k863lib import Font  # noqa: E402

BENCH = os.path.join(T, "work33", "census_v68x.json")
MOD = os.path.join(KDIR, "v68_22g", "font_nolig.ttf")
STOCK = os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf")
ABC = "abcdefghijklmnopqrstuvwxyz"


def bench_words():
    import re
    rows = json.load(open(BENCH, encoding="utf-8"))["rows"]
    by_w = {}
    for r in rows:
        m = re.match(r"w(\d+):", r["id"])
        if m:
            by_w.setdefault(int(m.group(1)), r["word"])
    return [by_w[k] for k in sorted(by_w)]


def shaping(font, text):
    return [(s["name"], s["cluster"], s["x"], s["y"], s["adv"])
            for s in K.shape(font, text, 100, L.feats_for(text))]


def main():
    stock, mod = Font(STOCK), Font(MOD)
    words = bench_words()
    lines = [f"K1198 22G shape gate: {len(words)} bench strings (work33/census_v68x.json word order), "
             f"stock vs ligature-emptied font, wght 100 feats_for"]
    moved, ij_moved = [], []
    for w in words:
        a, b = shaping(stock, w), shaping(mod, w)
        if a != b:
            (ij_moved if "ij" in w else moved).append(w)
            lines.append(f" MOVED {w!r}: stock {a}")
            lines.append(f" MOVED {w!r}: nolig {b}")
    lines.append(f"strings without ij moved: {len(moved)} {moved}")
    lines.append(f"strings with ij moved: {len(ij_moved)} {ij_moved}")
    # every ordered lowercase pair under the emptied font: no ligature may remain
    lig = []
    for x in ABC:
        for y in ABC:
            sh = shaping(mod, x + y)
            letters = [s for s in sh if not s[0].startswith(("cnct", "entr"))]
            covered = {s[1] for s in letters}
            if len(letters) < 2 or covered != {0, 1}:
                lig.append((x + y, sh))
    lines.append(f"pairs still ligating under the emptied font: {len(lig)} {lig[:5]}")
    out = os.path.join(KDIR, "shape_gate_22g.txt")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
