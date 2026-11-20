# K1530: masked template search (thread pixels only) for zoom_a's site.
from PIL import Image
import numpy as np
sheet = Image.open(".claude/probes/K1458/live/zoom_a.png").convert("RGB")
tile = np.asarray(sheet.crop((150, 40, 762, 652)).resize((152, 152))).astype(np.float32)
sat = tile.max(axis=2) - tile.min(axis=2)
mask = sat > 50
print("thread px in template:", int(mask.sum()))
full = np.asarray(Image.open(".claude/probes/K1530/out/27A/capfix/q3_today/f_fl0.14.png").convert("RGB")).astype(np.float32)
H, W, _ = full.shape; S = 152
best = (1e18, -1, -1)
m3 = np.repeat(mask[:, :, None], 3, axis=2)
for y in range(0, H - S, 4):
    for x in range(0, W - S, 4):
        d = (full[y:y + S, x:x + S] - tile)[m3]
        s = float((d * d).mean())
        if s < best[0]: best = (s, x, y)
print(f"masked mse {best[0]:.0f} at device ({best[1]},{best[2]})")
