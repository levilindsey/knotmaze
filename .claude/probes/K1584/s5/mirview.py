# view a mir.ts dump: left = ink (white) with the under/over centrelines; right = winning term colour per inked pixel
#   python mirview.py <m.json> <capDir> <under> <over> <scale> <out.png>
import json, sys
from PIL import Image, ImageDraw
M = json.load(open(sys.argv[1])); d = sys.argv[2]; U, O = int(sys.argv[3]), int(sys.argv[4]); sc = int(sys.argv[5]); out = sys.argv[6]
SC = json.load(open(d + '/scene_gf.json'))
n = M['w']; I = Image.new('RGB', (n, n)); J = Image.new('RGB', (n, n))
KC = {0: (40, 40, 40), 1: (255, 255, 255), 2: (255, 80, 80), 3: (80, 255, 80), 4: (255, 200, 0), 5: (80, 160, 255)}
for k in range(n * n):
    v = int(255 * M['ink'][k]); c = int(60 * M['cov'][k]); I.putpixel((k % n, k // n), (max(v, c), max(v, c), max(v, c)))
    if M['ink'][k] > 0.3:
        col = KC.get(M['wk'][k], (255, 0, 255))
        if M['wk'][k] == 1: col = (255, 255, 255) if M['wa'][k] == U else ((180, 180, 255) if M['wa'][k] == O else (200, 120, 255))
        J.putpixel((k % n, k // n), col)
    else: J.putpixel((k % n, k // n), (0, 0, 0) if M['cov'][k] < 0.5 else (30, 30, 50))
I = I.resize((n * sc, n * sc), Image.NEAREST); J = J.resize((n * sc, n * sc), Image.NEAREST)
D = ImageDraw.Draw(I)
for ch, col in ((U, (0, 220, 255)), (O, (255, 0, 200))):
    P = SC['chains'][ch]['pts']
    L = [(((P[2 * k] - M['x0']) / M['step']) * sc, ((P[2 * k + 1] - M['y0']) / M['step']) * sc) for k in range(len(P) // 2)]
    L = [p for p in L if -50 < p[0] < n * sc + 50 and -50 < p[1] < n * sc + 50]
    if len(L) > 1: D.line(L, fill=col, width=1)
S = Image.new('RGB', (2 * n * sc + 6, n * sc), (60, 0, 60)); S.paste(I, (0, 0)); S.paste(J, (n * sc + 6, 0)); S.save(out); print(out, S.size)
