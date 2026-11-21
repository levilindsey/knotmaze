# K1561 (27Q) Done 5: one picture per changed fill place, from the session in out/27Q.
#   python .claude/probes/K1561/make_pics.py <capRoot> <outDir>
# Each picture: two rows (surroundings, then close), each row master | fix | changed-in-red
# (master with the m1-f1 changed px painted red, dilated 1 so single px show). The close row
# is the place's bbox + 14 device px enlarged 4x (nearest); the surroundings row is the bbox
# expanded by 90 device px at 1x, each tile capped at 560 px wide. Places are computed here
# by the same routine as diffcap.py (8-connected components of changed px, 2 px gaps bridged);
# the world in places.txt is (device/dpr - view.xy) / view.s from m1's meta.json.
import json, sys
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".claude/probes/K1561/out/27Q")
out_dir = Path(sys.argv[2] if len(sys.argv) > 2 else root / "pics")
out_dir.mkdir(parents=True, exist_ok=True)

def load(p):
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)

def changed(a, b):
    return np.any(a != b, axis=2)

def places(mask, meta):
    H, W = mask.shape
    dil = mask.copy()
    for _ in range(2):
        d = dil.copy()
        d[1:, :] |= dil[:-1, :]; d[:-1, :] |= dil[1:, :]; d[:, 1:] |= dil[:, :-1]; d[:, :-1] |= dil[:, 1:]
        d[1:, 1:] |= dil[:-1, :-1]; d[1:, :-1] |= dil[:-1, 1:]; d[:-1, 1:] |= dil[1:, :-1]; d[:-1, :-1] |= dil[1:, 1:]
        dil = d
    seen = np.zeros_like(mask)
    view = meta.get("view") or {}; dpr = meta.get("dpr") or 3
    s = view.get("s") or 1; vx = view.get("x") or 0; vy = view.get("y") or 0
    out = []
    cy, cx = np.nonzero(mask)
    for y, x in zip(cy.tolist(), cx.tolist()):
        if seen[y, x] or not dil[y, x]:
            continue
        q = deque([(y, x)]); seen[y, x] = True; pix = []
        while q:
            y0, x0 = q.popleft()
            if mask[y0, x0]:
                pix.append((y0, x0))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y0 + dy, x0 + dx
                    if 0 <= ny < H and 0 <= nx < W and dil[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        if not pix:
            continue
        arr = np.array(pix, dtype=np.float64)
        my, mx = arr.mean(axis=0)
        out.append({"n": len(pix), "dev": [round(float(mx), 1), round(float(my), 1)],
                    "bboxDev": [int(arr[:, 1].min()), int(arr[:, 0].min()), int(arr[:, 1].max()), int(arr[:, 0].max())],
                    "world": [round(float((mx / dpr - vx) / s), 3), round(float((my / dpr - vy) / s), 3)]})
    out.sort(key=lambda p: -p["n"])
    return out

def crop(img, box, cap_w=560, scale=1):
    x0, y0, x1, y1 = box
    x0 = max(0, x0); y0 = max(0, y0); x1 = min(img.shape[1], x1); y1 = min(img.shape[0], y1)
    im = Image.fromarray(img[y0:y1, x0:x1].astype(np.uint8))
    if scale != 1:
        im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    elif im.width > cap_w:
        im = im.resize((cap_w, max(1, round(im.height * cap_w / im.width))), Image.NEAREST)
    return im

def main():
    scenes = sorted({p.name for p in (root / "m1").iterdir() if p.is_dir()})
    lines = []
    for sc in scenes:
        m = load(root / "m1" / sc / "fill.png"); f = load(root / "f1" / sc / "fill.png")
        meta = json.loads((root / "m1" / sc / "meta.json").read_text())
        mask = changed(m, f)
        pl = places(mask, meta)
        red = m.copy()
        d = mask.copy(); d[1:, :] |= mask[:-1, :]; d[:-1, :] |= mask[1:, :]; d[:, 1:] |= mask[:, :-1]; d[:, :-1] |= mask[:, 1:]
        red[d] = [255, 0, 0]
        for i, p in enumerate(pl):
            bx0, by0, bx1, by1 = p["bboxDev"]
            sur = (bx0 - 90, by0 - 90, bx1 + 91, by1 + 91)
            clo = (bx0 - 14, by0 - 14, bx1 + 15, by1 + 15)
            tiles_sur = [crop(a, sur) for a in (m, f, red)]
            tiles_clo = [crop(a, clo, scale=4) for a in (m, f, red)]
            w_sur = sum(t.width for t in tiles_sur) + 8; h_sur = max(t.height for t in tiles_sur)
            w_clo = sum(t.width for t in tiles_clo) + 8; h_clo = max(t.height for t in tiles_clo)
            W = max(w_sur, w_clo); H = h_sur + h_clo + 26
            canvas = Image.new("RGB", (W, H), (24, 24, 24))
            dr = ImageDraw.Draw(canvas)
            dr.text((4, 4), f"{sc} place{i} {p['n']}px world {p['world'][0]}:{p['world'][1]} row1 surroundings 1x row2 close 4x master|fix|red", fill=(255, 255, 255))
            x = 0
            for t in tiles_sur:
                canvas.paste(t, (x, 20)); x += t.width + 4
            x = 0
            for t in tiles_clo:
                canvas.paste(t, (x, 22 + h_sur)); x += t.width + 4
            name = f"{sc}_p{i:03d}_{p['n']}px.png"
            canvas.save(out_dir / name)
            lines.append(f"{sc}\t{p['world'][0]}:{p['world'][1]}\t{p['n']}\t{name}")
    (out_dir / "places.txt").write_text("\n".join(lines) + "\n")
    print(f"{len(lines)} pictures in {out_dir}")

main()
