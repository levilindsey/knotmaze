# K1558 (Muse batch 27 Run P): sheets of the highest-scoring census sites that can be judged.
#   python top_sheets.py <scoresDir> <framesDir> <outDir>
# scoresDir/<maze>/scores.tsv and framesDir/<maze>/gf.png for the 20 census mazes, plus
# scoresDir/A1/scores.tsv + framesDir/A1/gf.png for link A's 13 named sites.
# Per usable kind (wedge 24, sliver 16, thin 16; ties by maze, then site) the highest-numbered
# sites become tiles: 81 px square (R 40) at 3x, levels stretched per tile (1st..99.5th
# percentile), 8 tiles a sheet (4x2), each labelled "<maze> <site> <number>". One more pair of
# sheets holds link A's 13 named sites in Levi's order (open, fine, fixed).
import csv, os, sys
import numpy as np
from PIL import Image, ImageDraw

MAZES = [f"A_{s}" for s in "456789abcd"] + [f"D_{s}" for s in "123456789a"]
NAMED = ["j15", "j59", "t23e", "t81s", "j4", "t84e", "j47", "t59s", "t58e", "j41", "j14", "j50", "t45s"]
R, Z, PER = 40, 3, 8
T = (2 * R + 1) * Z  # 243

def load(p):
    return list(csv.DictReader(open(p), delimiter="\t"))

def sheet(tiles, path):
    cols, rows = 4, 2
    W, H = cols * (T + 6) + 6, rows * (T + 22) + 6
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for i, (label, tile) in enumerate(tiles):
        ox, oy = 6 + (i % cols) * (T + 6), 6 + (i // cols) * (T + 22)
        d.text((ox + 2, oy), label, fill=(200, 0, 0))
        im.paste(tile, (ox, oy + 14))
    im.save(path)
    print(path, len(tiles))

def tile(frame, x, y):
    a = np.asarray(frame).astype(np.float64)
    t = a[y - R:y + R + 1, x - R:x + R + 1]
    lo, hi = np.percentile(t, 1), np.percentile(t, 99.5)
    t = np.clip((t - lo) * 255.0 / max(hi - lo, 1.0), 0, 255).astype(np.uint8)
    return Image.fromarray(t, "L").convert("RGB").resize((T, T), Image.NEAREST)

def main():
    scores_dir, frames_dir, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out_dir, exist_ok=True)
    frames, rows = {}, {}
    for m in MAZES + ["A1"]:
        frames[m] = Image.open(os.path.join(frames_dir, m, "gf.png")).convert("L")
        rows[m] = load(os.path.join(scores_dir, m, "scores.tsv"))
    for kind, count in [("wedge", 24), ("sliver", 16), ("thin", 16)]:
        allr = [(m, r) for m in MAZES for r in rows[m]]
        allr.sort(key=lambda mr: (-float(mr[1][kind]), mr[0], mr[1]["site"]))
        picked = allr[:count]
        for p in range(0, count, PER):
            tiles = [(f"{m} {r['site']} {kind} {r[kind]}", tile(frames[m], int(r["x"]), int(r["y"])))
                     for m, r in picked[p:p + PER]]
            sheet(tiles, os.path.join(out_dir, f"top_{kind}_{p // PER:02d}.png"))
    by = {r["site"]: r for r in rows["A1"]}
    tiles = [(f"A {s} wedge {by[s]['wedge']} sliver {by[s]['sliver']} thin {by[s]['thin']}",
              tile(frames["A1"], int(by[s]["x"]), int(by[s]["y"]))) for s in NAMED]
    for p in range(0, len(tiles), PER):
        sheet(tiles[p:p + PER], os.path.join(out_dir, f"namedA_{p // PER:02d}.png"))

if __name__ == "__main__":
    main()
