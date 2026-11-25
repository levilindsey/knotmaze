import sys
import numpy as np
from PIL import Image

# python dcdiff.py <dcf dir> [stops...] : where do a drag check's frame and its fresh-load reference differ by > 24?
d = sys.argv[1]
stops = sys.argv[2:] or ["0", "0.5", "1.2", "0.14"]
for s in stops:
    a = np.asarray(Image.open(f"{d}/drag_gfh_{s}.png").convert("RGB")).astype(int)
    b = np.asarray(Image.open(f"{d}/dragref_gfh_{s}.png").convert("RGB")).astype(int)
    if a.shape != b.shape:
        print(s, "shapes differ", a.shape, b.shape)
        continue
    m = np.abs(a - b).max(axis=2) > 24
    n = int(m.sum())
    if n == 0:
        print(f"stop {s}: 0 px ({a.shape[1]}x{a.shape[0]})")
        continue
    ys, xs = np.nonzero(m)
    print(f"stop {s}: {n} px, box x {xs.min()}..{xs.max()} y {ys.min()}..{ys.max()} ({xs.max() - xs.min() + 1}x{ys.max() - ys.min() + 1}), image {a.shape[1]}x{a.shape[0]}")
    # how many separate 64 px cells hold the difference
    cells = {(int(x) // 64, int(y) // 64) for x, y in zip(xs, ys)}
    print("   cells(64px):", len(cells), sorted(cells)[:12])
    x0, x1, y0, y1 = max(xs.min() - 40, 0), xs.max() + 40, max(ys.min() - 40, 0), ys.max() + 40
    out = f"{d}/diff_{s}.png"
    pa = Image.fromarray(a[y0:y1, x0:x1].astype("uint8"))
    pb = Image.fromarray(b[y0:y1, x0:x1].astype("uint8"))
    w, h = pa.size
    sc = max(1, min(6, 600 // max(w, h)))
    sheet = Image.new("RGB", (w * sc * 2 + 10, h * sc), (60, 60, 60))
    sheet.paste(pa.resize((w * sc, h * sc), Image.NEAREST), (0, 0))
    sheet.paste(pb.resize((w * sc, h * sc), Image.NEAREST), (w * sc + 10, 0))
    sheet.save(out)
    print("   wrote", out, "(left: dragged page, right: fresh load)")
