# K1584 s3: one sheet of every framediff box that is far from a crossing (dCross > 45) or darker, over all mazes:
# a row each, stage 1 | s3 (contrast-stretched, scaled), labelled maze, crossing, site, px, dLum.
#   python farsheet.py <Tag> <out.png> [half=48] [scale=4] [first count]
import sys, json, glob, os
import numpy as np
from PIL import Image, ImageDraw
here = os.path.dirname(os.path.abspath(__file__))
tag, out = sys.argv[1], sys.argv[2]
half = int(sys.argv[3]) if len(sys.argv) > 3 else 48; sc = int(sys.argv[4]) if len(sys.argv) > 4 else 4
rows = []
for p in sorted(glob.glob(os.path.join(here, 'diff_%s_*.json' % tag))):
    m = os.path.basename(p)[len('diff_%s_' % tag):-5]
    for b in json.load(open(p))['boxes']:
        if b['dCross'] > 45 or b['dLum'] < 0: rows.append((m, b))
if len(sys.argv) > 6: rows = rows[int(sys.argv[5]):int(sys.argv[5]) + int(sys.argv[6])]   # [first count]
def crop(d, cx, cy):
    q = np.asarray(Image.open(os.path.join(d, 'gf_b2.png')).convert('L')).astype(np.float32)
    H, W = q.shape; x0, y0 = max(0, cx - half), max(0, cy - half)
    c = q[y0:min(H, cy + half), x0:min(W, cx + half)]
    lo, hi = np.percentile(c, 1), np.percentile(c, 99.5); c = np.clip((c - lo) / max(1, hi - lo) * 255, 0, 255)
    return Image.fromarray(c.astype(np.uint8)).resize((c.shape[1] * sc, c.shape[0] * sc), Image.NEAREST)
T = 2 * half * sc; G = 6; L = 22
S = Image.new('RGB', (2 * T + 3 * G, max(1, len(rows)) * (T + L + G) + G), (40, 0, 60)); dr = ImageDraw.Draw(S)
for i, (m, b) in enumerate(rows):
    cx, cy = int(b['x'] + b['w'] / 2), int(b['y'] + b['h'] / 2); y = G + i * (T + L + G)
    dr.text((G, y + 2), '%s x%s %s %dpx dLum %.1f at %d,%d  (stage 1 | s3)' % (m, b['cross'], b['site'], b['px'], b['dLum'], cx, cy), fill=(255, 230, 0))
    for j, d in enumerate([os.path.join(here, '..', 's1', 'out', 'after', m), os.path.join(here, 'out', tag, m)]):
        S.paste(crop(d, cx, cy).convert('RGB'), (G + j * (T + G), y + L))
S.save(out); print(len(rows), S.size)
