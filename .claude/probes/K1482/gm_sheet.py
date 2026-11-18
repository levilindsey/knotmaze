# K1482 s4: per site, GPU frame contrast-stretched | mirror (bg navy, ink black, fill tinted by chain), 6x.
#   python gm_sheet.py <frame.png> <sites.json> <mir.json> <out.png> <sites>
import json, sys, colorsys
import numpy as np
from PIL import Image, ImageDraw
im = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(float); S = {s["site"]: s for s in json.load(open(sys.argv[2]))["sites"]}
M = json.load(open(sys.argv[3])); names = sys.argv[5].split(","); Z = 6; R = 24; n = 2 * R
tiles = []
for nm in names:
    s = S[nm]; t = M[nm]; cx, cy = round(s["x"]), round(s["y"])
    C = im[cy - R:cy + R, cx - R:cx + R]; L = C.sum(2); L = np.clip((L - 60) / (110 - 60), 0, 1)
    g = (np.stack([L, L, L], 2) * 255).astype(np.uint8)
    m = np.zeros((n, n, 3), np.uint8)
    for y in range(n):
        for x in range(n):
            ink, cov, ch, wk, wa, wb = t["px"][y * n + x]
            if ch < 0 and ink < 0.5: col = (40, 50, 110)
            else:
                h = (ch * 0.618) % 1; r, gg, b = colorsys.hsv_to_rgb(h, 0.35, 0.95); col = (int(r * 255), int(gg * 255), int(b * 255))
                k = min(1, max(0, ink)); col = tuple(int(c * (1 - k)) for c in col)
            m[y, x] = col
    T = np.concatenate([g, np.full((n, 2, 3), 255, np.uint8), m], 1)
    tiles.append((nm, Image.fromarray(T).resize((T.shape[1] * Z, n * Z), Image.NEAREST)))
W = tiles[0][1].width; H = tiles[0][1].height + 14; cols = 2; rows = (len(tiles) + cols - 1) // cols
out = Image.new("RGB", (cols * (W + 8), rows * H), "white"); d = ImageDraw.Draw(out)
for i, (nm, T) in enumerate(tiles):
    x = (i % cols) * (W + 8); y = (i // cols) * H; d.text((x, y), nm, fill=(200, 0, 0)); out.paste(T, (x, y + 14))
out.save(sys.argv[4])
