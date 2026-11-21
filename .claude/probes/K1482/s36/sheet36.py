# K1482 s36: a sheet of sites, each site one cell: every frame as drawn, then every frame contrast-stretched
# (tiles.py's fixed stretch: (v - LO) * K), nearest-neighbour zoom, the site's name above the cell.
#   python sheet36.py <out.png> <sites.json> <site,site,...> <label=png> [<label=png> ...]
#   env R=36 (half window, device px) Z=4 MAXW=1800 LO=14 K=7 BLOBS=<blob36 json> NOTE=<site=text;site=text> PAN=ds (d = as drawn only, s = stretched only)
# With BLOBS, red ticks on each panel's top and left edge point at the site's widest ink px (the detector's wedge).
# A site given as "name@x:y" is centred on x,y (device px) instead of the site's own point.
import json, os, sys
from PIL import Image, ImageDraw

out, sites_path, names, *frames = sys.argv[1:]
R = int(os.environ.get("R", 36)); Z = int(os.environ.get("Z", 4)); MAXW = int(os.environ.get("MAXW", 1800))
LO, K = float(os.environ.get("LO", 14)), float(os.environ.get("K", 7))
S = {s["site"]: s for s in json.load(open(sites_path))["sites"]}
blobs = {}
if os.environ.get("BLOBS"):
    for s in json.load(open(os.environ["BLOBS"]))["sites"]:
        if s.get("blobs"):
            blobs[s["site"]] = s["blobs"][0]
notes = dict(p.split("=", 1) for p in os.environ.get("NOTE", "").split(";") if "=" in p)
F = [(f.split("=", 1)[0], Image.open(f.split("=", 1)[1]).convert("RGB")) for f in frames]
FS = [(l, im.point(lambda v: max(0, min(255, round((v - LO) * K))))) for l, im in F]
T = 2 * R * Z
PAN = os.environ.get("PAN", "ds")
ALL = (F if "d" in PAN else []) + (FS if "s" in PAN else [])
ND = len(F) if "d" in PAN else 0
panels = len(ALL)
cellw = panels * (T + 3) + 9
cols = max(1, MAXW // cellw)
items = []
for n in [x for x in names.split(",") if x]:
    if "@" in n:
        nm, xy = n.split("@"); x, y = [int(float(v)) for v in xy.split(":")]
    else:
        nm = n; x, y = round(S[n]["x"]), round(S[n]["y"])
    items.append((nm, x, y))
rows = (len(items) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cellw, rows * (T + 30) + 4), (255, 255, 255))
dr = ImageDraw.Draw(sheet)
for i, (nm, x, y) in enumerate(items):
    ox, oy = (i % cols) * cellw, (i // cols) * (T + 30)
    dr.text((ox + 2, oy + 2), f"{nm}  {notes.get(nm, '')}", fill=(160, 0, 0))
    for p, (lab, im) in enumerate(ALL):
        px = ox + p * (T + 3)
        tile = im.crop((x - R, y - R, x + R, y + R)).resize((T, T), Image.NEAREST)
        sheet.paste(tile, (px, oy + 28))
        dr.text((px + 2, oy + 15), lab + (" (as drawn)" if p < ND else " (stretched)"), fill=(0, 0, 0))
        b = blobs.get(nm)
        if b and abs(b["mx"] - x) < R and abs(b["my"] - y) < R:
            bx, by = px + (b["mx"] - x + R) * Z + Z // 2, oy + 28 + (b["my"] - y + R) * Z + Z // 2
            dr.line((bx, oy + 28, bx, oy + 28 + 5), fill=(255, 40, 40), width=2)
            dr.line((px, by, px + 5, by), fill=(255, 40, 40), width=2)
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
sheet.save(out)
print(out, sheet.size, len(items))
