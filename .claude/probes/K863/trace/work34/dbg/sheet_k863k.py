# K863 J3k: copy of work27/dbg/sheet_k1027.py (J3d's, untouched) by work34/dbg/mk_tools_k863k.py: it draws with
# gen_k863k (gen_k1027 plus the word-end forms a join_params file names under "k863k"). J3d's header:
# K1027 (J3d): copy of work26/dbg/sheet_k1009c.py by work27/dbg/mk_tools_k1027.py; it draws with gen_k1027.
"""K1009b (J3b, v6.4) copy of tools/sheet_k1009.py (untouched), made by work24/dbg/mk_sheet_k1009b.py: gen_k1009b;
a column may name its own ports file (--col <name>=<build dir>|ports|<variant>|<ports.json>); the report adds each
solve's status, the cusp exit's kL and overstroke band, the corner's angle and kR, and both font distances (K1028's
own ends, and the build's entry frame); the solve log has no times.
K1009 (J3a, v6.1): comparison sheets as SVG (no raster, no chart): one row per case, one column per build.

Run from the trace dir:
  venv\\Scripts\\python.exe -I tools\\sheet_k1009.py <out.svg> <title> <cases> --col <name>=<build dir>|presets
      [--col <name>=<build dir>|ports|<variant> ...] [--ports work21\\ports_k1009.json] [--report <out.txt>]
      [--sidecar <out.json>]
<cases>: comma-separated words; a case may pin attach points for one of its pairs: ot@ot:entry_u=27.85 (several pins
joined with +, e.g. knotmaze@ot:entry_u=0+ot:exit_u=3). The first column is always the font (wght 100 fill). Each build
column draws the generated word over a pale copy of the font: bodies black, solved joins red, preset joins blue, lead-ins
and tails orange. The report lists every join of every cell (solved: attach points and the solve's measures; preset:
its source); the sidecar JSON holds each cell's per-word sidecar (gen_k1009.sidecar)."""
import json
import os
import sys

T = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(T, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(T, "work27", "dbg"))  # K863 J3k: gen_k1027 from J3d's folder
import numpy as np  # noqa: E402
import k886lib as L  # noqa: E402
import gen_k863k as G  # noqa: E402  (K863 J3k)
import fewnode_k930 as FN  # noqa: E402
from k863lib import Font  # noqa: E402

K = L.K
S = 0.24
YTOP, YBOT = 1000.0, -560.0


def parse_case(c):
    if "@" not in c:
        return c, {}
    w, rest = c.split("@", 1)
    pins = {}
    for part in rest.split("+"):
        pair, kv = part.split(":", 1)
        k, v = kv.split("=")
        pins.setdefault(pair, {})[k] = float(v)
    return w, pins


def bz_d(bzs, P):
    s = "M " + P(*bzs[0][0])
    for b in bzs:
        s += " C " + " ".join(P(*q) for q in b[1:])
    return s


