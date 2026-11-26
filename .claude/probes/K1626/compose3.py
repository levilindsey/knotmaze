"""K1626 s2: the master | stage 1 | stage 2 picture from three cap3.mjs captures.

  python compose3.py <cap_master> <cap_s1> <cap_s2> <out.png>

Rows: each eye cap3.mjs shot (eye_<J..xX..>.png, a CLIP x CLIP CSS clip at
the canvas's own device scale, never upscaled), labelled with its opening
in thread widths measured on that capture's own state (the jeye.ts law:
first passes within 8 ctrl of the joint, the largest distance from one
arm's centre line to the other's). Last row: the three whole mazes.
Also writes <out>_eyes.json.
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

DIRS = sys.argv[1:4]
OUT = sys.argv[4]
NAMES = ["master", "stage 1", "stage 2"]
GAP = 8
MAXC = 8.0


def openings(S):
    pos = S["positions"]; chains = S["chains"]; tw = S["threadWidth"]

    def at(c, f):
        ch = chains[c]; n = len(ch); i0 = math.floor(f); t = f - i0
        a = ch[i0 % n]; b = ch[(i0 + 1) % n]
        return (pos[2*a]*(1-t) + pos[2*b]*t, pos[2*a+1]*(1-t) + pos[2*b+1]*t)

    slot = {}
    for c, ch in enumerate(chains):
        for s, p in enumerate(ch): slot[p] = (c, s)
    passes = {}
    for X in S["xs"]:
        for P in (X["over"], X["under"]): passes.setdefault(P["chain"], []).append(P["ctrl"])

    def clear(c, s, f):
        return not any(abs(v - f) > 1e-9 and (v - s) * (f - v) > 0 for v in passes.get(c, []))

    def line(c, s, f):
        return [at(c, s + (f - s) * k / 24) for k in range(25)]

    def to_line(p, Q):
        m = 1e18
        for i in range(len(Q) - 1):
            ux, uy = Q[i]; dx = Q[i+1][0] - ux; dy = Q[i+1][1] - uy; L = dx*dx + dy*dy
            t = 0 if L == 0 else max(0, min(1, ((p[0]-ux)*dx + (p[1]-uy)*dy) / L))
            m = min(m, math.hypot(p[0] - ux - t*dx, p[1] - uy - t*dy))
        return m

    out = {}
    for j, g in enumerate(S["fused"]):
        mem = [slot[m] for m in g]
        for x, X in enumerate(S["xs"]):
            ends = []
            for P in (X["over"], X["under"]):
                best = None
                for c, s in mem:
                    if c != P["chain"]: continue
                    if abs(P["ctrl"] - s) <= MAXC and (best is None or abs(P["ctrl"] - s) < abs(P["ctrl"] - best)): best = s
                ends.append(best)
            sa, sb = ends
            if sa is None or sb is None or (X["over"]["chain"] == X["under"]["chain"] and sa == sb): continue
            if not clear(X["over"]["chain"], sa, X["over"]["ctrl"]) or not clear(X["under"]["chain"], sb, X["under"]["ctrl"]): continue
            A = line(X["over"]["chain"], sa, X["over"]["ctrl"]); B = line(X["under"]["chain"], sb, X["under"]["ctrl"])
            o = max(max(to_line(p, B) for p in A), max(to_line(p, A) for p in B))
            out[f"J{j}xX{x}"] = o / tw
    return out


caps = [json.load(open(f"{d}/cap.json")) for d in DIRS]
eyes = [v["eye"] for v in caps[0]["views"]]
ops = [openings(S) for S in caps]
try:
    font = ImageFont.truetype("consola.ttf", 22); big = ImageFont.truetype("consola.ttf", 26)
except OSError:
    font = big = ImageFont.load_default()

def crop_of(d, S, e):
    """The eye shot's centre CLIP x CLIP CSS px (cap3 now shoots the whole
    viewport), and the fraction of the state's centre-line points inside the
    crop whose pixel is thread coloured (saturated): the check that the
    picture shows the place the page reported (about 0.2-0.4 is chance)."""
    im = Image.open(f"{d}/eye_{e}.png").convert("RGB")
    dsf = S.get("dsf", 2); clip = S.get("clip", 360)
    full_w, full_h = im.size
    q = next(q for q in S["views"] if q["eye"] == e); v = q["view"]
    # Centre the crop on where the eye's centre landed (the camera's range
    # may have kept it off the screen's centre), clamped inside the shot.
    cx = (q["centre"][0] * v["s"] + v["x"]) * dsf; cy = (q["centre"][1] * v["s"] + v["y"]) * dsf
    x0 = int(max(0, min(full_w - clip * dsf, round(cx - clip * dsf / 2))))
    y0 = int(max(0, min(full_h - clip * dsf, round(cy - clip * dsf / 2))))
    if full_w != clip * dsf:
        im = im.crop((x0, y0, x0 + clip * dsf, y0 + clip * dsf))
    pos = S["positions"]; px = im.load(); n = hit = 0
    for ch in S["chains"]:
        for p in ch:
            sx = (pos[2*p] * v["s"] + v["x"]) * dsf - x0; sy = (pos[2*p+1] * v["s"] + v["y"]) * dsf - y0
            if 4 <= sx < clip * dsf - 4 and 4 <= sy < clip * dsf - 4:
                r, g, b = px[int(sx), int(sy)]; n += 1; hit += max(r, g, b) - min(r, g, b) > 40
    return im, (hit / n if n else float("nan")), n


crops, onthread = [], {}
for e in eyes:
    row = []
    for k, d in enumerate(DIRS):
        im, f, n = crop_of(d, caps[k], e)
        row.append(im); onthread[f"{NAMES[k]} {e}"] = (round(f, 3), n)
    crops.append(row)
print("on-thread fraction of centre-line points (n):", onthread)
cw, ch = crops[0][0].size
wholes = [Image.open(f"{d}/whole.png").convert("RGB") for d in DIRS]
ww, wh = wholes[0].size
colw = max(cw, ww)
LBL = 40
W = 3 * colw + 4 * GAP
H = LBL + len(eyes) * (ch + LBL + GAP) + (wh + LBL + GAP) + GAP
sheet = Image.new("RGB", (W, H), (60, 60, 60))
d = ImageDraw.Draw(sheet)
for k, nm in enumerate(NAMES):
    d.text((GAP + k * (colw + GAP) + 6, 8), f"{nm}  ({caps[k].get('build', '')[:40]})", fill=(255, 255, 255), font=big)
y = LBL
for r, e in enumerate(eyes):
    for k in range(3):
        o = ops[k].get(e)
        txt = f"{e}  opening {o:.2f} w" if o is not None else f"{e}  (not a first-pass eye here)"
        d.text((GAP + k * (colw + GAP) + 6, y + 8), txt, fill=(255, 255, 160), font=font)
    y += LBL
    for k in range(3):
        sheet.paste(crops[r][k], (GAP + k * (colw + GAP), y))
    y += ch + GAP
for k in range(3):
    mn = min(ops[k].values()) if ops[k] else float("nan")
    d.text((GAP + k * (colw + GAP) + 6, y + 8), f"whole maze  eyes {len(ops[k])}  min {mn:.2f} w", fill=(255, 255, 160), font=font)
y += LBL
for k in range(3):
    sheet.paste(wholes[k], (GAP + k * (colw + GAP), y))
sheet.save(OUT)
rows = {e: [ops[k].get(e) for k in range(3)] for e in sorted(set().union(*[o.keys() for o in ops]))}
json.dump({"names": NAMES, "dirs": DIRS, "crop_px": [cw, ch], "whole_px": [ww, wh], "hashes": [c["hash"] for c in caps], "eyes": rows}, open(OUT.rsplit(".", 1)[0] + "_eyes.json", "w"), indent=1)
print(f"wrote {OUT} {W}x{H}, crops {cw}x{ch}")
for e, v in rows.items():
    print(e.ljust(12), "  ".join("-" if x is None else f"{x:.2f}" for x in v))
