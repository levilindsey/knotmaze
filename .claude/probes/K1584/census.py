# K1584 (Muse batch 27 Run Z8): crossing-gap census on one captured maze.
#   python census.py <captureDir> [--frame gf_b2.png] [--scene scene_gf.json] [--sites sites_gf.json]
# <captureDir> holds one load's gf_b2.png (border look, bit-still B2 shot),
# sites_gf.json (toDevA, h, fade) and scene_gf.json (chains, crossings,
# junctions, deadEnds), as .claude/probes/K1482/s40/cap40pin.mjs writes them
# with env GF=1,B2=1,SCENE=1 (DUMPGW=1 adds gw_gf.json, read for the margin).
# Writes <captureDir>/crossings.tsv and prints one summary line; the rule:
#
# For each scene crossing, the centre is the under chain's point at its
# crossing arc (scene chains' pts walked by arc; crossings' s are arcs over
# them). Each of the under thread's two sides (arc direction -1 / +1 from the
# centre) has two border rays: the under centreline offset by +/- h
# perpendicular (h = sites' half thread width). A ray is walked outward in
# 0.02 world steps to 2.2 world. Ink at a step: the minimum luminance
# (299R+587G+114B)//1000 over the 3x3 device block at the ray point and at
# +/-0.05 world perpendicular jitter is <= 22 (border strokes read 19-21,
# paper/interior 26-30 on A_3's dark backdrop). The ray EXITS the over
# thread where its point's distance to the over centreline (over polyline
# within +/-3.4 arc of the crossing) first exceeds h + 0.01. The ray's gap
# is the arc from that exit to the first ink step past it (no ink step by
# 2.2 world counts as a gap of 999). A SIDE has no gap when its smaller
# edge gap is <= 0.03 world (ink within one 0.02 step of the exit, ~1.3
# device px at A_3's 42.6 px/unit): its borders reach the over thread's
# border. Hand check on A_3 (build 272edd8c7 frame, s40 scene): the five
# largest-gap sides (x18-, x126-, x223+, x291-, x51+, side gaps 0.10-0.12
# world = 4.3-5.1 px) show the under borders stopping short with dark
# ground before the over border; the five zero sides (x0+, x2, x3, x4, x6,
# 0.02 world = 0.9 px) show the lines running together (handcheck.png).
# Kind of the under pass, first match: self (under chain == over chain);
# near (crossing centre within one thread width, 2h, of a junction centre
# or a dead end, world distance); fused (the under chain holds an arm in a
# junction that has an end arm, within 2.0 arc of the crossing along the
# under chain); plain otherwise. Fade and gap margin printed in the
# summary set the expected gap: ink should end margin before the over
# border and ramp back over fade (gf_look lookGap/lookFade).
import argparse, bisect, json, math, os, sys
import numpy as np
from PIL import Image

INK_LUM = 22
STEP = 0.02
TMAX = 2.2
NO_GAP_MAX = 0.03
OVER_REACH = 3.4
FUSED_ARC = 2.0
CUT_BIAS = 0.03


def build_chains(scene):
    chains = []
    for c in scene['chains']:
        pts = c['pts']; n = len(pts) // 2
        segs = n if c['closed'] else n - 1
        cum = [0.0]
        for i in range(segs):
            j = (i + 1) % n
            cum.append(cum[-1] + math.hypot(pts[2*j]-pts[2*i], pts[2*j+1]-pts[2*i+1]))
        chains.append({'pts': pts, 'n': n, 'closed': bool(c['closed']), 'cum': cum, 'total': cum[-1]})
    return chains


