import numpy as np
from PIL import Image, ImageDraw

img = np.asarray(Image.open('.claude/probes/K1583/out/27Z7/raw/A_3/gf_b2.png').convert('RGB')).astype(int)
lum = (299 * img[:, :, 0] + 587 * img[:, :, 1] + 114 * img[:, :, 2]) // 1000

# (label, cx, cy) hand-check set: 5 largest-gap sides' crossings + 5 zero-gap
spots = [
    ('GAP x18 d-1', 2164, 556), ('GAP x126 d-1', 1137, 835), ('GAP x223 d+1', 2208, 681),
    ('GAP x291 d-1', 1703, 783), ('GAP x51 d+1', 1137, 1391),
    ('NOGAP x0 d+1', 1817, 646), ('NOGAP x3', 1161, 174), ('NOGAP x6', 1716, 218),
    ('NOGAP x2', 1082, 176), ('NOGAP x4', 1194, 217),
]
R = 90; SCALE = 3; TILE = (2 * R) * SCALE; LABEL = 28
sheet = Image.new('RGB', (TILE * 5, (TILE + LABEL) * 2), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
for i, (label, cx, cy) in enumerate(spots):
    crop = lum[cy-R:cy+R, cx-R:cx+R].astype(np.float32)
    st = np.clip((crop - 18) / (34 - 18), 0, 1)
    # ink dark -> show ink bright for visibility: invert so strokes white on black
    vis = ((1 - st) * 255).astype(np.uint8)
    tile = Image.fromarray(vis, 'L').convert('RGB').resize((TILE, TILE), Image.NEAREST)
    td = ImageDraw.Draw(tile)
    td.line([TILE//2 - 12, TILE//2, TILE//2 + 12, TILE//2], fill=(255, 0, 0), width=2)
    td.line([TILE//2, TILE//2 - 12, TILE//2, TILE//2 + 12], fill=(255, 0, 0), width=2)
    col, row = i % 5, i // 5
    x0, y0 = col * TILE, row * (TILE + LABEL)
    sheet.paste(tile, (x0, y0 + LABEL))
    dr.text((x0 + 6, y0 + 6), label, fill=(255, 255, 0))
sheet.save('.claude/probes/K1584/out/27Z8/handcheck.png')
print('wrote handcheck', sheet.size)
