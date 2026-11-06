r"""K863 J3k: a zoomed raster view of one letter of a word, for designing and judging the word-end forms and dots (the
sheets in out34 are the record; this is the design loupe). Columns: the font (wght 100 fill, its skeleton in blue),
then each build: the font's pale fill, the build's ink at the font's pen width (translucent grey, so the drawn look
reads), its centrelines (letters black, joins red, leads and tails orange) and the cut points (green dots).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\look_k863k.py <out.png> <word> <letter index in the word, 0 = first>
      <scale px/fu> <pad fu> --col <name>=<build dir>|<ports.json>|<variant> [--col ...] [--pen <u>] [--box x0,x1,y0,y1]
(the box, in fu relative to the letter's glyph origin, overrides the letter's extents plus the pad)."""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))
import numpy as np  # noqa: E402
from PIL import Image, ImageChops, ImageDraw, ImageFont  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k863k as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
import join_k926 as J  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
U = 0.24


def fill_mask(size, polys, tf):
    m = Image.new("1", size, 0)
    for p in polys:
        q = Image.new("1", size, 0)
        ImageDraw.Draw(q).polygon([tf(x, y) for x, y in np.asarray(p, float)], fill=1)
        m = ImageChops.logical_xor(m, q)
    return m


def main():
    a = sys.argv[1:]
    cols, pen, box = [], 9.2, None
    while "--col" in a:
        i = a.index("--col")
        cols.append(a[i + 1])
        a = a[:i] + a[i + 2:]
    if "--pen" in a:
        i = a.index("--pen")
        pen = float(a[i + 1])
        a = a[:i] + a[i + 2:]
    if "--box" in a:
        i = a.index("--box")
        box = [float(v) for v in a[i + 1].split(",")]
        a = a[:i] + a[i + 2:]
    out, word, li, sc, pad = a[0], a[1], int(a[2]), float(a[3]), float(a[4])
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    runs = []
    for c in cols:
        name, spec = c.split("=", 1)
        bd, pp, var = spec.split("|")
        bd = bd if os.path.isabs(bd) else os.path.join(T, bd)
        B = json.load(open(os.path.join(bd, "bodies.json")))
        P = json.load(open(os.path.join(bd, "join_params.json")))
        A = G.assemble(font, B, P, word, with_ref=False, ports=G.load_ports(os.path.join(T, pp), var))
        runs.append((name, A))
    sh = runs[0][1]["shaping"]
    lt0 = [lt for lt in runs[0][1]["letters"]][li]
    g = sh[lt0["i"]]
    gpolys = [np.asarray(p, float) for p in K.placed_polys(font, g, 100, 0.0) if len(p) > 2]
    allpolys = [np.asarray(p, float) for gg in sh for p in K.placed_polys(font, gg, 100, 0.0) if len(p) > 2]
    if box:
        x0, x1, y0, y1 = g["x"] + box[0], g["x"] + box[1], box[2], box[3]
    else:
        pts = np.vstack(gpolys)
        x0, x1 = pts[:, 0].min() - pad, pts[:, 0].max() + pad
        y0, y1 = pts[:, 1].min() - pad, pts[:, 1].max() + pad
    W, H = int((x1 - x0) * sc), int((y1 - y0) * sc)
    head = 26

    def tf(x, y):
        return ((x - x0) * sc, (y1 - y) * sc)
    panels = []
    names = ["font"] + [r[0] for r in runs]
    for ci, nm in enumerate(names):
        im = Image.new("RGB", (W, H), "white")
        mk = fill_mask((W, H), allpolys, tf)
        im.paste((190, 190, 190) if ci == 0 else (234, 234, 234), mask=mk)
        d = ImageDraw.Draw(im, "RGBA")
        for yy, colr in ((0.0, (150, 175, 230, 255)), (500.0, (150, 210, 150, 255))):
            d.line([tf(x0, yy), tf(x1, yy)], fill=colr, width=1)
        if ci == 0:
            sg = J.skel_graph(font, g, origin=0.0)
            for x, y in sg.fu:
                if x0 <= x <= x1 and y0 <= y <= y1:
                    px, py = tf(x, y)
                    d.point((px, py), fill=(37, 99, 235, 255))
        else:
            A = runs[ci - 1][1]
            pw = max(1, int(round(pen / U * sc)))
            chains = []
            for lt in A["letters"]:
                for st in lt["strokes"]:
                    chains.append((L.samples(st, 1.0)[0], (0, 0, 0, 255)))
            for nmk, colr in (("joins", (220, 38, 38, 255)), ("leads", (249, 115, 22, 255)), ("tails", (249, 115, 22, 255))):
                for j in A[nmk]:
                    chains.append((L.samples(FN.conn_beziers(j["coeffs"]), 1.0)[0], colr))
            ink = Image.new("L", (W, H), 0)
            di = ImageDraw.Draw(ink)
            for P_, _ in chains:
                xy = [tf(x, y) for x, y in P_]
                di.line(xy, fill=255, width=pw, joint="curve")
                for e in (xy[0], xy[-1]):
                    di.ellipse([e[0] - pw / 2, e[1] - pw / 2, e[0] + pw / 2, e[1] + pw / 2], fill=255)
            im.paste((70, 70, 70), mask=ink.point(lambda v: 110 if v else 0))
            d = ImageDraw.Draw(im, "RGBA")
            for P_, colr in chains:
                d.line([tf(x, y) for x, y in P_], fill=colr, width=max(1, int(sc * 2.2 / 4.17 + 0.5)))
            for j in A["tails"]:
                px, py = tf(*np.asarray(L.sample_c(j["coeffs"], 2)[0], float))
                d.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(22, 163, 74, 255))
        panels.append(im)
    sheet = Image.new("RGB", (len(panels) * (W + 12), H + head), "white")
    dd = ImageDraw.Draw(sheet)
    try:
        fnt = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        fnt = None
    for k, (im, nm) in enumerate(zip(panels, names)):
        sheet.paste(im, (k * (W + 12), head))
        dd.text((k * (W + 12) + 4, 3), f"{nm}  ({word!r}, letter {li})", fill=(0, 0, 0), font=fnt)
    sheet.save(out)
    print(out, sheet.size, f"box x {x0:.0f}..{x1:.0f} y {y0:.0f}..{y1:.0f} fu, glyph {g['name']} at {g['x']:.1f}")


if __name__ == "__main__":
    main()
