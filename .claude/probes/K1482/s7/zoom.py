import json,sys
from PIL import Image, ImageDraw, ImageOps
fr, sj, out = sys.argv[1], sys.argv[2], sys.argv[3]; specs = sys.argv[4].split(';'); R = 12; Z = 16
im = Image.open(fr).convert('RGB'); S = {s['site']: s for s in json.load(open(sj))['sites']}
T = 2 * R * Z; sheet = Image.new('RGB', (len(specs) * (T + 6), T + 18), 'white'); d = ImageDraw.Draw(sheet)
for i, sp in enumerate(specs):
  n, dx, dy = sp.split(','); s = S[n]; cx, cy = round(s['x']) + int(dx), round(s['y']) + int(dy)
  t = ImageOps.autocontrast(im.crop((cx - R, cy - R, cx + R, cy + R)).convert('L'), cutoff=1).resize((T, T), Image.NEAREST)
  sheet.paste(t, (i * (T + 6), 16)); d.text((i * (T + 6) + 2, 2), sp, fill='red')
sheet.save(out)
