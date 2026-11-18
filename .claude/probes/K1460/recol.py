# K1460 s5: map a gf shot's thread colour onto today's (per channel, background -> background, gf's plateau e195e8 -> today's cc7ac0;
# the ?3 jB thread's colours, K1389), so a fade can be compared without the colour difference.
#   python recol.py <gf shot.png> <out.png>
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(float)
bg = np.array([0x15, 0x1b, 0x28], float); g = np.array([0xe1, 0x95, 0xe8], float); t = np.array([0xcc, 0x7a, 0xc0], float)
# per channel affine map bg->bg, gf plateau->today plateau
b = bg + (a - bg) * (t - bg) / (g - bg)
Image.fromarray(np.clip(b, 0, 255).astype(np.uint8)).save(out)

