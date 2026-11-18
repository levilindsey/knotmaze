import sys, json
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB").point(lambda v: max(0, min(255, round((v - 14) * 7))))
S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
names = sys.argv[4].split(","); R = 14; Z = 8
out = Image.new("RGB", (len(names) * (2 * R * Z + 6), 2 * R * Z), (255, 255, 255))
for i, n in enumerate(names):
    nm, dx, dy = (n.split(":") + ["0", "0"])[:3]
    s = S[nm]; cx = round(s["x"]) + int(dx); cy = round(s["y"]) + int(dy)
    out.paste(im.crop((cx - R, cy - R, cx + R, cy + R)).resize((2 * R * Z, 2 * R * Z), Image.NEAREST), (i * (2 * R * Z + 6), 0))
out.save(sys.argv[3])
