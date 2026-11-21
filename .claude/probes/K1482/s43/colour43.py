# K1482 s43: colour the mirror's fields (ink, cov, chain from pic43.ts's .f32 dumps) so they read like the render.
# Colours are LEARNED from the switch-off fields against the true capture, then the SAME colouring renders every
# variant (off and each radius):
#   ground  = the capture where off cov ~ 0 and ink ~ 0, filled outward to the nearest such pixel
#   fill[c] = the capture where off cov ~ 1, ink ~ 0 and the label is chain c, filled likewise (else the mean fill)
#   inkcol  = the capture's median where off ink ~ 1
#   pixel   = lerp(lerp(ground, fill[label], cov), inkcol, ink)
# Prints the method check: |before - capture| over the window (mean, px > 24 levels).
#   python colour43.py <cap.png> <dir> <name> <x0> <y0> <N> <variant...>   (variant "off" first; writes <dir>/<name>_<v>.png)
import sys
import numpy as np
from PIL import Image


def load(d, name, v, x0, y0, n):
    a = np.fromfile(f"{d}/{name}_{v}_{x0}_{y0}_{n}.f32", dtype=np.float32).reshape(n, n, 3)
    return a[..., 0], a[..., 1], np.rint(a[..., 2]).astype(int)


def nearfill(img, known):
    out = img.astype(np.float64).copy(); k = known.copy()
    out[~k] = 0
    for _ in range(4 * max(img.shape[:2])):
        if k.all():
            break
        acc = np.zeros_like(out); cnt = np.zeros(k.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sk = np.roll(k, (dy, dx), (0, 1)); so = np.roll(out, (dy, dx), (0, 1))
            acc += so * sk[..., None]; cnt += sk
        new = (~k) & (cnt > 0)
        if not new.any():
            break
        out[new] = acc[new] / cnt[new][:, None]; k = k | new
    return out, k


class Colourer:
    def __init__(self, cap, off):
        ink, cov, ch = off
        self.cap = cap.astype(np.float64)
        bgk = (cov < 0.02) & (ink < 0.02)
        self.bg, ok = nearfill(self.cap, bgk)
        if not ok.all():
            self.bg[~ok] = np.median(self.cap[bgk], 0) if bgk.any() else 255
        fk = (cov > 0.98) & (ink < 0.02)
        self.meanfill = np.median(self.cap[fk], 0) if fk.any() else np.array([128.0, 128, 128])
        self.fill = {}
        for c in np.unique(ch[fk]):
            m, okc = nearfill(self.cap, fk & (ch == c)); m[~okc] = self.meanfill; self.fill[int(c)] = m
        ik = ink > 0.98
        self.inkcol = np.median(self.cap[ik], 0) if ik.any() else self.cap.reshape(-1, 3).min(0)

    def render(self, f):
        ink, cov, ch = f
        fill = np.broadcast_to(self.meanfill, self.cap.shape).copy()
        for c, m in self.fill.items():
            sel = ch == c; fill[sel] = m[sel]
        base = self.bg + (fill - self.bg) * cov[..., None]
        out = base + (self.inkcol - base) * ink[..., None]
        return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def main():
    capP, d, name, x0, y0, n = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
    vs = sys.argv[7:]
    cap = np.asarray(Image.open(capP).convert("RGB"))[y0:y0 + n, x0:x0 + n]
    C = Colourer(cap, load(d, name, "off", x0, y0, n))
    for v in vs:
        img = C.render(load(d, name, v, x0, y0, n))
        Image.fromarray(img).save(f"{d}/{name}_{v}.png")
        dd = np.abs(img.astype(int) - cap.astype(int)).max(2)
        print(f"{name} {v}: |colour - capture| mean {dd.mean():.2f}, px > 24: {(dd > 24).sum()}, max {dd.max()}")


if __name__ == "__main__":
    main()
