r"""K863 J3l: crops of a sheet_k863k sheet's PNG, as one grid: the chosen rows (cases, 1-based) by the chosen columns
(by name: font, then each build), each tile the cell's x range [a, b] (fractions of the cell width) and y range
[ytop, ybot] (fu, the baseline at 0, x-height 500), at the PNG's own scale (no resampling: view it at full size).
Run from the trace dir:
  venv\Scripts\python.exe -I work36\dbg\grid_k863l.py <sheet.svg> <sheet.png> <out.png> <cols name,name|all>
      <rows 1,2,...|all> [<x fractions a,b> [<y fu top,bottom>]]"""
import re
import sys

from PIL import Image, ImageDraw

S = 0.24
YTOP, YBOT = 1000.0, -560.0
PAD, LAB, GAP = 30.0, 200.0, 30.0
ROW_H = (YTOP - YBOT) * S + 24.0


def main():
    svg, png, out, cols, rows = sys.argv[1:6]
    xa, xb = (float(v) for v in (sys.argv[6] if len(sys.argv) > 6 else "0,1").split(","))
    yt, yb = (float(v) for v in (sys.argv[7] if len(sys.argv) > 7 else "800,-560").split(","))
    txt = open(svg, encoding="utf-8").read()
    W = float(re.search(r'<svg[^>]*width="([\d.]+)"', txt).group(1))
    names = re.findall(r'<text x="([\d.]+)" y="96"[^>]*font-weight="bold">([^<]+)</text>', txt)
    xs = [float(x) for x, _ in names]
    nm = [n for _, n in names]
    cw = xs[1] - xs[0] - GAP
    ncase = len(re.findall(r'<g id="case-\d+">', txt))
    cases = re.findall(r'<text x="30(?:\.0)?" y="[\d.]+" font-family="sans-serif" font-size="20" fill="#222">([^<]+)</text>',
                       txt)
    im = Image.open(png).convert("RGB")
    k = im.width / W
    ci = list(range(len(nm))) if cols == "all" else [nm.index(c) for c in cols.split(",")]
    ri = list(range(ncase)) if rows == "all" else [int(r) - 1 for r in rows.split(",")]
    tiles = []
    for r in ri:
        oy = 110.0 + r * ROW_H + YTOP * S
        line = []
        for c in ci:
            x0 = xs[c] + xa * cw
            x1 = xs[c] + xb * cw
            line.append(im.crop((int(x0 * k), int((oy - yt * S) * k), int(x1 * k), int((oy - yb * S) * k))))
        tiles.append((cases[r] if r < len(cases) else str(r + 1), line))
    tw = max(t.width for _, l in tiles for t in l)
    th = max(l[0].height for _, l in tiles)
    G = Image.new("RGB", (len(ci) * (tw + 6), 24 + len(ri) * (th + 18)), "white")
    d = ImageDraw.Draw(G)
    for j, c in enumerate(ci):
        d.text((j * (tw + 6) + 4, 4), nm[c], fill="black")
    for i, (cn, line) in enumerate(tiles):
        y = 24 + i * (th + 18)
        d.text((4, y), cn, fill="#444")
        for j, t in enumerate(line):
            G.paste(t, (j * (tw + 6), y + 14))
            d.line([(j * (tw + 6) + tw + 2, y + 14), (j * (tw + 6) + tw + 2, y + 14 + th)], fill="#ddd")
    G.save(out)
    print(out, G.size, "cols", [nm[c] for c in ci], "rows", [tiles[i][0] for i in range(len(tiles))])


if __name__ == "__main__":
    main()