class Census:
    def __init__(self, cap_dir, frame_name, scene_name, sites_name):
        self.scene = json.load(open(os.path.join(cap_dir, scene_name)))
        self.sites = json.load(open(os.path.join(cap_dir, sites_name)))
        img = np.asarray(Image.open(os.path.join(cap_dir, frame_name)).convert('RGB')).astype(int)
        self.lum = (299 * img[:, :, 0] + 587 * img[:, :, 1] + 114 * img[:, :, 2]) // 1000
        self.A = self.sites['toDevA']; self.H = float(self.sites['h'])
        self.chains = build_chains(self.scene)
        self.ppu = abs(self.A[0])
        gw_path = os.path.join(cap_dir, 'gw_gf.json')
        self.margin = None
        if os.path.exists(gw_path):
            gw = json.load(open(gw_path))
            st = gw.get('style') or {}
            if st.get('casingWidth') is not None and st.get('threadWidth') is not None:
                self.margin = max(0.0, (st['casingWidth'] - st['threadWidth']) / 2.0) + CUT_BIAS

    def pt_at(self, ci, arc):
        C = self.chains[ci]; pts, n, cum, tot = C['pts'], C['n'], C['cum'], C['total']
        a = ((arc % tot) + tot) % tot if C['closed'] and tot > 0 else max(0.0, min(tot, arc))
        lo = max(0, min(bisect.bisect_right(cum, a) - 1, len(cum) - 2))
        sl = cum[lo+1] - cum[lo] or 1.0; u = (a - cum[lo]) / sl
        i0 = lo % n; i1 = (lo + 1) % n
        return (pts[2*i0] + (pts[2*i1]-pts[2*i0]) * u, pts[2*i0+1] + (pts[2*i1+1]-pts[2*i0+1]) * u)

    def dev(self, p):
        A = self.A
        return (A[0]*p[0] + A[2]*p[1] + A[4], A[1]*p[0] + A[3]*p[1] + A[5])

    def lum_at(self, wx, wy):
        x, y = self.dev((wx, wy)); xi, yi = int(round(x)), int(round(y))
        if not (1 <= xi < self.lum.shape[1] - 1 and 1 <= yi < self.lum.shape[0] - 1):
            return 99
        return int(self.lum[yi-1:yi+2, xi-1:xi+2].min())

    def dist_over(self, p, ow_chain, ow_s):
        C = self.chains[ow_chain]; pts, n, cum, tot = C['pts'], C['n'], C['cum'], C['total']
        best = 1e9; segs = n if C['closed'] else n - 1
        for i in range(segs):
            ma = (cum[i] + cum[i+1]) / 2.0; da = ma - ow_s
            if C['closed'] and tot > 0:
                da -= tot * math.floor(da / tot + 0.5)
            if abs(da) > OVER_REACH:
                continue
            j = (i + 1) % n; ax, ay = pts[2*i], pts[2*i+1]
            dx, dy = pts[2*j]-ax, pts[2*j+1]-ay; l2 = dx*dx + dy*dy
            u = max(0.0, min(1.0, ((p[0]-ax)*dx + (p[1]-ay)*dy) / l2)) if l2 > 0 else 0.0
            best = min(best, math.hypot(p[0]-ax-dx*u, p[1]-ay-dy*u))
        return best

    def ray_gap(self, un_chain, un_s, dirn, edge, ov_chain, ov_s):
        H = self.H; t_exit = None; t = 0.0
        while t <= TMAX:
            s = un_s + dirn * t; c = self.pt_at(un_chain, s)
            c0 = self.pt_at(un_chain, s - 0.05); c1 = self.pt_at(un_chain, s + 0.05)
            tx, ty = c1[0]-c0[0], c1[1]-c0[1]; L = math.hypot(tx, ty) or 1.0
            tx, ty = tx / L, ty / L; px, py = -ty, tx
            p = (c[0] + px * edge * H, c[1] + py * edge * H)
            if t_exit is None:
                if self.dist_over(p, ov_chain, ov_s) > H + 0.01:
                    t_exit = t
            elif min(self.lum_at(p[0] + px * off, p[1] + py * off) for off in (-0.05, 0.0, 0.05)) <= INK_LUM:
                return t - t_exit
            t += STEP
        return 999.0 if t_exit is not None else None

    def kind(self, un_chain, ov_chain, un_s, centre):
        if un_chain == ov_chain:
            return 'self'
        tw = 2.0 * self.H
        for j in self.scene.get('junctions', []):
            if math.hypot(centre[0]-j['c'][0], centre[1]-j['c'][1]) < tw:
                return 'near'
        for d in self.scene.get('deadEnds', []):
            p = self.pt_at(d['chain'], d['s'])
            if math.hypot(centre[0]-p[0], centre[1]-p[1]) < tw:
                return 'near'
        C = self.chains[un_chain]
        for j in self.scene.get('junctions', []):
            if not any(a.get('kind') == 'end' for a in j['arms']):
                continue
            for a in j['arms']:
                if a['chain'] != un_chain:
                    continue
                da = abs(un_s - a['s'])
                if C['closed'] and C['total'] > 0:
                    da = min(da, C['total'] - da)
                if da <= FUSED_ARC:
                    return 'fused'
        return 'plain'

    def run(self):
        rows = []
        for idx, x in enumerate(self.scene['crossings']):
            ov = x['a'] if x['over'] == 'a' else x['b']
            un = x['b'] if x['over'] == 'a' else x['a']
            centre = self.pt_at(un['chain'], un['s']); cd = self.dev(centre)
            kind = self.kind(un['chain'], ov['chain'], un['s'], centre)
            sides = []
            for dirn in (-1, 1):
                gaps = [self.ray_gap(un['chain'], un['s'], dirn, e, ov['chain'], ov['s']) for e in (-1, 1)]
                avail = [v for v in gaps if v is not None]
                sg = min(avail) if avail else None
                sides.append((dirn, gaps, sg, None if sg is None else sg <= NO_GAP_MAX))
            rows.append({'id': idx, 'x': cd[0], 'y': cd[1], 'wx': centre[0], 'wy': centre[1],
                         'under': un['chain'], 'over': ov['chain'], 'kind': kind, 'sides': sides})
        return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cap_dir')
    ap.add_argument('--frame', default='gf_b2.png')
    ap.add_argument('--scene', default='scene_gf.json')
    ap.add_argument('--sites', default='sites_gf.json')
    args = ap.parse_args()
    cz = Census(args.cap_dir, args.frame, args.scene, args.sites)
    rows = cz.run()
    out = os.path.join(args.cap_dir, 'crossings.tsv')
    with open(out, 'w') as f:
        f.write('id\tx\ty\twx\twy\tunder\tover\tkind\tdir\tgap_m\tgap_p\tside_gap\tno_gap\n')
        for r in rows:
            for dirn, gaps, sg, ng in r['sides']:
                fmt = lambda v: 'none' if v is None else ('%.2f' % v)
                f.write('%d\t%.0f\t%.0f\t%.3f\t%.3f\t%d\t%d\t%s\t%+d\t%s\t%s\t%s\t%s\n' % (
                    r['id'], r['x'], r['y'], r['wx'], r['wy'], r['under'], r['over'], r['kind'],
                    dirn, fmt(gaps[0]), fmt(gaps[1]), fmt(sg), '' if ng is None else int(ng)))
    n_cross = len(rows)
    n_sides = sum(1 for r in rows for s in r['sides'] if s[3] is not None)
    n_nogap = sum(1 for r in rows for s in r['sides'] if s[3])
    by_kind = {}
    for r in rows:
        for s in r['sides']:
            if s[3] is None:
                continue
            k = by_kind.setdefault(r['kind'], [0, 0]); k[0] += 1; k[1] += int(s[3])
    print('CENSUS %s crossings=%d sides=%d nogap=%d fade=%s margin=%s ppu=%.2f file=%s' % (
        args.cap_dir, n_cross, n_sides, n_nogap, cz.sites.get('fade'),
        None if cz.margin is None else round(cz.margin, 3), cz.ppu, out))
    for k in sorted(by_kind):
        print('  kind %s sides=%d nogap=%d' % (k, by_kind[k][0], by_kind[k][1]))


if __name__ == '__main__':
    main()
