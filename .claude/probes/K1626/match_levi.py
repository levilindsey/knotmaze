"""K1626: find Levi's phone view in a capture by matching thread masks.

  python match_levi.py <cap_dir> <levi_phone.png> <out.png>

Thread mask = saturation (max - min channel) > 40, blurred; normalized
cross-correlation (FFT, integral-image normalization) of a chrome-free band
of his picture over the capture at a range of scales. Prints the best
scales and places in world coordinates; writes his band beside the best
match.
"""
import json, sys
import numpy as np
from PIL import Image, ImageFilter

D, LEVI, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
S = json.load(open(f"{D}/gf_load1.json"))
cap = Image.open(f"{D}/gf_load1.png").convert("RGB")
w = S["wt"]; r = S["dpr"]; cv = S["canvases"][0]
DS = 2  # capture downsample
def mask(im):
    a = np.asarray(im).astype(np.float32)
    m = ((a.max(axis=2) - a.min(axis=2)) > 40).astype(np.float32)
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
capS = cap.resize((cap.width // DS, cap.height // DS), Image.LANCZOS)
M = mask(capS)
M[: int(140 * r / DS), :] = 0
levi = Image.open(LEVI).convert("RGB")
BAND = (0, 560, 1080, 1850)  # phone px: below the chrome, above the pad
band = levi.crop(BAND)
H, W = M.shape
F = np.fft.rfft2(M)
ii = np.pad(M, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
ii2 = np.pad(M * M, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
best = []
for s in np.arange(3.6, 6.6, 0.1):  # Levi px per capture device px
    f = s * DS
    tw_, th_ = round(band.width / f), round(band.height / f)
    T = mask(band.resize((tw_, th_), Image.LANCZOS))
    T0 = T - T.mean(); n = T.size
    Tp = np.zeros_like(M); Tp[:th_, :tw_] = T0
    corr = np.fft.irfft2(F * np.conj(np.fft.rfft2(Tp)), s=M.shape)
    hv, wv = H - th_, W - tw_
    sm = ii[th_:th_ + hv, tw_:tw_ + wv] - ii[:hv, tw_:tw_ + wv] - ii[th_:th_ + hv, :wv] + ii[:hv, :wv]
    sm2 = ii2[th_:th_ + hv, tw_:tw_ + wv] - ii2[:hv, tw_:tw_ + wv] - ii2[th_:th_ + hv, :wv] + ii2[:hv, :wv]
    var = np.maximum(sm2 - sm * sm / n, 1e-6)
    ncc = corr[:hv, :wv] / np.sqrt(var * (T0 * T0).sum())
    ncc[var < 0.05 * n] = 0  # blank background: no match
    k = np.argmax(ncc); y, x = divmod(k, wv)
    best.append((float(ncc[y, x]), float(s), int(x), int(y), tw_, th_))
best.sort(reverse=True)
for b in best[:6]:
    v, s, x, y, tw_, th_ = b
    cxp, cyp = (x + tw_ / 2) * DS, (y + th_ / 2) * DS
    wx = (cxp / r - cv["x"] - w["tx"]) / w["a"]; wy = (cyp / r - cv["y"] - w["ty"]) / w["d"]
    print(f"ncc {v:.3f} scale {s:.1f} centre dev ({cxp:.0f},{cyp:.0f}) world ({wx:.2f},{wy:.2f})")
v, s, x, y, tw_, th_ = best[0]
m = cap.crop((x * DS, y * DS, (x + tw_) * DS, (y + th_) * DS)).resize(band.size, Image.LANCZOS)
out = Image.new("RGB", (band.width * 2 + 20, band.height), (255, 255, 255))
out.paste(band, (0, 0)); out.paste(m, (band.width + 20, 0))
out.resize((out.width // 2, out.height // 2)).save(OUT)
s_dev = best[0][1]  # Levi px per device px
json.dump({"ncc": v, "levi_px_per_dev_px": s_dev, "box_dev": [x * DS, y * DS, (x + tw_) * DS, (y + th_) * DS], "band": BAND},
          open(OUT.replace(".png", ".json"), "w"))
