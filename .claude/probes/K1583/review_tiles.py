# Review tiles: the new renderer's half of each 27Z7 tile, brightened, labelled, as JPEG.
#   python review_tiles.py <27Z7 dir> <out dir> [only-name]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
only = sys.argv[3] if len(sys.argv) > 3 else None
os.makedirs(out, exist_ok=True)
idx = json.load(open(os.path.join(src, 'index.json'), encoding='utf-8'))
font = ImageFont.truetype('arial.ttf', 30)
n = tot = 0
for m in idx['mazes']:
    for t in m['tiles']:
        if only and t['file'] != only:
            continue
        im = Image.open(os.path.join(src, t['file'])).convert('RGB')
        new = im.crop((804, 36, 1604, 636)).point(lambda v: min(255, v * 6))
        new = new.resize((1600, 1200), Image.LANCZOS)
        d = ImageDraw.Draw(new)
        label = m['maze'] + ' ' + t['cell']
        d.rectangle((0, 0, 28 + d.textlength(label, font=font), 46), fill=(0, 0, 0))
        d.text((14, 6), label, fill=(255, 255, 255), font=font)
        p = os.path.join(out, t['file'].replace('.png', '.jpg'))
        new.save(p, quality=80)
        n += 1; tot += os.path.getsize(p)
print(n, 'tiles', round(tot / 1e6, 1), 'MB')

