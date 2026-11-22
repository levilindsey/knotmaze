# K1572 Muse batch 27 Run Z6 (27Z6): the table for build N against master.
#   python table27z6.py <runOut> [--sheets]
# Reads run27z6.ps1's captures (K1578 chain: raw/{m,c,m2,c2}/<maze>/gf_b2.png,
# cap_shot.log, gf_b2view.txt, sites_gf.json; mazes.txt, places.txt from
# analyze_maze.py) and prints, per maze, every changed place (whole frame,
# analyze_maze's 24 px cell merge, step 1 or 3 by view agreement) with its
# distance to the nearest of stage 41's 17 places. A changed place counts as
# one of the 17 when its centre lies within 60 device px of that place's
# ball40 centre on the same maze (the 17 centres below are ball40's; the
# closest two on one maze, A_5 t30e and t14s, sit 230 px apart, so a 60 px
# radius cannot merge two). It also checks validity (hash, lost, passes,
# views) from the capture logs, the cand-vs-cand floor on three mazes, and
# Run Z6 Done 3: master against N inside the 100 px square and disc at
# A_4 t32s (937,1627) and A_5 t30e (1233,254), step 1 luminance.
# With --sheets it writes, for every changed place NOT one of the 17, a
# sheet master | N | diff (changed px in red on the master crop; wide
# R100 then close R40, as drawn) as <maze>_<x>x<y>.png directly under
# <runOut>/ (Run Z6 Done 4). Sheets judge nothing; they only show.
import json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw

run_out = sys.argv[1]
do_sheets = "--sheets" in sys.argv
MAZE_ORDER = ['A_3', 'A_4', 'A_5', 'A_6', 'A_7', 'A_8', 'A_9', 'A_a', 'A_b',
              'A_c', 'A_d', 'D_1', 'D_2', 'D_3', 'D_4', 'D_5', 'D_6', 'D_7',
              'D_8', 'D_9', 'D_a']
# Stage 41's 17 places (### Handoff K1572 s41): maze, site, ball40 centre x, y.
SEVENTEEN = [
    ("A_8", "t31s", 1149, 1576), ("A_4", "t32s", 937, 1627),
    ("A_4", "t22s", 1948, 1293), ("A_5", "t30e", 1233, 254),
    ("A_5", "t65s", 2042, 893), ("A_5", "t34e", 2345, 852),
    ("A_5", "t14s", 1064, 410), ("A_b", "t25e", 994, 224),
    ("A_3", "t22e", 2290, 919), ("A_3", "t26s", 2099, 1137),
    ("A_9", "t28e", 2154, 126), ("A_9", "t47e", 1894, 1390),
    ("A_7", "t83e", 2269, 507), ("A_a", "t16s", 2268, 850),
    ("A_c", "j69", 1427, 785), ("A_d", "t88s", 2102, 995),
    ("A_d", "j40", 1057, 770),
]
lum = lambda X: (X[..., 0] * 299 + X[..., 1] * 587 + X[..., 2] * 114) // 1000


def lines(name):
    p = os.path.join(run_out, name)
    return open(p, encoding="utf-8").read().splitlines() if os.path.exists(p) else []


def meta(tag, maze):
    log = os.path.join(run_out, "raw", tag, maze, "cap_shot.log")
    txt = open(log, encoding="utf-8", errors="replace").read() if os.path.exists(log) else ""
    hs = re.findall(r"hash (\w+), lost (\d+)", txt)
    ps = re.findall(r'"passes":(\d+)', txt)
    fb = "fallback" if "no gf frame" in txt else ""
    return (hs[-1] if hs else ("?", "?"), ps[-1] if ps else "?", fb)


def view1(tag, maze):
    p = os.path.join(run_out, "raw", tag, maze, "gf_b2view.txt")
    if not os.path.exists(p):
        return ""
    ls = [l for l in open(p, encoding="utf-8", errors="replace").read().splitlines() if l.strip()]
    return ls[0] if ls else ""


def load(tag, maze):
    p = os.path.join(run_out, "raw", tag, maze, "gf_b2.png")
    return np.asarray(Image.open(p).convert("RGB")).astype(np.int32)


def box_count(maze, cx, cy):
    A, B = load("m", maze), load("c", maze)
    d = np.abs(lum(B) - lum(A)) >= 1
    h, w = d.shape
    sq = d[max(0, cy - 100):cy + 100, max(0, cx - 100):cx + 100]
    yy, xx = np.mgrid[0:h, 0:w]
    disc = d & ((xx - cx) ** 2 + (yy - cy) ** 2 <= 100 * 100)
    return int(sq.sum()), int(disc.sum())


