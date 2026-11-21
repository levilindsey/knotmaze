# K1578 (Muse batch 27 Run V): analyse ONE maze's four loads (cap_maze.ps1's raw/<tag>/<maze>)
# inside their own capture session and append that maze's rows to <runOut>/mazes.txt and
# <runOut>/places.txt, with one sheet per changed place in <runOut>/sheets/ (place39.py's layout:
# base | candidate, wide and close, as drawn and brightened) and the sheet's two brightened rows
# only, 1300 px wide, in <runOut>/look/.
#   python analyze_maze.py <runOut> <maze> [--img gf_b2|gf_fill] [--undo]
# The listing step, exactly as the code below has it (K1581; Muse batch 27 Run Y):
# lum(p) = (299*R + 587*G + 114*B) // 1000 per pixel (integer, floor). A pixel counts as
# changed between two shots when |lum difference| >= the pair's step; a pixel whose RGB
# moves but whose lum difference is 0 never counts, at any step. The floors (base vs base,
# candidate vs candidate) always use step 1. The cross-build pairs (base vs candidate, and
# the repeat base2 vs candidate2) use one step for the whole maze: step 1 when the two
# builds' B2 still views agree bit for bit (the first line of raw/m/<maze>/gf_b2view.txt
# equals raw/c's, and is not empty), else step 3, and the maze's row then carries a
# VIEW-DIFF note with both views. So the step is not one number: on a view-agreeing maze a
# 1-level pixel is listed (ball40 A_c j69: one pixel, lum 27 -> 28); on a VIEW-DIFF maze
# 1- and 2-level pixels are never listed and only >= 3 counts (ball40 A_b). Changed px are
# grouped on 24 px cells (8-connected through neighbouring cells), a place's centre is the
# mean of its px, its site the nearest in the base load's sites_gf.json, gained = px the
# candidate draws darker (lum difference < 0), lost = px it draws lighter. Why step 3 on a
# view difference: two builds can land at fit scales apart enough that 1-level edge flips
# swamp the listing (27V on ball40 A_b: 7,027 px at step 1, 436 at step 2, 97 at step 6,
# against the break control's 99/96/91 at steps 1/3/6). Exit 2 when a floor is not 0 px
# (allmaze.ps1 then recaptures the maze once); --undo removes the maze's rows (used before
# that recapture). An existing row for the maze is replaced, never duplicated.
import json, os, re, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "K1482", "s39")))
from place39 import sheet  # noqa: E402

run_out = sys.argv[1]
maze = sys.argv[2]
img = "gf_b2"
if "--img" in sys.argv:
    img = sys.argv[sys.argv.index("--img") + 1]
MAZES_TXT = os.path.join(run_out, "mazes.txt")
PLACES_TXT = os.path.join(run_out, "places.txt")


def read_lines(path):
    if not os.path.exists(path):
        return []
    return open(path, encoding="utf-8").read().splitlines()


