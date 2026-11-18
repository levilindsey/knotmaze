# K1472: today | master gf | my gf sheets from pinsheet.mjs frames.
#   python -I sheet.py <dir> <prefix> [crop x,y,w,h ...]
# Writes <dir>/<prefix>_sheet_whole.png (one row per frame, each tile at half size) and, per crop,
# <dir>/<prefix>_sheet_crop<k>.png (the crop at 4x, nearest, one row per frame), plus a diff count per
# frame and crop between master gf and my gf, and between today and each gf (pixels whose max channel
# differs by more than 24), printed.
import sys, os
from PIL import Image, ImageDraw, ImageChops

d, pre = sys.argv[1], sys.argv[2]
crops = [tuple(int(v) for v in a.split(",")) for a in sys.argv[3:]]
frames = [f"f{i}" for i in range(8)] + ["rest"]
cols = [("today", "today"), ("master", "master gf"), ("mine", "my gf")]


def load(c, f):
    p = os.path.join(d, f"{pre}_{c}_{f}.png")
    return Image.open(p).convert("RGB") if os.path.exists(p) else None


def ndiff(a, b, box=None):
    if a is None or b is None:
        return -1
    if box:
        x, y, w, h = box
        a, b = a.crop((x, y, x + w, y + h)), b.crop((x, y, x + w, y + h))
    m = ImageChops.difference(a, b).getdata()
    return sum(1 for px in m if max(px) > 24)


def sheet(name, tile, scale, box=None):
    tw, th = int(tile[0] * scale), int(tile[1] * scale)
    lab = 18
    out = Image.new("RGB", (tw * 3 + 8, (th + lab) * len(frames)), (255, 255, 255))
    dr = ImageDraw.Draw(out)
    for r, f in enumerate(frames):
        for k, (c, title) in enumerate(cols):
            im = load(c, f)
            if im is None:
                continue
            if box:
                x, y, w, h = box
                im = im.crop((x, y, x + w, y + h)).resize((tw, th), Image.NEAREST)
            else:
                im = im.resize((tw, th), Image.LANCZOS)
            out.paste(im, (k * (tw + 4), r * (th + lab) + lab))
            dr.text((k * (tw + 4) + 4, r * (th + lab) + 3), f"{title}  {f}", fill=(0, 0, 0))
    out.save(os.path.join(d, name))


a = load("today", "f0")
W, H = a.size
sheet(f"{pre}_sheet_whole.png", (W, H), 0.5)
for k, b in enumerate(crops):
    sheet(f"{pre}_sheet_crop{k}.png", (b[2], b[3]), 4, b)
for f in frames:
    t, m, n = load("today", f), load("master", f), load("mine", f)
    row = [f, "master~mine", ndiff(m, n), "today~master", ndiff(t, m), "today~mine", ndiff(t, n)]
    for b in crops:
        row += [f"crop{b}", ndiff(m, n, b), ndiff(t, m, b), ndiff(t, n, b)]
    print(*row)
