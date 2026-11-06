r"""K863 J3k: the same crop from every column of a sheet or loupe PNG, enlarged and side by side, each labelled with
its column's name (for viewing a small spot at 2x-5x in every column at once).
Run from the trace dir:
  venv\Scripts\python.exe -I work34\dbg\crop_k863k.py <in.png> <out.png> <x0,y0,x1,y1 in the first column, px>
      <column pitch px (may be fractional)> <scale> <name,name,...> [--per-row n]"""
import sys

from PIL import Image, ImageDraw, ImageFont

Image.MAX_IMAGE_PIXELS = None   # our own renders: the words sheet at dpi 144 is 190 Mpx, over PIL's bomb limit


def main():
    a = sys.argv[1:]
    per = 0
    if "--per-row" in a:
        i = a.index("--per-row")
        per = int(a[i + 1])
        a = a[:i] + a[i + 2:]
    src, out, box, pitch, sc, names = a[0], a[1], [int(v) for v in a[2].split(",")], float(a[3]), float(a[4]), a[5].split(",")
    im = Image.open(src).convert("RGB")
    x0, y0, x1, y1 = box
    w, h = int((x1 - x0) * sc), int((y1 - y0) * sc)
    per = per or len(names)
    rows = (len(names) + per - 1) // per
    head = 24
    sheet = Image.new("RGB", (per * (w + 10), rows * (h + head + 6)), "white")
    d = ImageDraw.Draw(sheet)
    try:
        fnt = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        fnt = None
    for k, nm in enumerate(names):
        dx = int(round(k * pitch))
        c = im.crop((x0 + dx, y0, x1 + dx, y1)).resize((w, h), Image.LANCZOS)
        px, py = (k % per) * (w + 10), (k // per) * (h + head + 6)
        sheet.paste(c, (px, py + head))
        d.rectangle([px, py + head, px + w - 1, py + head + h - 1], outline=(200, 200, 200))
        d.text((px + 4, py + 2), f"{nm}  (x{sc:g})", fill=(0, 0, 0), font=fnt)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
