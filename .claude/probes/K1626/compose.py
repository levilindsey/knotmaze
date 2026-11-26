"""K1626: the master | mine picture from two cap.mjs captures of Levi's link.

  python compose.py <cap_master_dir> <cap_mine_dir> <out.png> [levi_rel_x,levi_rel_y]

Places: the junction nearest Levi's place (relative screen point, default
0.718,0.47 from his phone picture) and the five junctions with the closest
crossing along an arm on master (distinct junctions). Each crop is the
same junction in both captures, centred on the junction, at 10x the
device pixels of a 1x capture (a DSF 4 capture upscaled 2.5x). Below:
the whole maze side by side. Also writes <out>_places.json.
"""
import json, math, sys
from PIL import Image, ImageDraw, ImageFont

A_DIR, B_DIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
LEVI = [0.718, 0.47] if len(sys.argv) <= 4 or sys.argv[4].startswith("world:") else [float(v) for v in sys.argv[4].split(",")]
ZOOM_1X = 10.0      # final px per CSS px
HALF_W = 5.0        # crop half-size in thread widths
MAX_ARM_CTRL = 6.0  # a crossing counts when one pass is within this ctrl of a joint member

def load(d):
    S = json.load(open(f"{d}/gf_load1.json"))
    img = Image.open(f"{d}/gf_load1.png").convert("RGB")
    return S, img

def geometry(S):
    pos = S["positions"]; chains = S["chains"]; tw = S["threadWidth"]
    def at(c, f):
        ch = chains[c]; n = len(ch); i0 = math.floor(f); t = f - i0
        a = ch[i0 % n]; b = ch[(i0 + 1) % n]
        return (pos[2*a]*(1-t) + pos[2*b]*t, pos[2*a+1]*(1-t) + pos[2*b+1]*t)
    slot = {}
    for c, ch in enumerate(chains):
        for s, p in enumerate(ch): slot[p] = (c, s)
    juncs = []
    for g in S["fused"]:
        x = sum(pos[2*m] for m in g) / len(g); y = sum(pos[2*m+1] for m in g) / len(g)
        juncs.append({"x": x, "y": y, "members": [slot[m] for m in g]})
    xs = []
    for X in S["xs"]:
        a = at(X["over"]["chain"], X["over"]["ctrl"]); b = at(X["under"]["chain"], X["under"]["ctrl"])
        xs.append({"x": (a[0]+b[0])/2, "y": (a[1]+b[1])/2, "passes": [X["over"], X["under"]]})
    def nearest(ji):
        J = juncs[ji]; best = (math.inf, -1)
        for xi, X in enumerate(xs):
            ok = False
            for P in X["passes"]:
                for (c, s) in J["members"]:
                    if c != P["chain"]: continue
                    n = len(chains[c]); dc = abs(P["ctrl"] - s)
                    if S["breakAfter"][c] < 0: dc = min(dc, n - dc)
                    if dc <= MAX_ARM_CTRL: ok = True
            if not ok: continue
            d = math.hypot(X["x"] - J["x"], X["y"] - J["y"]) / tw
            if d < best[0]: best = (d, xi)
        return best
    return juncs, xs, nearest, tw

def to_dev(S, x, y):
    w = S["wt"]; r = S["dpr"]; cv = S["canvases"][0]
    return ((w["a"]*x + w["c"]*y + w["tx"] + cv["x"]) * r, (w["b"]*x + w["d"]*y + w["ty"] + cv["y"]) * r)

SA, IA = load(A_DIR); SB, IB = load(B_DIR)
JA, XA, nearA, tw = geometry(SA); JB, XB, nearB, _ = geometry(SB)
assert len(JA) == len(JB) and len(XA) == len(XB), "the two captures are not one design"

# Levi's place: the junction nearest his point on master, a world point
# (`world:x,y`, from match_levi.py: his picture is zoomed in) or a screen
# point relative to the capture.
if len(sys.argv) > 4 and sys.argv[4].startswith("world:"):
    wx, wy = (float(v) for v in sys.argv[4][6:].split(","))
    lx, ly = to_dev(SA, wx, wy)
else:
    lx, ly = LEVI[0] * IA.width, LEVI[1] * IA.height