def main():
    a = sys.argv[1:]

    def opt(name, default=None, multi=False):
        nonlocal a
        vals = []
        while name in a:
            i = a.index(name)
            vals.append(a[i + 1])
            a = a[:i] + a[i + 2:]
        return vals if multi else (vals[-1] if vals else default)
    cols = opt("--col", multi=True)
    ports_path = opt("--ports", os.path.join(T, "work21", "ports_k1009.json"))
    rep_path = opt("--report")
    side_path = opt("--sidecar")
    ink = opt("--ink")       # J3k: the pen's width in u: each build's ink drawn translucent under its centrelines
    ink = float(ink) if ink else None
    out_svg, title, cases = a[0], a[1], [c for c in a[2].split(",") if c]
    font = Font(os.path.join(T, "font", "PlaywriteUSTrad[wght].ttf"))
    builds = []
    for c in cols:
        name, spec = c.split("=", 1)
        parts = spec.split("|")
        bd = parts[0] if os.path.isabs(parts[0]) else os.path.join(T, parts[0])
        B = json.load(open(os.path.join(bd, "bodies.json")))
        P = json.load(open(os.path.join(bd, "join_params.json")))
        mode = parts[1]
        variant = parts[2] if len(parts) > 2 else "A"
        pp = parts[3] if len(parts) > 3 else None
        if pp is not None and not os.path.isabs(pp):
            pp = os.path.join(T, pp)
        builds.append(dict(name=name, B=B, P=P, mode=mode, variant=variant, dir=bd, ports=pp))
    cells, report, sidecars = [], [], {}
    for case in cases:
        w, pins = parse_case(case)
        row = []
        for b in builds:
            if b["mode"] == "presets":
                A = G.G0.assemble(font, b["B"], b["P"], w, with_ref=True, B_ref=b["B"])
            else:
                ports = G.load_ports(b["ports"] or ports_path, b["variant"])
                ports["pins"].update(pins)
                A = G.assemble(font, b["B"], b["P"], w, with_ref=True, B_ref=b["B"], ports=ports)
            row.append(A)
            sidecars[f"{case} | {b['name']}"] = G.sidecar(A)
            for j in A["joins"]:
                if "port" in j:
                    p, s_ = j["port"], j["port"]["solve"]
                    side = "-" if s_["side_min_u"] is None else f"{s_['side_min_u']:.2f}"
                    report.append(f"{case:22s} {b['name']:5s} {j['L']}{j['R']} solved: exit {p['exit']['from_end_u']:.2f} u "
                                  f"from {j['L']}'s end, entry {p['entry']['kind']} at {p['entry']['s_u']:.2f} u "
                                  f"(retrace {p['entry']['retrace']}); J {s_['J']:.3g} (conn {s_['Jc']:.2g}, L {s_['JL']:.2g}, R {s_['JR']:.2g}) Js {s_['Js']:.3g} conn {s_['conn_len_u']:.0f} u window {s_['window_len_u']:.0f} u pen {s_['pen']:.2g} kmax "
                                  f"{s_['kmax_u']:.3f}/u speed {s_['speed_ratio']:.2f} cross {s_['crossings']} (allowed {s_['crossings_allowed']}) side "
                                  f"{side} ymin {s_['ymin_u']:.1f} u; dist to font {j['dist_u']:.2f} u (own ends), "
                                  f"{j.get('dist_frame_u', float('nan')):.2f} u (entry frame); status {s_.get('status')} "
                                  f"nfev {s_['nfev']}/{s_.get('maxfev')}"
                                  + (f"; cusp exit kL {s_['kL_u']:.4f}/u, overstroke in band {s_['over_band_u']:.2f} u "
                                     f"(max {s_['over_dmax_u']:.3f} u)" if s_.get("kL_u") is not None else "")
                                  + (f"; corner at {s_['th_deg']:.2f} deg, kR {s_['kR_u']:.4f}/u"
                                     if s_.get("th_deg") is not None else ""))
                else:
                    report.append(f"{case:22s} {b['name']:5s} {j['L']}{j['R']} preset {j['src']}; dist to font "
                                  f"{j['dist_u']:.2f} u")
        polys = [K.placed_polys(font, g, 100, 0.0) for g in row[0]["shaping"]]
        polys = [p for p in polys if len(p)]
        allp = np.vstack([np.vstack(p) for p in polys])
        gp = []
        for A in row:
            gp += [np.asarray(j["gen"]) for j in A["joins"] + A["leads"] + A["tails"]]
            gp += [L.samples(s, 4.0)[0] for lt in A["letters"] for s in lt["strokes"]]
        gp = np.vstack(gp)
        xmin = min(allp[:, 0].min(), gp[:, 0].min()) - 60
        xmax = max(allp[:, 0].max(), gp[:, 0].max()) + 60
        cells.append(dict(case=case, row=row, polys=polys, xmin=xmin, xmax=xmax))
    pad, lab, gap = 30.0, 200.0, 30.0
    row_h = (YTOP - YBOT) * S + 24.0
    cw = max(c["xmax"] - c["xmin"] for c in cells) * S
    ncol = 1 + len(builds)
    W = 2 * pad + lab + ncol * cw + (ncol - 1) * gap
    H = 110.0 + len(cells) * row_h
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.1f} {H:.1f}">',
           f"<title>{title}</title>", '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="{pad}" y="34" font-family="sans-serif" font-size="22">{title}</text>',
           f'<text x="{pad}" y="62" font-family="sans-serif" font-size="15" fill="#444">Columns: the font (wght 100), then '
           f'each build over a pale copy of the font. Black bodies, red solved joins, blue preset joins, orange lead-ins '
           f'and tails. Units: 1 px = 1 u (x-height 120 u).'
           + (f' Translucent grey under the centrelines: the ink at the pen\'s width ({ink:g} u).' if ink else '')
           + '</text>']
    for ci, nm in enumerate(["font"] + [b["name"] for b in builds]):
        x = pad + lab + ci * (cw + gap)
        out.append(f'<text x="{x:.1f}" y="96" font-family="sans-serif" font-size="20" font-weight="bold">{nm}</text>')
    for ri, c in enumerate(cells):
        oy = 110.0 + ri * row_h + YTOP * S
        out.append(f'<g id="case-{ri + 1}">')
        out.append(f'<text x="{pad}" y="{oy - 60:.1f}" font-family="sans-serif" font-size="20" fill="#222">'
                   f'{c["case"]}</text>')
        for ci in range(ncol):
            ox = pad + lab + ci * (cw + gap) - c["xmin"] * S

            def P(x, y, ox=ox, oy=oy):
                return f"{ox + x * S:.2f},{oy - y * S:.2f}"
            x0 = pad + lab + ci * (cw + gap)
            for yy, col in ((0.0, "#bfd0f0"), (500.0, "#c8e6c8")):
                out.append(f'<line x1="{x0:.1f}" x2="{x0 + cw:.1f}" y1="{oy - yy * S:.2f}" y2="{oy - yy * S:.2f}" '
                           f'stroke="{col}" stroke-width="1"/>')
            d = " ".join("M " + " L ".join(P(x, y) for x, y in np.asarray(poly, float)) + " Z"
                         for g in c["polys"] for poly in g)
            out.append(f'<path d="{d}" fill="{"#bdbdbd" if ci == 0 else "#ececec"}" stroke="none"/>')
            if ci == 0:
                continue
            A = c["row"][ci - 1]
            if ink:     # one group at uniform opacity, so the pen's overlaps (a dot's loop) read as one ink
                ds = [bz_d(st, P) for lt in A["letters"] for st in lt["strokes"]]
                ds += [bz_d([[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])], P)
                       for nm in ("joins", "leads", "tails") for j in A[nm]]
                out.append('<g opacity="0.3">' + "".join(
                    f'<path d="{d_}" fill="none" stroke="#000" stroke-width="{ink:.2f}" stroke-linecap="round" '
                    f'stroke-linejoin="round"/>' for d_ in ds) + '</g>')
            for lt in A["letters"]:
                for st in lt["strokes"]:
                    out.append(f'<path d="{bz_d(st, P)}" fill="none" stroke="#000" stroke-width="2.2" '
                               f'stroke-linecap="round" stroke-linejoin="round"/>')
            for nm, col in (("joins", None), ("leads", "#f97316"), ("tails", "#f97316")):
                for j in A[nm]:
                    cc = col or ("#dc2626" if "port" in j else "#2563eb")
                    bz = [[list(map(float, q)) for q in b] for b in FN.conn_beziers(j["coeffs"])]
                    out.append(f'<path d="{bz_d(bz, P)}" fill="none" stroke="{cc}" stroke-width="2.2" '
                               f'stroke-linecap="round"/>')
        out.append("</g>")
    out.append("</svg>")
    with open(out_svg, "w", encoding="utf-8") as fh:
        fh.write("\n".join(out))
    if rep_path:
        with open(rep_path, "w", encoding="utf-8") as fh:
            fh.write(f"{title}\nbuilds: " + "; ".join(f"{b['name']} = {b['dir']} ({b['mode']}, {b['variant']}, "
                                                     f"{b['ports'] or ports_path})"
                                                     for b in builds) + "\n\n" + "\n".join(report) + "\n\nsolves:\n")
            for r in G.LOG:
                fh.write(f"{r[0]} dx {r[1]:.1f} fu: nfev {r[3]}, J {r[4]:.4g}, pen {r[5]:.3g}\n")
    if side_path:
        with open(side_path, "w", encoding="utf-8") as fh:
            json.dump(sidecars, fh, indent=1, default=float)
    print(f"{out_svg}: {len(cells)} rows x {ncol} columns")


if __name__ == "__main__":
    main()
