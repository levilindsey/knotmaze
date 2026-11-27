"""K1626 s4: the master | yours picture from cap4.mjs captures (compose3.py for N columns).

  python compose4.py <capDir>=<name> [<capDir>=<name> ...] <out.png>

Rows: each shot cap4.mjs took (eye_<name>.png, the whole viewport at the
canvas's own device scale, never upscaled; cropped here to CLIP x CLIP CSS px
around where the eye's centre landed), labelled for an eye with its opening
in thread widths (compose3.py's law: first passes within 8 ctrl of the joint,
the largest distance from one arm's centre line to the other's) and the
tightest turn at one particle of its two arms (s4_meas.py's law: interior
particles, joint and pass excluded, seams skipped), each measured on that
capture's own state. A world-point row ('@name:x:y' in cap4's EYES) is only
labelled. Last row: the whole mazes. Also writes <out>_eyes.json.
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

COLS = [a.split("=", 1) for a in sys.argv[1:-1]]
DIRS = [c[0] for c in COLS]
NAMES = [c[1] for c in COLS]
OUT = sys.argv[-1]
GAP = 8
MAXC = 8.0


def measure(S):
    """{eye: (opening w, tightest arm turn deg)} for every first-pass eye."""
    pos = S["positions"]; chains = S["chains"]; tw = S["threadWidth"]; brk = S["breakAfter"]
    P = lambda i: (pos[2*i], pos[2*i+1])

    def at(c, f):
        ch = chains[c]; n = len(ch); i0 = math.floor(f); t = f - i0
        a = ch[i0 % n]; b = ch[(i0 + 1) % n]
        return (pos[2*a]*(1-t) + pos[2*b]*t, pos[2*a+1]*(1-t) + pos[2*b+1]*t)

    def turn(c, k):
        ch = chains[c]; n = len(ch)
        if brk[c] >= 0 and (k % n == brk[c] or (k - 1) % n == brk[c]):
            return None
        p0, p1, p2 = P(ch[(k-1) % n]), P(ch[k % n]), P(ch[(k+1) % n])
        v1 = (p1[0]-p0[0], p1[1]-p0[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
        n1, n2 = math.hypot(*v1), math.hypot(*v2)
        if n1 < 1e-9 or n2 < 1e-9:
            return None
        return math.degrees(math.acos(max(-1, min(1, (v1[0]*v2[0] + v1[1]*v2[1]) / (n1*n2)))))

    slot = {}
    for c, ch in enumerate(chains):
        for s, p in enumerate(ch): slot[p] = (c, s)
    passes = {}
    for X in S["xs"]:
        for Q in (X["over"], X["under"]): passes.setdefault(Q["chain"], []).append(Q["ctrl"])

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
            for Q in (X["over"], X["under"]):
                best = None
                for c, s in mem:
                    if c != Q["chain"]: continue
                    if abs(Q["ctrl"] - s) <= MAXC and (best is None or abs(Q["ctrl"] - s) < abs(Q["ctrl"] - best)): best = s
                ends.append(best)
            sa, sb = ends
            if sa is None or sb is None or (X["over"]["chain"] == X["under"]["chain"] and sa == sb): continue
            if not clear(X["over"]["chain"], sa, X["over"]["ctrl"]) or not clear(X["under"]["chain"], sb, X["under"]["ctrl"]): continue
            A = line(X["over"]["chain"], sa, X["over"]["ctrl"]); B = line(X["under"]["chain"], sb, X["under"]["ctrl"])
            o = max(max(to_line(p, B) for p in A), max(to_line(p, A) for p in B))
            mt = 0.0
            for c, s, f in ((X["over"]["chain"], sa, X["over"]["ctrl"]), (X["under"]["chain"], sb, X["under"]["ctrl"])):
                d = 1 if f > s else -1
                k = s + d
                while (k - f) * d < 0:
                    t = turn(c, k)
                    if t is not None: mt = max(mt, t)
                    k += d
            out[f"J{j}xX{x}"] = (o / tw, mt)
    return out


caps = [json.load(open(f"{d}/cap.json")) for d in DIRS]
eyes = [v["eye"] for v in caps[0]["views"]]
ops = [measure(S) for S in caps]
try:
    font = ImageFont.truetype("consola.ttf", 22); big = ImageFont.truetype("consola.ttf", 26)
except OSError:
    font = big = ImageFont.load_default()


def crop_of(d, S, e):
    """The shot's CLIP x CLIP CSS px around where the row's centre landed, and
    the fraction of the state's centre-line points inside the crop whose pixel
    is thread coloured (the check that the picture shows the place the page
    reported; about 0.2-0.4 is chance)."""
    im = Image.open(f"{d}/eye_{e}.png").convert("RGB")
    dsf = S.get("dsf", 2); clip = S.get("clip", 360)
    full_w, full_h = im.size
    q = next(q for q in S["views"] if q["eye"] == e); v = q["view"]
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


NC = len(DIRS)
crops, onthread = [], {}
for e in eyes:
    row = []
    for k, d in enumerate(DIRS):
        im, f, n = crop_of(d, caps[k], e)
        row.append(im); onthread[f"{NAMES[k]} {e}"] = (round(f, 3), n)
    crops.append(row)
print("on-thread fraction of centre-line points (n):", onthread)
cw, chh = crops[0][0].size
wholes = [Image.open(f"{d}/whole.png").convert("RGB") for d in DIRS]
ww, wh = wholes[0].size
colw = max(cw, ww)
LBL = 40
W = NC * colw + (NC + 1) * GAP
H = LBL + len(eyes) * (chh + LBL + GAP) + (wh + LBL + GAP) + GAP
sheet = Image.new("RGB", (W, H), (60, 60, 60))
d = ImageDraw.Draw(sheet)
for k, nm in enumerate(NAMES):
    d.text((GAP + k * (colw + GAP) + 6, 8), f"{nm}  ({caps[k].get('build', '')[:30]})", fill=(255, 255, 255), font=big)
y = LBL
for r, e in enumerate(eyes):
    q = next(q for q in caps[0]["views"] if q["eye"] == e)
    for k in range(NC):
        o = ops[k].get(e)
        if o is not None:
            txt = f"{e}  open {o[0]:.2f} w  turn {o[1]:.0f} deg"
        elif e.startswith("J"):
            txt = f"{e}  (not a first-pass eye here)"
        else:
            txt = f"{e} spot, world ({q['centre'][0]:.2f}, {q['centre'][1]:.2f})"
        d.text((GAP + k * (colw + GAP) + 6, y + 8), txt, fill=(255, 255, 160), font=font)
    y += LBL
    for k in range(NC):
        sheet.paste(crops[r][k], (GAP + k * (colw + GAP), y))
    y += chh + GAP
for k in range(NC):
    mn = min(v[0] for v in ops[k].values()) if ops[k] else float("nan")
    d.text((GAP + k * (colw + GAP) + 6, y + 8), f"whole maze  eyes {len(ops[k])}  min {mn:.2f} w", fill=(255, 255, 160), font=font)
y += LBL
for k in range(NC):
    sheet.paste(wholes[k], (GAP + k * (colw + GAP), y))
sheet.save(OUT)
rows = {e: [ops[k].get(e) for k in range(NC)] for e in sorted(set().union(*[o.keys() for o in ops]))}
json.dump({"names": NAMES, "dirs": DIRS, "crop_px": [cw, chh], "whole_px": [ww, wh], "hashes": [c["hash"] for c in caps],
           "onthread": onthread, "eyes": rows}, open(OUT.rsplit(".", 1)[0] + "_eyes.json", "w"), indent=1)
print(f"wrote {OUT} {W}x{H}, crops {cw}x{chh}")
for e in eyes:
    print(e.ljust(12), "  |  ".join("-" if ops[k].get(e) is None else f"{ops[k][e][0]:.2f} w {ops[k][e][1]:5.1f} deg" for k in range(NC)))