levi = min(range(len(JA)), key=lambda j: math.hypot(*(a - b for a, b in zip(to_dev(SA, JA[j]["x"], JA[j]["y"]), (lx, ly)))))
order = sorted((j for j in range(len(JA)) if j != levi), key=lambda j: nearA(j)[0])
places = [("Levi's place", levi)] + [(f"#{k+1} closest", j) for k, j in enumerate(order[:5])]

font = None
for f in ["arial.ttf", "DejaVuSans.ttf"]:
    try: font = ImageFont.truetype(f, 26); break
    except OSError: pass
font = font or ImageFont.load_default()

up = ZOOM_1X / SA["dpr"]
tiles = []; meta = []
for label, j in places:
    dA, xA = nearA(j); dB, xB = nearB(j)
    row = []
    for S, I, J, d in ((SA, IA, JA, dA), (SB, IB, JB, dB)):
        cx, cy = to_dev(S, J[j]["x"], J[j]["y"])
        half = abs(S["wt"]["a"]) * S["dpr"] * HALF_W * tw
        box = (round(cx - half), round(cy - half), round(cx + half), round(cy + half))
        crop = I.crop(box)
        crop = crop.resize((round(crop.width * up), round(crop.height * up)), Image.LANCZOS)
        row.append(crop)
    meta.append({"label": label, "junction": j, "master_w": round(dA, 2), "mine_w": round(dB, 2),
                 "crossing": xA, "world": [round(JA[j]["x"], 2), round(JA[j]["y"], 2)]})
    note = sys.argv[5] if label == "Levi's place" and len(sys.argv) > 5 else ""  # e.g. eyes.py's opening
    tiles.append((f"{label}: J{j}{note}" if note else f"{label}: J{j}  master {dA:.2f}w  |  mine {dB:.2f}w", row))

cw = max(t[1][0].width for t in tiles); ch = max(t[1][0].height for t in tiles)
GAP = 16; HEAD = 40; PER_ROW = 2
pair_w = 2 * cw + GAP
rows = math.ceil(len(tiles) / PER_ROW)
grid_w = PER_ROW * pair_w + (PER_ROW - 1) * 3 * GAP
grid_h = rows * (ch + HEAD + GAP)
# Whole maze side by side at DSF 2 (half the capture's device px).
WS = 0.5
wa = IA.resize((round(IA.width * WS), round(IA.height * WS)), Image.LANCZOS)
wb = IB.resize((round(IB.width * WS), round(IB.height * WS)), Image.LANCZOS)
whole_w = wa.width + GAP + wb.width
W = max(grid_w, whole_w) + 2 * GAP
H = 60 + grid_h + HEAD + wa.height + 2 * GAP
canvas = Image.new("RGB", (W, H), (250, 250, 250))
dr = ImageDraw.Draw(canvas)
dr.text((GAP, 14), "K1626 s1  master (left of each pair) | mine (right)   ?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1, settled, real time; crops 10x of 1x, distance = junction to nearest crossing on an arm, in thread widths", fill=(0, 0, 0), font=font)
for k, (text, (ca, cb)) in enumerate(tiles):
    r, c = divmod(k, PER_ROW)
    x0 = GAP + c * (pair_w + 3 * GAP); y0 = 60 + r * (ch + HEAD + GAP)
    dr.text((x0, y0 + 6), text, fill=(0, 0, 0), font=font)
    canvas.paste(ca, (x0, y0 + HEAD)); canvas.paste(cb, (x0 + cw + GAP, y0 + HEAD))
y0 = 60 + grid_h
dr.text((GAP, y0 + 6), "Whole maze: master | mine", fill=(0, 0, 0), font=font)
canvas.paste(wa, (GAP, y0 + HEAD)); canvas.paste(wb, (GAP + wa.width + GAP, y0 + HEAD))
canvas.save(OUT)
for k, (text, (ca, cb)) in enumerate(tiles):
    pair = Image.new("RGB", (ca.width + GAP + cb.width, max(ca.height, cb.height)), (250, 250, 250))
    pair.paste(ca, (0, 0)); pair.paste(cb, (ca.width + GAP, 0))
    pair.save(OUT.replace(".png", f"_place{k}.png"))
json.dump({"places": meta, "tw": tw, "levi_dev_px": [lx, ly]}, open(OUT.replace(".png", "_places.json"), "w"), indent=1)
print(json.dumps(meta, indent=1)); print(canvas.size)
