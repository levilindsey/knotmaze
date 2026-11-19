import json,sys
from PIL import Image, ImageDraw, ImageOps
fr, sj, out, names = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
R = int(sys.argv[5]) if len(sys.argv) > 5 else 32; Z = int(sys.argv[6]) if len(sys.argv) > 6 else 4
im = Image.open(fr).convert('RGB'); S = {s['site']: s for s in json.load(open(sj))['sites']}
cols = 3; rows = (len(names) + cols - 1) // cols; T = 2 * R * Z
sheet = Image.new('RGB', (cols * (T + 6), rows * (T + 18)), 'white'); d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
  s = S[n]; cx, cy = round(s['x']), round(s['y'])
  t = ImageOps.autocontrast(im.crop((cx - R, cy - R, cx + R, cy + R)).convert('L'), cutoff=1).resize((T, T), Image.NEAREST)
  x0 = (i % cols) * (T + 6); y0 = (i // cols) * (T + 18)
  dd = ImageDraw.Draw(t); dd.rectangle((R * Z - 2, R * Z - 2, R * Z + 2, R * Z + 2), outline=128)
  sheet.paste(t, (x0, y0 + 16)); d.text((x0 + 2, y0 + 2), n, fill='red')
sheet.save(out); print(len(names), 'tiles')
