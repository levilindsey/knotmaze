# K1444: a labelled sheet of crops. python sheet.py <out.png> <box x0,y0,x1,y1> <scale> <gain> <rows...>, each row "label=file,file,file"; cols from env COLS
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
out, box, scale, gain = sys.argv[1], tuple(map(int, sys.argv[2].split(","))), int(sys.argv[3]), float(sys.argv[4])
cols = os.environ.get("COLS", "").split("|")
rows = [(r.rsplit("=",1)[0], r.rsplit("=",1)[1].split(",")) for r in sys.argv[5:]]
tw, th = (box[2]-box[0])*scale, (box[3]-box[1])*scale
font = ImageFont.truetype("arial.ttf", 22)
W, H = 150 + tw*len(rows[0][1]) + 6*len(rows[0][1]), 40 + (th+6)*len(rows)
sh = Image.new("RGB", (W, H), (24, 24, 28)); d = ImageDraw.Draw(sh)
for i, c in enumerate(cols): d.text((150 + i*(tw+6) + 8, 8), c, fill=(255,255,255), font=font)
for j, (lab, files) in enumerate(rows):
    for k, line in enumerate(lab.split("/")): d.text((8, 40 + j*(th+6) + 8 + k*26), line, fill=(255,255,255), font=font)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB").crop(box).resize((tw, th), Image.LANCZOS)
        if gain != 1: im = ImageEnhance.Brightness(ImageEnhance.Contrast(im).enhance(gain)).enhance(1 + (gain-1)*0.6)
        sh.paste(im, (150 + i*(tw+6), 40 + j*(th+6)))
sh.save(out)
