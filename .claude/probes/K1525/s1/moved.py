# K1525 s1: every place the tip differs from master gf (RGB distance > dist), outside the named spot boxes, as
# 76 px tiles merged into regions; per region the px count and, at its centre, the count against today's for master
# gf and the tip (lower = nearer today's). Writes a crop sheet (today's | master gf | tip) of the regions.
#   python moved.py <today png> <master png> <tip png> <out png> <dist> [cx,cy ...spot centres excluded, 76 px box]
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
tp, mp, kp, out, dist = sys.argv[1:6]; dist = float(dist)
spots = [tuple(int(v) for v in a.split(',')) for a in sys.argv[6:]]
L = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(float)
T, M, K = L(tp), L(mp), L(kp)
far = lambda a, b: np.sqrt(((a - b) ** 2).sum(-1)) > dist
mv = far(M, K)
for cx, cy in spots: mv[max(cy - 38, 0):cy + 38, max(cx - 38, 0):cx + 38] = False
H, W = mv.shape; S = 76
gh, gw = (H + S - 1) // S, (W + S - 1) // S
cnt = np.zeros((gh, gw), int)
for i in range(gh):
    for j in range(gw): cnt[i, j] = mv[i * S:(i + 1) * S, j * S:(j + 1) * S].sum()
seen = np.zeros_like(cnt, bool); regs = []
for i in range(gh):
    for j in range(gw):
        if cnt[i, j] == 0 or seen[i, j]: continue
        st = [(i, j)]; seen[i, j] = True; cells = []
        while st:
            a, b = st.pop(); cells.append((a, b))
            for da in (-1, 0, 1):
                for db in (-1, 0, 1):
                    u, v = a + da, b + db
                    if 0 <= u < gh and 0 <= v < gw and not seen[u, v] and cnt[u, v] > 0: seen[u, v] = True; st.append((u, v))
        n = sum(cnt[a, b] for a, b in cells)
        a, b = max(cells, key=lambda c: cnt[c])
        ys, xs = np.nonzero(mv[a * S:(a + 1) * S, b * S:(b + 1) * S])
        cx, cy = int(b * S + xs.mean()), int(a * S + ys.mean())
        sl = (slice(max(cy - 38, 0), cy + 38), slice(max(cx - 38, 0), cx + 38))
        regs.append((n, cx, cy, int(far(T[sl], M[sl]).sum()), int(far(T[sl], K[sl]).sum()), len(cells)))
regs.sort(reverse=True)
print(f'moved px (> {dist}) outside spots: {int(mv.sum())} in {len(regs)} regions')
for n, cx, cy, tm, tk, nc in regs[:40]:
    print(f'  {n:6d} px  at {cx},{cy} ({nc} tiles)  vs today: master {tm}  tip {tk}  {"BETTER" if tk < tm else ("WORSE" if tk > tm else "same")}')
show = [r for r in regs if r[0] >= 20][:12]
if show:
    font = ImageFont.truetype('arial.ttf', 15); C = 160; Z = 240
    sh = Image.new('RGB', (3 * (Z + 6), len(show) * (Z + 22)), 'white'); d = ImageDraw.Draw(sh)
    for r, (n, cx, cy, tm, tk, nc) in enumerate(show):
        for c, A in enumerate((T, M, K)):
            x0, y0 = max(cx - C // 2, 0), max(cy - C // 2, 0)
            crop = A[y0:y0 + C, x0:x0 + C]; lo, hi = np.percentile(A, 1), np.percentile(A, 99.5)
            im = Image.fromarray(np.clip((crop - lo) * 255 / max(hi - lo, 1), 0, 255).astype('uint8')).resize((Z, Z), Image.NEAREST)
            sh.paste(im, (c * (Z + 6), r * (Z + 22) + 20))
        d.text((2, r * (Z + 22) + 2), f'{cx},{cy}: {n} px moved; vs today master {tm} tip {tk}  (today | master gf | tip)', fill=(0, 0, 0), font=font)
    sh.save(out)
    print(out)
