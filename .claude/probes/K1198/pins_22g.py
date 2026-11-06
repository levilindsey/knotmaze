# K1198 Run G (Muse batch 22, 22G) task 5 (last): the six join pins on v6.8.
# Pins og, oe, fo, fv, fr, fs (work28/ports_k990e.json "pins"). Each pin off =
# K1009_PINS={"<pair>":{}} (the 21G pin test's switch: load_ports merges it over
# the file pin); on = env unset. For each pin: the pair word and two words
# holding it (first holders in bench census order, work33/census_v68x.json) are
# censused both ways (kit census, stock font, v68_22g/base, ports M) into
# out_22g/pinwork_22g/, then sheeted (font | v6.8 with pin | without pin) as
# out_22g/pins_<pair>_22g.svg. One table, pins_22g.txt (+ pins_22g.json): each
# join's seams (gap u / angle deg / dk 1/u) and font distance, with and without.
# K926_FINAL_E=shear throughout. Kit inputs read in place.
# Run: <trace>\venv\Scripts\python.exe -I -B .claude\probes\K1198\pins_22g.py
import contextlib
import importlib
import io
import json
import os
import sys

T = r"C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace"
KDIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.join(T, "work26", "dbg"))
sys.path.insert(0, os.path.join(T, "work27", "dbg"))
os.environ["K926_FINAL_E"] = "shear"

import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k1027 as G  # noqa: E402
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
S = 0.24
PINS = ("og", "oe", "fo", "fv", "fr", "fs")
BENCH = os.path.join(T, "work33", "census_v68x.json")
BASE = os.path.join(KDIR, "v68_22g", "base")
PORTS = os.path.join(T, "work28", "ports_k990e.json")
STOCK = os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf")
OUTDIR = os.path.join(KDIR, "out_22g")
WORK = os.path.join(OUTDIR, "pinwork_22g")


def pin_words(bench_rows, pair):
    seen = []
    for r in bench_rows:
        if r.get("type") == "join" and r.get("pair") == pair and r["word"] not in seen:
            seen.append(r["word"])
    if pair in seen:
        seen.remove(pair)
        seen.insert(0, pair)
    return seen[:3], seen


def bz_d(bzs, P):
    s = "M " + P(*bzs[0][0])
    for b in bzs:
        s += " C " + " ".join(P(*q) for q in b[1:])
    return s


