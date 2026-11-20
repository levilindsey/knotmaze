import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
raw, out = sys.argv[1], sys.argv[2]
img = Image.open(raw + r'\gf.png').convert('RGB')
sites = {s['site']: s for s in json.load(open(raw + r'\sites_gf.json'))['sites']}
groups = {
 'wedge': ['j15', 'j50', 't23e', 't59s', 't81s', 't84e'],
 'notch': ['j4', 'j14', 'j41', 'j47', 'j59', 't4s', 't45s', 't58e'],
 'sliver': ['j71', 'j95', 'j147', 't43s', 't56s'],
}
W, D, T = 168, 56, 448   # context box, detail box (device px), tile size
_a = np.asarray(img).astype(float); LO, HI = np.percentile(_a, 1), np.percentile(_a, 99.5)
font = ImageFont.truetype('arial.ttf', 18)
def crop(cx, cy, box):
    x0, y0 = int(round(cx - box / 2)), int(round(cy - box / 2))
    a = np.asarray(img.crop((x0, y0, x0 + box, y0 + box))).astype(float)
    a = np.clip((a - LO) * 255 / (HI - LO), 0, 255).astype('uint8')
    return Image.fromarray(a), x0, y0
for g, names in groups.items():
    cols = 2
    rows = (len(names) + cols - 1) // cols
    cw, ch = T * 2 + 8, T + 30
    sheet = Image.new('RGB', (cols * cw + (cols - 1) * 16, rows * ch + (rows - 1) * 12), (255, 255, 255))
    for i, n in enumerate(names):
        s = sites[n]
        ox, oy = (i % cols) * (cw + 16), (i // cols) * (ch + 12)
        c, x0, y0 = crop(s['x'], s['y'], W)
        c = c.resize((T, T), Image.LANCZOS)
        d = ImageDraw.Draw(c)
        k = T / W
        bx, by = (s['x'] - D / 2 - x0) * k, (s['y'] - D / 2 - y0) * k
        d.rectangle((bx, by, bx + D * k, by + D * k), outline=(255, 60, 60), width=2)
        det, _, _ = crop(s['x'], s['y'], D)
        det = det.resize((T, T), Image.NEAREST)
        ImageDraw.Draw(det).rectangle((0, 0, T - 1, T - 1), outline=(255, 60, 60), width=2)
        sheet.paste(c, (ox, oy + 30)); sheet.paste(det, (ox + T + 8, oy + 30))
        ImageDraw.Draw(sheet).text((ox, oy + 4), f'{n}: {g}   (left 2.7x, right the red box at 8x)', fill=(20, 20, 40), font=font)
    sheet.save(out + f'\\k1490_{g}.png', optimize=True)
    print(g, sheet.size)