def write_rows(path, keep, extra):
    os.makedirs(run_out, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for line in keep + extra:
            f.write(line + "\n")


def drop_maze_rows():
    for path in (MAZES_TXT, PLACES_TXT):
        keep = [l for l in read_lines(path) if not l.startswith(maze + "\t")]
        write_rows(path, keep, [])


if "--undo" in sys.argv:
    drop_maze_rows()
    print(f"{maze}: rows removed")
    sys.exit(0)

raw = os.path.join(run_out, "raw")
T = 1
lum = lambda X: (X[..., 0] * 299 + X[..., 1] * 587 + X[..., 2] * 114) // 1000  # noqa: E731
cache = {}


def load_png(tag):
    p = os.path.join(raw, tag, maze, img + ".png")
    if p not in cache:
        cache[p] = np.asarray(Image.open(p).convert("RGB")).astype(np.int32)
    return cache[p]


def changed_px(A, B, t=1):
    return int((np.abs(lum(B) - lum(A)) >= t).sum())


def places(A, B, SX, SY, SN, t=1):
    d = lum(B) - lum(A)
    m = np.abs(d) >= t
    ys, xs = np.nonzero(m)
    cells = {}
    for y, x in zip(ys.tolist(), xs.tolist()):
        cells.setdefault((y // 24, x // 24), []).append((y, x, int(d[y, x])))
    seen, groups = set(), []
    for k in cells:
        if k in seen:
            continue
        st = [k]
        seen.add(k)
        g = []
        while st:
            c = st.pop()
            g += cells[c]
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    n = (c[0] + dy, c[1] + dx)
                    if n in cells and n not in seen:
                        seen.add(n)
                        st.append(n)
        groups.append(g)
    groups.sort(key=lambda g: -len(g))
    rows = []
    for g in groups:
        yy = [p[0] for p in g]
        xx = [p[1] for p in g]
        cx, cy = int(np.mean(xx)), int(np.mean(yy))
        dd = np.hypot(SX - cx, SY - cy)
        i = int(np.argmin(dd))
        gn = sum(1 for p in g if p[2] < 0)
        rows.append((cx, cy, len(g), gn, len(g) - gn, SN[i]))
    return int(m.sum()), rows


def load_meta(tag):
    log = os.path.join(raw, tag, maze, "cap_shot.log")
    txt = open(log, encoding="utf-8", errors="replace").read() if os.path.exists(log) else ""
    hs = re.findall(r"hash (\w+), lost (\d+)", txt)
    ps = re.findall(r'"passes":(\d+)', txt)
    return (hs[-1][0] if hs else "?", hs[-1][1] if hs else "?", ps[-1] if ps else "?")


tags = ("m", "c", "m2", "c2")
for t in tags:
    if not os.path.exists(os.path.join(raw, t, maze, img + ".png")):
        print(f"{maze}: MISSING {t}/{img}.png - session not counted")
        sys.exit(3)

metas = {t: load_meta(t) for t in tags}
hashes = sorted(set(m[0] for m in metas.values()))
passes = ",".join(metas[t][2] for t in tags)
sites = json.load(open(os.path.join(raw, "m", maze, "sites_gf.json")))["sites"]
SX = np.array([s["x"] for s in sites])
SY = np.array([s["y"] for s in sites])
SN = [s["site"] for s in sites]

def view_of(tag):
    p = os.path.join(raw, tag, maze, "gf_b2view.txt")
    if not os.path.exists(p):
        return ""
    lines = [l for l in open(p, encoding="utf-8", errors="replace").read().splitlines() if l.strip()]
    return lines[0] if lines else ""


A, B, A2, B2 = load_png("m"), load_png("c"), load_png("m2"), load_png("c2")
floor_a = changed_px(A, A2)
floor_b = changed_px(B, B2)
view_same = view_of("m") == view_of("c") and view_of("m") != ""
step_bc = 1 if view_same else 3
ab, rows = places(A, B, SX, SY, SN, step_bc)
repeat = changed_px(A2, B2, step_bc)
gained = sum(r[3] for r in rows)
lost = sum(r[4] for r in rows)
flag = "" if (floor_a == 0 and floor_b == 0) else f"\tFLAG floors base-base {floor_a} px, cand-cand {floor_b} px"
if not view_same:
    flag += f"\tVIEW-DIFF base {view_of('m')} vs cand {view_of('c')} (places at step {step_bc})"

drop_maze_rows()
maze_line = (
    f"{maze}\thash {','.join(hashes)} lost {','.join(sorted(set(m[1] for m in metas.values())))} passes {passes}"
    f"\tbase-vs-base {floor_a} px\tcand-vs-cand {floor_b} px"
    f"\tbase-vs-cand {ab} px in {len(rows)} places (gained {gained}, lost {lost})"
    f"\trepeat base2-vs-cand2 {repeat} px{flag}"
)
write_rows(MAZES_TXT, read_lines(MAZES_TXT), [maze_line])

place_lines = []
bp = os.path.join(raw, "m", maze, img + ".png")
cp = os.path.join(raw, "c", maze, img + ".png")
Bim = Image.open(bp).convert("RGB")
Cim = Image.open(cp).convert("RGB")
for (x, y, n, g, ls, nm) in rows:
    nm_ = re.sub(r"[^\w+.-]", "_", nm)
    name = f"{maze}_{x}x{y}_{nm_}.png"
    sp = os.path.join(run_out, "sheets", name)
    sheet(sp, f"{maze} near {nm}", x, y, bp, cp, Bim, Cim)
    # look/: the sheet's two brightened rows only, 1300 px wide (place39 rows: 24 px title,
    # then 4 rows of T+H+G = 824 px at the defaults T=800, H=16, G=8).
    S = Image.open(sp).convert("RGB")
    bright = Image.new("RGB", (S.width, 2 * 824), (255, 255, 255))
    bright.paste(S.crop((0, 24 + 824, S.width, 24 + 2 * 824)), (0, 0))
    bright.paste(S.crop((0, 24 + 3 * 824, S.width, 24 + 4 * 824)), (0, 824))
    bright = bright.resize((1300, round(bright.height * 1300 / bright.width)), Image.LANCZOS)
    os.makedirs(os.path.join(run_out, "look"), exist_ok=True)
    bright.save(os.path.join(run_out, "look", name))
    place_lines.append(
        f"{maze}\t{x},{y}\t{n} px changed\t{g} px gained\t{ls} px lost\tnear {nm}\tsheets/{name}"
    )
write_rows(PLACES_TXT, read_lines(PLACES_TXT), place_lines)
print(
    f"{maze}: floors {floor_a}/{floor_b}, base-vs-cand {ab} px, {len(rows)} places, "
    f"gained {gained} lost {lost}, repeat {repeat}; hash {hashes}{flag}"
)
sys.exit(2 if (floor_a or floor_b) else 0)
