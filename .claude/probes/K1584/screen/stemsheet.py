import sys
from PIL import Image, ImageDraw
o = sys.argv[1]; ims = [Image.open(o + r'\st_%d.png' % i).convert('RGB') for i in range(6)]
W = ims[0].size[0]; H = sum(i.size[1] for i in ims) + 6 * 5
im = Image.new('RGB', (W, H), (40, 40, 40)); y = 0
for t in ims:
    d = ImageDraw.Draw(t)
    for k in range(3):
        cx = k * 808 + 400; cy = 22 + 300
        d.ellipse((cx - 70, cy - 70, cx + 70, cy + 70), outline=(255, 220, 90), width=2)
    im.paste(t, (0, y)); y += t.size[1] + 6
im.save(o + r'\stems.png', optimize=True); print(im.size)
