# K1584 s1: one region of two same-view captures, before above after, contrast-stretched.
#   python region.py <beforeDir> <afterDir> <out.png> x y w h [scale=3]
import sys
import numpy as np
from PIL import Image, ImageDraw
b, a, out = sys.argv[1:4]; x, y, w, h = map(int, sys.argv[4:8]); sc = int(sys.argv[8]) if len(sys.argv) > 8 else 3
def load(d):
    q = np.asarray(Image.open(d + '/gf_b2.png').convert('RGB')).astype(np.float32)
    return (299 * q[:, :, 0] + 587 * q[:, :, 1] + 114 * q[:, :, 2]) / 1000
B, A = load(b), load(a); lo, hi = np.percentile(B, 1), np.percentile(B, 99.5)
def t(L): return Image.fromarray((np.clip((L[y:y + h, x:x + w] - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8), 'L').resize((w * sc, h * sc), Image.NEAREST)
S = Image.new('RGB', (w * sc, 2 * h * sc + 40), (40, 0, 60)); d = ImageDraw.Draw(S)
d.text((4, 3), f'before  x {x} y {y} w {w} h {h}', fill=(255, 255, 0)); S.paste(t(B), (0, 18))
d.text((4, h * sc + 23), 'after', fill=(255, 255, 0)); S.paste(t(A), (0, h * sc + 40))
S.save(out); print(out, S.size)
