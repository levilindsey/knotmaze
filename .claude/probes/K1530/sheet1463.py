# K1530 Done 4: K1463's spot (device window 1152,900, 152px, from locate3.py) today | gf,
# surroundings + 4x, from the same-state (f9d72040) capfix captures.
from PIL import Image, ImageDraw
D = ".claude/probes/K1530/out/27A/capfix"
def load(m, fl): return Image.open(f"{D}/{m}/f_fl{fl}.png").convert("RGB")
today14, gf14 = load("q3_today", "0.14"), load("q3_gf", "0.14")
today12, gf12 = load("q3_today", "1.2"), load("q3_gf", "1.2")
X, Y, S = 1152, 900, 152
SUR = (X - 200, Y - 200, X + S + 200, Y + S + 200)
def crop(im, box): return im.crop(box)
def up(im): return im.resize((im.width * 4, im.height * 4), Image.NEAREST)
rows = []
for fl, t, g in [("0.14", today14, gf14), ("1.2", today12, gf12)]:
    rows.append((f"fl {fl} surroundings", crop(t, SUR), crop(g, SUR)))
    rows.append((f"fl {fl} 4x", up(crop(t, (X, Y, X + S, Y + S))), up(crop(g, (X, Y, X + S, Y + S)))))
W = max(r[1].width + r[2].width + 30 for r in rows)
H = sum(max(r[1].height, r[2].height) + 34 for r in rows) + 10
sheet = Image.new("RGB", (W, H), (24, 24, 28))
dr = ImageDraw.Draw(sheet)
y = 10
for label, t, g in rows:
    dr.text((10, y), f"{label}   today | master gf (same state f9d72040)", fill=(230, 230, 230))
    y += 22
    sheet.paste(t, (10, y)); sheet.paste(g, (20 + t.width, y))
    y += max(t.height, g.height) + 12
out = ".claude/probes/K1530/out/27A/k1463_sheet.png"
sheet.save(out)
print(out, sheet.size)