mazes, places = {}, []
for l in lines("mazes.txt"):
    f = l.split("\t")
    mazes[f[0]] = l
for l in lines("places.txt"):
    f = l.split("\t")
    if len(f) >= 6:
        x, y = (int(v) for v in f[1].split(","))
        places.append((f[0], x, y, f[2], f[5]))

print("VALIDITY + FLOORS (hash / lost / passes per load m,c,m2,c2; views m vs c)")
for mz in MAZE_ORDER:
    if mz not in mazes:
        print(f"{mz}: NO ROW (not captured)")
        continue
    ms = [meta(t, mz) for t in ("m", "c", "m2", "c2")]
    vs = view1("m", mz) == view1("c", mz) and view1("m", mz) != ""
    print(f"{mz}: " + " ".join(f"{a[0][0]}/lost{a[0][1]}/p{a[1]}{a[2]}" for a in ms)
          + f" viewsEqual={vs} | {mazes[mz]}")

print("\nDONE 3 (master vs N, step 1, within 100 px: square / disc)")
for mz, cx, cy in (("A_4", 937, 1627), ("A_5", 1233, 254)):
    try:
        s, d = box_count(mz, cx, cy)
        print(f"{mz} ({cx},{cy}): square {s} px, disc {d} px")
    except Exception as e:
        print(f"{mz} ({cx},{cy}): NOT COMPUTED ({e})")

print("\nTABLE (every changed place; in17 = centre within 60 px of a stage-41 place)")
extra = []
for mz in MAZE_ORDER:
    rs = sorted([p for p in places if p[0] == mz], key=lambda p: (p[2], p[1]))
    if mz in mazes and not rs:
        print(f"{mz}: 0 changed places")
    for _, x, y, npx, site in rs:
        best = min(((np.hypot(x - a, y - b), s) for m2, s, a, b in SEVENTEEN if m2 == mz),
                   default=(1e9, ""))
        in17 = best[0] <= 60
        print(f"{mz}\t{x},{y}\t{npx}\t{site}\t"
              + (f"ONE-OF-17 {best[1]} d={best[0]:.1f}" if in17 else "NOT-17"))
        if not in17:
            extra.append((mz, x, y))
print(f"places total {len(places)}, not-17 {len(extra)}: "
      + ", ".join(f"{m} {x},{y}" for m, x, y in extra))

if do_sheets:
    for mz, x, y in extra:
        A = Image.open(os.path.join(run_out, "raw", "m", mz, "gf_b2.png")).convert("RGB")
        B = Image.open(os.path.join(run_out, "raw", "c", mz, "gf_b2.png")).convert("RGB")
        Aa = np.asarray(A).astype(np.int32)
        Ba = np.asarray(B).astype(np.int32)
        step = 1 if view1("m", mz) == view1("c", mz) else 3
        ch = np.abs(lum(Ba) - lum(Aa)) >= step
        W, Hh = 1240, 0
        rows = []
        for R, Z in ((100, 2), (40, 5)):
            t = 2 * R * Z
            row = Image.new("RGB", (3 * t + 16, t + 18), (255, 255, 255))
            dr = ImageDraw.Draw(row)
            Dm = A.convert("L").convert("RGB")
            Dm.paste((255, 0, 0), mask=Image.fromarray((ch * 255).astype(np.uint8)))
            for i, (nm, im) in enumerate((("master", A), ("N", B), ("diff", Dm))):
                tile = im.crop((x - R, y - R, x + R, y + R)).resize((t, t), Image.NEAREST)
                row.paste(tile, (4 + i * (t + 4), 18))
                dr.text((8 + i * (t + 4), 4), nm, fill=(0, 0, 0))
            rows.append(row)
        S = Image.new("RGB", (W, sum(r.height for r in rows) + 24), (255, 255, 255))
        ImageDraw.Draw(S).text((4, 4), f"{mz} {x},{y} master | N | diff (step {step})", fill=(160, 0, 0))
        yy = 24
        for r in rows:
            S.paste(r, (0, yy))
            yy += r.height
        out = os.path.join(run_out, f"{mz}_{x}x{y}.png")
        S.save(out)
        print(f"sheet {out}")