def main():
    os.makedirs(WORK, exist_ok=True)
    bench_rows = json.load(open(BENCH, encoding="utf-8"))["rows"]
    census = importlib.import_module("census_k1027")
    bodies = os.path.join(BASE, "bodies.json")
    params = os.path.join(BASE, "join_params.json")
    B = json.load(open(bodies))
    P = json.load(open(params))
    stock = Font(STOCK)
    table = ["K1198 22G six pins on v6.8 (work28/ports_k990e.json M, v68_22g/base, stock font): "
             "with pin vs K1009_PINS {\"<pair>\":{}}; seams gap u/angle deg/dk 1/u, font distance dmax u"]
    raw = {}
    for pair in PINS:
        words, all_holders = pin_words(bench_rows, pair)
        table.append(f" pin {pair}: sheet words {words} (holders in bench: {all_holders})")
        raw[pair] = dict(words=words, holders=all_holders)
        hands = {}
        for tag in ("on", "off"):
            if tag == "on":
                os.environ.pop("K1009_PINS", None)
            else:
                os.environ["K1009_PINS"] = json.dumps({pair: {}})
            txt = os.path.join(WORK, f"{pair}_{tag}.txt")
            js = os.path.join(WORK, f"{pair}_{tag}.json")
            with contextlib.redirect_stdout(io.StringIO()):
                census.run(STOCK, bodies, params, txt, js, gen="gen_k1027",
                           label=f"v6.8 (M) pin {pair} {tag} (22G)", words=words,
                           ports=PORTS, variant="M")
            rows = json.load(open(js, encoding="utf-8"))["rows"]
            ports = G.load_ports(PORTS, "M")
            hands[tag] = {w: G.assemble(stock, B, P, w, with_ref=True, B_ref=B, ports=ports)
                          for w in words}
            for w in words:
                for r in rows:
                    if r.get("type") == "join" and r.get("pair") == pair:
                        sm = "; ".join(f"{s['seam']}: {s['gap_u']:.4g}/{s['ang_deg']:.4g}/{s['dk_u']:.4g}"
                                       for s in r["seams"])
                        table.append(f"  {pair} {tag} in {w!r}: dmax {r['dist_max_u']:.4f} u kind {r['kind']} "
                                     f"src {r['src']} | {sm}")
                        raw[pair].setdefault(tag, {})[w] = dict(
                            dmax=r["dist_max_u"], kind=r["kind"], src=r["src"],
                            seams=[dict(gap_u=s["gap_u"], ang_deg=s["ang_deg"], dk_u=s["dk_u"])
                                   for s in r["seams"]])
        os.environ.pop("K1009_PINS", None)
        # sheet: font | with pin | without pin, one row per word
        cells = []
        for w in words:
            sh = K.shape(stock, w, 100, L.feats_for(w))
            polys = [p for p in (K.placed_polys(stock, g, 100, 0.0) for g in sh) if len(p)]
            gp = []
            for tag in ("on", "off"):
                A = hands[tag][w]
                gp += [np.asarray(j["gen"]) for j in A["joins"] + A["leads"] + A["tails"]]
                gp += [L.samples(s, 4.0)[0] for lt in A["letters"] for s in lt["strokes"]]
            allp = np.vstack([np.vstack(p) for p in polys]) if polys else np.zeros((1, 2))
            gp = np.vstack(gp)
            cells.append(dict(case=w, hands=hands, polys=polys,
                              xmin=min(allp[:, 0].min(), gp[:, 0].min()) - 60,
                              xmax=max(allp[:, 0].max(), gp[:, 0].max()) + 60))
        YTOP, YBOT = 1000.0, -560.0
        pad, lab, gap = 30.0, 200.0, 30.0
        row_h = (YTOP - YBOT) * S + 24.0
        cw = max(c["xmax"] - c["xmin"] for c in cells) * S
        cols = ["font", "v6.8 (with pin)", "v6.8 (without pin)"]
        W = 2 * pad + lab + 3 * cw + 2 * gap
        H = 150.0 + len(cells) * row_h
        title = f"K1198 Run G (22G): pin {pair} on v6.8 — font, with the pin, without it"
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.1f} {H:.1f}">',
               f"<title>{title}</title>", '<rect width="100%" height="100%" fill="white"/>',
               f'<text x="{pad}" y="34" font-family="sans-serif" font-size="22">{title}</text>',
               f'<text x="{pad}" y="62" font-family="sans-serif" font-size="15" fill="#444">Pin off = '
               f'K1009_PINS {{"{pair}":{{}}}}. Black bodies, red solved joins, blue preset joins, orange '
               f'leads/tails; font pale under the hand. 1 px = 1 u.</text>']
        for ci, nm in enumerate(cols):
            x = pad + lab + ci * (cw + gap)
            out.append(f'<text x="{x:.1f}" y="96" font-family="sans-serif" font-size="20" font-weight="bold">{nm}</text>')
        for ri, c in enumerate(cells):
            oy = 150.0 + ri * row_h + YTOP * S
            out.append(f'<g id="case-{ri + 1}">')
            out.append(f'<text x="{pad}" y="{oy - 60:.1f}" font-family="sans-serif" font-size="20" fill="#222">'
                       f'{c["case"]}</text>')
            for ci in range(3):
                ox = pad + lab + ci * (cw + gap) - c["xmin"] * S

                def Pt(x, y, ox=ox, oy=oy):
                    return f"{ox + x * S:.2f},{oy - y * S:.2f}"
                x0 = pad + lab + ci * (cw + gap)
                for yy, col in ((0.0, "#bfd0f0"), (500.0, "#c8e6c8")):
                    out.append(f'<line x1="{x0:.1f}" x2="{x0 + cw:.1f}" y1="{oy - yy * S:.2f}" '
                               f'y2="{oy - yy * S:.2f}" stroke="{col}" stroke-width="1"/>')
                d = " ".join("M " + " L ".join(Pt(x, y) for x, y in np.asarray(poly, float)) + " Z"
                             for g in c["polys"] for poly in g)
                out.append(f'<path d="{d}" fill="{"#bdbdbd" if ci == 0 else "#ececec"}" stroke="none"/>')
                if ci == 0:
                    continue
                A = c["hands"]["on" if ci == 1 else "off"][c["case"]]
                for lt in A["letters"]:
                    for st in lt["strokes"]:
                        out.append(f'<path d="{bz_d(st, Pt)}" fill="none" stroke="#000" stroke-width="2.2" '
                                   f'stroke-linecap="round" stroke-linejoin="round"/>')
                for nm, col in (("joins", None), ("leads", "#f97316"), ("tails", "#f97316")):
                    for j in A[nm]:
                        cc = col or ("#dc2626" if "port" in j else "#2563eb")
                        bz = [[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])]
                        out.append(f'<path d="{bz_d(bz, Pt)}" fill="none" stroke="{cc}" stroke-width="2.2" '
                                   f'stroke-linecap="round"/>')
            out.append("</g>")
        out.append("</svg>")
        svg = os.path.join(OUTDIR, f"pins_{pair}_22g.svg")
        with open(svg, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(out) + "\n")
        table.append(f" pin {pair}: sheet {svg}")
        print(f"pin {pair}: words {words} sheeted", flush=True)
    with open(os.path.join(OUTDIR, "pins_22g.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(table) + "\n")
    with open(os.path.join(OUTDIR, "pins_22g.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(raw, fh, indent=1, default=float)
    print("\n".join(table))


if __name__ == "__main__":
    main()
