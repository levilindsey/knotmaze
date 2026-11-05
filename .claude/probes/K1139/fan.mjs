// K1139 S3b: the pulse crest through the fan, from the GPU's own field.
// Debug view 5's G at points along each pulse band's drawn centreline
// against the CPU mirror's kPulseBandV (P8 in the fan, pass <= 4/255),
// and, in full mode, P1/P3/P4/P5 through the fan from a kymograph
// sampled along that centreline (plan 4.3). On a build without pulse
// bands in the record (the before record) the centreline is rebuilt
// from the arms' geometry the way joinery builds it (routeCorner /
// routeCubic, tau made arc-true), and the fan reads its bars there:
// that mismatch is the before half of P8-in-the-fan.
//   node fan.mjs <stand> <out.json> [p8|full]
// Stands copied verbatim from bands.mjs (x4 = pre4 + &pr=8). The only
// change on the wire is the host's port (K1139_HOST, 5550 in batch 16).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  fork: { q: Q, moves: [0], extra: "" },
  cross: { q: Q, moves: [0, 246, 82, 83, 199], extra: "" },
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150], extra: "" },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], extra: "" },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};

const [, , STAND, OUTARG, MODE = "p8"] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const OUT = resolve(OUTARG);
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + st.extra, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await page.evaluate(PIN);

  // Per band: its drawn centreline (x, y, tau) and where its junction is.
  const setup = await page.evaluate(async () => {
    // The app loads its modules with vite's ?t= stamp; a bare import is
    // a second instance with its own (empty) singletons.
    const mod = (p) => {
      const hit = performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes(p));
      return import(hit ?? p);
    };
    const PM = await mod("/src/render/paint_math.ts");
    const MD = await mod("/src/render/paint_model.ts");
    const JF = await mod("/src/render/junction_field.ts");
    const SM = await mod("/src/render/ribbon/sampling.ts");
    const JR = await mod("/src/render/junction_routes.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
    const fp = r.fieldProbe;
    const bands = window.__knotPulseBands();
    const pulses = window.__knotPulses();
    const rd = JF.recordData().data;
    const slotOf = (a) => r.paintState.routeArmSlot(a.chain, a.ctrl);
    const jiOf = (b) => {
      for (let ji = 0; ji < r.junctionArms.length; ji++) {
        const arms = fp.arms(ji);
        const has = (a) => arms.some((x) => x.chain === a.chain && x.slot === slotOf(a) && x.dir === a.dir);
        if (has(b.a) && has(b.b)) return ji;
      }
      return -1;
    };
    const out = [];
    for (const b of bands) {
      const ji = jiOf(b);
      const rec = { vertex: b.vertex, aEdge: b.aEdge, bEdge: b.bEdge, distJ: b.distJ, inward: b.inward, slot: b.slot, shared: b.shared, fallback: b.fallback, used: b.used, ji, source: "none", pts: [], nr: -1, np: -1, c: (ji >= 0 ? fp.center(ji) : null) ?? [0, 0] };
      if (ji >= 0) {
        const arms = fp.arms(ji);
        const ia = arms.findIndex((x) => x.chain === b.a.chain && x.slot === slotOf(b.a) && x.dir === b.a.dir);
        const ib = arms.findIndex((x) => x.chain === b.b.chain && x.slot === slotOf(b.b) && x.dir === b.b.dir);
        const rb = fp.record(ji);
        if (rb >= 0) {
          const routeBase = Math.round(rd[rb * 4 + 3]);
          const nr = Math.round(rd[(rb + 1) * 4 + 3]);
          rec.nr = nr;
          if (routeBase > 0) {
            let base = routeBase;
            for (let i = 0; i < nr; i++) base += 1 + Math.round(rd[base * 4]);
            const np = Math.round(rd[base * 4]);
            rec.np = np;
            let pb = base + 1;
            for (let i = 0; i < np; i++) {
              const nv = Math.round(rd[pb * 4]);
              if (!(nv >= 2 && nv <= 64)) break; // Not a pulse section (a before build): fall through.
              const bIa = Math.round(rd[pb * 4 + 2]), bIb = Math.round(rd[pb * 4 + 3]);
              // Stage 2: a 4-texel header (R2 = P, unit norm or 0); S3b had 2.
              const hn = rd[(pb + 2) * 4] ** 2 + rd[(pb + 2) * 4 + 1] ** 2 + rd[(pb + 2) * 4 + 2] ** 2;
              const HB = Math.abs(hn - 1) < 1e-3 || hn === 0 ? 4 : 2;
              if (bIa === ia && bIb === ib) {
                const cand = [];
                for (let v = 0; v < nv; v++) {
                  const o = (pb + HB + v) * 4;
                  cand.push([rd[o], rd[o + 1], rd[o + 2]]);
                }
                // A true band hugs its junction; garbage texels do not.
                if (cand.every((p) => Math.hypot(p[0] - rd[rb * 4], p[1] - rd[rb * 4 + 1]) < 2.5)) {
                  rec.pts = cand;
                  rec.source = "record";
                }
              }
              pb += HB + nv;
            }
            if (rec.source === "none") {
              // A shared band on a before build: its gold block is the
              // drawn centreline (its arm order may run the other way:
              // then the points flip and tau negates).
              let gb = routeBase;
              for (let i = 0; i < nr; i++) {
                const nv = Math.round(rd[gb * 4]);
                const bIa = Math.round(rd[gb * 4 + 2]), bIb = Math.round(rd[gb * 4 + 3]);
                const fwd = bIa === ia && bIb === ib, rev = bIa === ib && bIb === ia;
                if ((fwd || rev) && nv >= 2) {
                  for (let v = 0; v < nv; v++) {
                    const o = (gb + 1 + v) * 4;
                    rec.pts.push([rd[o], rd[o + 1], rd[o + 2]]);
                  }
                  if (rev) {
                    rec.pts.reverse();
                    for (const p of rec.pts) p[2] = -p[2];
                  }
                  rec.source = "gold";
                }
                gb += 1 + nv;
              }
            }
          }
        }
        if (rec.source === "none" && ia >= 0 && ib >= 0) {
          // Before the bands reach the record: rebuild the centreline
          // from the arms (joinery's along + cornerCubic, arc-true tau).
          const A = arms[ia], B = arms[ib];
          const fh = r.style.threadWidth / 2;
          const alpha = Math.acos(Math.max(-1, Math.min(1, A.dx * B.dx + A.dy * B.dy)));
          const d = JR.routeCorner(alpha, fh * 1.25 * r.cuspRadius, fh, 1e9, 1e9).d;
          const scratch = new Float32Array(4);
          const armAt = (arm, s, o) => {
            const samples = r.chainSamples[arm.chain];
            SM.sampleAtSafe(samples, SM.normArc(arm.arc0 + arm.dir * s, arm.total, arm.closed), arm.closed, scratch, 0);
            o[0] = scratch[0]; o[1] = scratch[1];
            let tx = scratch[2] * arm.dir, ty = scratch[3] * arm.dir;
            const tl = Math.hypot(tx, ty);
            if (tl > 1e-6) { tx /= tl; ty /= tl; } else { tx = arm.dx; ty = arm.dy; }
            o[2] = tx; o[3] = ty;
          };
          const pts = [];
          const along = (arm, s0, s1, sign) => {
            const len = Math.abs(s1 - s0), segs = Math.max(1, Math.ceil(len / 0.06));
            for (let kk = 0; kk <= segs; kk++) {
              const s = s0 + ((s1 - s0) * kk) / segs, o = [0, 0, 0, 0];
              armAt(arm, s, o);
              pts.push([o[0], o[1], sign * s]);
            }
          };
          const sMax = 1.1;
          along(A, sMax, d, -1);
          pts.pop();
          const qa = [0, 0, 0, 0], qb = [0, 0, 0, 0];
          armAt(A, d, qa); armAt(B, d, qb);
          const corner = [];
          JR.routeCubic(qa[0], qa[1], qa[2], qa[3], qb[0], qb[1], qb[2], qb[3], d, 14, corner);
          for (let i = 0; i < corner.length; i += 3) pts.push([corner[i], corner[i + 1], corner[i + 2]]);
          pts.pop();
          along(B, d, sMax, 1);
          // Arc-true tau, as joinery's arcTrueTau: the turn's tau
          // rescaled in proportion to its true arc, still meeting the
          // arms at +-d; the arm stretches keep tau = -+arc.
          const cs = pts.findIndex((p) => Math.abs(p[2]) <= d + 1e-9);
          let ce = cs;
          for (let i = cs; i < pts.length; i++) if (Math.abs(pts[i][2]) <= d + 1e-9) ce = i;
          if (cs >= 0 && ce > cs) {
            const cum = [0];
            for (let i = cs + 1; i <= ce; i++) cum.push(cum[cum.length - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
            const total = cum[cum.length - 1];
            if (total > 1e-12) for (let i = cs; i <= ce; i++) pts[i][2] = -d + 2 * d * (cum[i - cs] / total);
          }
          rec.pts = pts;
          rec.source = "recon";
        }
      }
      out.push(rec);
    }
    return { head: k.head, reach: r.pulseReach, spacing: r.pulseSpacing, fanR: (r.style.threadWidth / 2) * 1.25 * r.cuspRadius, bands: out, pulses };
  });

  const byVertex = new Map();
  for (const b of setup.bands) {
    if (!byVertex.has(b.vertex)) byVertex.set(b.vertex, []);
    byVertex.get(b.vertex).push(b);
  }
  // Cumulative arc along each centreline (the kymograph's x axis).
  for (const b of setup.bands) {
    b.arc = [0];
    for (let i = 1; i < b.pts.length; i++) b.arc.push(b.arc[i - 1] + Math.hypot(b.pts[i][0] - b.pts[i - 1][0], b.pts[i][1] - b.pts[i - 1][1]));
    const zi = b.pts.findIndex((p) => p[2] >= 0);
    b.arc0 = zi > 0 ? b.arc[zi - 1] + (b.arc[zi] - b.arc[zi - 1]) * ((0 - b.pts[zi - 1][2]) / (b.pts[zi][2] - b.pts[zi - 1][2] || 1)) : 0;
  }

  const zoomAt = async (vertex) => {
    // Back out to a fit-ish scale first: at 60 px/world the next vertex
    // can sit off-screen, where a wheel zoom cannot re-centre on it.
    {
      const cpt = { x: 850, y: 475 };
      const scaleAt = () => page.evaluate((p) => {
        const kk = window.__knotFabric();
        const a = kk.toWorld(p.x, p.y), c = kk.toWorld(p.x + 100, p.y);
        return 100 / Math.hypot(c.x - a.x, c.y - a.y);
      }, cpt);
      for (let i = 0; i < 8 && (await scaleAt()) > 14; i++) {
        await page.mouse.move(cpt.x, cpt.y);
        await page.keyboard.down("Control");
        await page.mouse.wheel({ deltaY: 40 });
        await page.keyboard.up("Control");
        await sleep(200);
        await viewStill(page);
      }
    }
    const fpt = await page.evaluate((v) => window.__knotFabric().vertexScreen(v), vertex);
    const pxPerWorld = () => page.evaluate((p) => {
      const kk = window.__knotFabric();
      const a = kk.toWorld(p.x, p.y), c = kk.toWorld(p.x + 100, p.y);
      return 100 / Math.hypot(c.x - a.x, c.y - a.y);
    }, fpt);
    const wheel = async (dy) => {
      await page.mouse.move(fpt.x, fpt.y);
      await page.keyboard.down("Control");
      await page.mouse.wheel({ deltaY: dy });
      await page.keyboard.up("Control");
      await sleep(250);
      await viewStill(page);
    };
    let s0 = await pxPerWorld();
    if (s0 < 60 * 0.97) {
      await wheel(-30);
      const s1 = await pxPerWorld();
      const kEff = Math.log(s1 / s0) / 30;
      if (kEff > 0 && s1 < 60 * 0.97) await wheel(-Math.log(60 / s1) / kEff);
    }
    await page.mouse.move(2, 2);
    await sleep(300);
    await viewStill(page);
  };

  // Visibility, both modes: the drawn fan against its CPU mirror
  // (fieldProbe) in the normal view, at the band centrelines - the
  // fan's own census (fanmax), and the mask every fan check below
  // uses: a centreline point whose normal colour is not the fan's
  // field (an over-thread covers the band there, on any build) has no
  // drawn crest to read. Occlusion is static once the knot sleeps, so
  // one clock (t = 100) masks every sampled time.
  for (const [vertex, vBands] of byVertex) {
    await zoomAt(vertex);
    await setState(page, { t: 100, dbg: 0, webs: true });
    const shot = await page.screenshot({ type: "png" });
    const img = toRGB(decodePNG(Buffer.from(shot)));
    const mir = await page.evaluate(async (tb) => {
      const r = window.__knotRenderer();
      const view = window.__knotView();
      return tb.map((b) => ({
        view: [view.x, view.y, view.s],
        rgb: b.pts.map((p) => {
          const out = new Float32Array(4);
          r.fieldProbe.at(b.ji, p[0], p[1], out, 1 / 90, false);
          return [out[0], out[1], out[2]];
        }),
      }));
    }, vBands.map((b) => ({ pts: b.pts, ji: b.ji })));
    vBands.forEach((b, bi) => {
      const [vx, vy, vs] = mir[bi].view;
      let mx = 0;
      b.vis = b.pts.map((p, pi) => {
        const x = Math.round((p[0] * vs + vx) * 1.5), y = Math.round((p[1] * vs + vy) * 1.5);
        if (x < 0 || y < 0 || x >= img.W || y >= img.H) return false;
        const o = (y * img.W + x) * 3;
        let d = 0;
        for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(img.data[o + c] - mir[bi].rgb[pi][c] * 255));
        const vis = d <= 12;
        if (vis && Math.hypot(p[0] - b.c[0], p[1] - b.c[1]) <= setup.fanR && d > mx) mx = d;
        return vis;
      });
      b.fanmax = mx;
    });
  }

  // Fine centreline profile (P1/P3/P4, bandkymo's method): points
  // every ~0.02 of tau along the drawn centreline, so a crest's peak
  // can be tracked continuously instead of at the record's verts
  // (whose spacing quantizes the peak and biases a fit low). A fine
  // point is visible when both bracketing verts are.
  for (const b of setup.bands) {
    b.fine = [];
    const P = b.pts;
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], c = P[i + 1];
      const steps = Math.max(1, Math.ceil(Math.abs(c[2] - a[2]) / 0.02));
      for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
        const f = k / steps;
        const x = a[0] + (c[0] - a[0]) * f, y = a[1] + (c[1] - a[1]) * f;
        b.fine.push({
          x, y, tau: a[2] + (c[2] - a[2]) * f,
          vis: !!(b.vis && b.vis[i] && b.vis[i + 1]),
          fan: Math.hypot(x - b.c[0], y - b.c[1]) <= setup.fanR,
        });
      }
    }
  }

  const period = setup.spacing / 1.6;
  const times = MODE === "full"
    ? Array.from({ length: 64 }, (_, i) => 100 + (i * period) / 64)
    : Array.from({ length: 8 }, (_, i) => 100 + (i * period) / 8);
  const DSF = 1.5;
  for (const [vertex, vBands] of byVertex) {
    await zoomAt(vertex);
    for (const b of vBands) { b.G = []; b.GF = []; }
    for (const t of times) {
      await setState(page, { t, dbg: 5, webs: !process.env.K1139_NOFAN });
      const frame = await page.evaluate(async (tb) => {
        const mod = (p) => {
          const hit = performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes(p));
          return import(hit ?? p);
        };
        const PM = await mod("/src/render/paint_math.ts");
        const MD = await mod("/src/render/paint_model.ts");
        const U = MD.knotUniformValues();
        const view = window.__knotView();
        return tb.map((b) => ({
          mirror: b.pts.map((p) => PM.kPulseBandV(U, b.distJ, p[2], b.inward)),
          mirrorF: (b.fine || []).map((t) => PM.kPulseBandV(U, b.distJ, t, b.inward)),
          view: [view.x, view.y, view.s],
        }));
      }, vBands.map((b) => ({ pts: b.pts, fine: (b.fine || []).map((p) => p.tau), distJ: b.distJ, inward: b.inward })));
      const shot = await page.screenshot({ type: "png" });
      const img = toRGB(decodePNG(Buffer.from(shot)));
      vBands.forEach((b, bi) => {
        const [vx, vy, vs] = frame[bi].view;
        const sample = (wx, wy) => {
          const x = Math.round((wx * vs + vx) * DSF), y = Math.round((wy * vs + vy) * DSF);
          return x >= 0 && y >= 0 && x < img.W && y < img.H ? img.data[(y * img.W + x) * 3 + 1] : -1;
        };
        // A centreline point can sit under an over-thread crossing the
        // fan; the crest paints the band's whole width, so the visible
        // crest at a point is the max over a swath across the band
        // (+-0.2 world). The centre read stays for troughs (occlusion
        // only adds light there).
        const row = b.pts.map((p, pi) => {
          const g = sample(p[0], p[1]);
          let gm = g, gn = g;
          const pa = b.pts[Math.max(0, pi - 1)], pb = b.pts[Math.min(b.pts.length - 1, pi + 1)];
          let tx = pb[0] - pa[0], ty = pb[1] - pa[1];
          const tl = Math.hypot(tx, ty) || 1;
          tx /= tl; ty /= tl;
          for (const off of [-0.2, -0.1, 0.1, 0.2]) {
            const s = sample(p[0] - ty * off, p[1] + tx * off);
            if (s > gm) gm = s;
            if (gn < 0 || (s >= 0 && s < gn)) gn = s;
          }
          return { g, gm, gn, v: frame[bi].mirror[pi] };
        });
        b.G.push(row);
        b.GF.push((b.fine || []).map((p, fi) => ({ g: sample(p.x, p.y), v: frame[bi].mirrorF[fi] })));
      });
    }
  }

  // Numbers per band.
  const interpAt = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let i = 1; i < xs.length; i++) if (xs[i] >= x) return ys[i - 1] + (ys[i] - ys[i - 1]) * ((x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1));
    return ys[ys.length - 1];
  };
  const report = { stand: STAND, mode: MODE, head: setup.head, reach: setup.reach, bands: [] };
  for (const b of setup.bands) {
    const e = { vertex: b.vertex, band: `e${b.aEdge}->e${b.bEdge}`, distJ: +b.distJ.toFixed(3), inward: b.inward, slot: b.slot, shared: b.shared, fallback: b.fallback, used: b.used, ji: b.ji, nr: b.nr, np: b.np, source: b.source, nPts: b.pts.length };
    if (b.fanmax !== undefined) e.fanmax = +b.fanmax.toFixed(1);
    // The fan's own disc: inside the fan radius the fan (web + cover
    // strips) draws the band; past it the ribbon's own crest is the
    // arms' P8 (p8live). Even inside, a centreline point can sit under
    // an over-thread: peaks read the swath max (any visible slice of
    // the band's width carries the crest), troughs the swath min
    // (occlusion only adds light), and a peak the whole swath misses
    // (mirror lit, read dark) counts as occluded, not as an error.
    const inFan = (i) => Math.hypot(b.pts[i][0] - b.c[0], b.pts[i][1] - b.c[1]) <= setup.fanR;
    if (b.G && b.G.length) {
      // P8 in the fan: mirror extrema only (raster slope moves a
      // mid-slope sample; an extremum's value stands, as in p8live).
      let p8 = 0, n8 = 0, p8w = null;
      e.occluded = b.pts.filter((_, i) => inFan(i) && !b.vis[i]).length;
      b.G.forEach((row, ti) => {
        for (let i = 0; i < row.length; i++) {
          if (!inFan(i) || !b.vis[i]) continue;
          const v = row[i].v;
          const lo = row[Math.max(0, i - 3)].v, hi = row[Math.min(row.length - 1, i + 3)].v;
          const isPeak = v >= lo && v >= hi && v > 0.05, isTrough = v <= lo && v <= hi;
          if (!isPeak && !isTrough) continue;
          // Centre read: vis[] already excludes centres an over-thread
          // covers, and the swath max imports a neighbouring band's or
          // arm's brighter crest near the joint (measured: G ran 10-30
          // over the mirror at peaks while fanmax, the fan's own census,
          // stayed <= 11). gm/gn stay recorded for diagnosis.
          const g = row[i].g;
          if (g < 0) continue;
          const d = Math.abs(g - v * 255);
          if (d > p8) { p8 = d; p8w = { t: times[ti], tau: +b.pts[i][2].toFixed(2), v: +v.toFixed(3), g, peak: isPeak }; }
          if (d > 4 && (e.bad ??= []).length < 12) (e.bad ??= []).push({ t: +times[ti].toFixed(2), tau: +b.pts[i][2].toFixed(2), v: +v.toFixed(2), g, peak: isPeak });
          n8++;
        }
      });
      e.p8w = p8w;
      e.p8max = +p8.toFixed(1); e.p8n = n8;
      if (process.env.K1139_DIAG) {
        const ti = Math.max(0, times.findIndex((t) => t >= Number(process.env.K1139_DIAGT || 100.5)));
        const row = b.G[ti];
        const sibs = setup.bands.filter((x) => x !== b && x.vertex === b.vertex);
        const nearTau = (poly, p) => {
          let best = 1e20, bt = 0;
          for (let k = 0; k + 1 < poly.length; k++) {
            const ax = poly[k][0], ay = poly[k][1], dx = poly[k + 1][0] - ax, dy = poly[k + 1][1] - ay;
            const l2 = dx * dx + dy * dy;
            const u = l2 > 1e-12 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0;
            const dd = (p[0] - ax - dx * u) ** 2 + (p[1] - ay - dy * u) ** 2;
            if (dd < best) { best = dd; bt = poly[k][2] + (poly[k + 1][2] - poly[k][2]) * u; }
          }
          return [bt, Math.sqrt(best)];
        };
        console.log(`DIAG ${e.band} t=${times[ti]} fanR ${setup.fanR}`);
        row.forEach((q, i) => {
          if (!inFan(i)) return;
          let vmax = q.v, sibInfo = "";
          for (const s of sibs) {
            const [t2, dist2] = nearTau(s.pts, b.pts[i]);
            const srow = s.G[ti];
            const st = s.pts.map((p) => p[2]);
            const v2 = interpAt(st, srow.map((r) => r.v), t2);
            if (v2 > vmax) vmax = v2;
            sibInfo += ` sib(tau ${t2.toFixed(2)}, d ${dist2.toFixed(3)}, v ${v2.toFixed(3)})`;
          }
          console.log(`  tau ${b.pts[i][2].toFixed(2)} vis ${b.vis[i] ? 1 : 0} g ${q.g} v ${q.v.toFixed(3)} vmax ${vmax.toFixed(3)}${sibInfo}`);
        });
      }
      if (MODE === "full") {
        const taus = b.pts.map((p) => p[2]);
        // P1-P4 read the FINE profile (b.fine / b.GF): the record's
        // verts quantize a crest peak to their spacing and bias every
        // fit low; bandkymo's continuous search is the proven method.
        const F = b.fine || [];
        const fTaus = F.map((p) => p.tau);
        const fOk = (i) => F[i].vis && F[i].fan;
        // P1 through the fan: G at the fan window's ends vs the mirror
        // (visible points only: an occluded end has no drawn value).
        let p1 = 0, p1w = null;
        for (const row of b.GF) {
          for (const te of [-0.55, 0.55]) {
            // The fine point nearest the end; a row where it reads
            // black while the mirror is lit is a gap discard / an
            // over-thread at that instant (P8's occluded tally owns
            // those), not a field discontinuity.
            let bi = -1, bd = 1e9;
            F.forEach((p, i) => {
              if (!fOk(i)) return;
              const d = Math.abs(p.tau - te);
              if (d < bd) { bd = d; bi = i; }
            });
            if (bi < 0 || bd > 0.12) continue;
            const g = row[bi].g, v = row[bi].v;
            if (g === 0 && v > 0.25) continue;
            const dd = Math.abs(g - v * 255);
            if (dd > p1) { p1 = dd; p1w = { te, g, v: +v.toFixed(3) }; }
          }
        }
        e.P1 = +p1.toFixed(1);
        e.P1w = p1w;
        // P3: the crest peak's tau against time (bandkymo: argmax over
        // the window per row, unwrapped across periods, fit). Tau is
        // the crest's distance coordinate (the arms' 1.6 world/s is
        // stated in it), not the drawn arc: inside the turn the
        // curve's length differs from the arms' distance across the
        // fan (plan 2.2), so the drawn-arc speed there is the tau
        // speed times that ratio by design.
        const trackSlope = (get) => {
          const sp = setup.spacing;
          const pT = [], pX = [];
          let off = 0, prev = null;
          b.GF.forEach((row, ti) => {
            let pk = -1, pv = -1;
            row.forEach((q, i) => {
              if (fOk(i) && Math.abs(fTaus[i]) < 1.0 && get(q) > pv) { pv = get(q); pk = i; }
            });
            // Interior peaks only: at the window's edge the argmax
            // pins to the boundary while the crest is still outside,
            // which compresses the fit (bandkymo's window is a full
            // spacing wide for this reason).
            if (pk < 0 || pv < 150 || Math.abs(fTaus[pk]) > 0.75) return;
            const raw = fTaus[pk];
            if (prev !== null) {
              if (raw + off - prev > sp / 2) off -= sp;
              else if (raw + off - prev < -sp / 2) off += sp;
            }
            prev = raw + off;
            pT.push(times[ti]);
            pX.push(raw + off);
          });
          if (pT.length <= 8) return null;
          const mt = pT.reduce((a, x) => a + x, 0) / pT.length, mx = pX.reduce((a, x) => a + x, 0) / pX.length;
          let num = 0, den = 0;
          for (let i = 0; i < pT.length; i++) { num += (pT[i] - mt) * (pX[i] - mx); den += (pT[i] - mt) ** 2; }
          return +(num / den).toFixed(3);
        };
        // Drawn P3 by profile cross-correlation: the visibility mask
        // is static, so aligning each row's profile with the next
        // row's cancels it (argmax fits quantize to the visible
        // islands and read ~25% low, on the mirror's values too -
        // P3v below is that fit, kept as the reference).
        {
          const grid = [];
          for (let x = -0.95; x <= 0.951; x += 0.01) grid.push(+x.toFixed(2));
          const prof = (row) => {
            const idx = F.map((_, i) => i).filter(fOk);
            const xs = idx.map((i) => fTaus[i]);
            return grid.map((x) => interpAt(xs, idx.map((i) => row[i].g), x));
          };
          const rows = b.GF.map(prof);
          let disp = 0, dt = 0, pairs = 0;
          for (let ti = 0; ti + 1 < rows.length; ti++) {
            const a = rows[ti], c = rows[ti + 1];
            if (Math.max(...a) < 120 || Math.max(...c) < 120) continue;
            let bestS = 0, bestE = Infinity;
            for (let s = -10; s <= 10; s++) {
              let err = 0, n = 0;
              for (let i = 0; i < grid.length; i++) {
                const j = i + s;
                if (j < 0 || j >= grid.length) continue;
                err += (a[i] - c[j]) ** 2;
                n++;
              }
              if (n > 50 && err / n < bestE) { bestE = err / n; bestS = s; }
            }
            disp += bestS * 0.01;
            dt += times[ti + 1] - times[ti];
            pairs++;
          }
          e.P3 = pairs > 8 && dt > 0 ? +(disp / dt).toFixed(3) : null;
          e.P3pairs = pairs;
        }
        // Argmax fit on the mirror's own values: separates an
        // estimator artefact from the drawn field's actual speed.
        e.P3v = trackSlope((q) => q.v * 255);
        // Unmasked mirror argmax: the field's own speed with no
        // visibility/window selection at all.
        {
          const pT = [], pX = [];
          let off = 0, prev = null;
          const sp = setup.spacing;
          b.GF.forEach((row, ti) => {
            let pk = -1, pv = -1;
            row.forEach((q, i) => { if (Math.abs(fTaus[i]) < 1.0 && q.v > pv) { pv = q.v; pk = i; } });
            if (pk < 0) return;
            const raw = fTaus[pk];
            if (prev !== null) {
              if (raw + off - prev > sp / 2) off -= sp;
              else if (raw + off - prev < -sp / 2) off += sp;
            }
            prev = raw + off;
            pT.push(times[ti]);
            pX.push(raw + off);
          });
          if (pT.length > 8) {
            const mt = pT.reduce((a, x) => a + x, 0) / pT.length, mx = pX.reduce((a, x) => a + x, 0) / pX.length;
            let num = 0, den = 0;
            for (let i = 0; i < pT.length; i++) { num += (pT[i] - mt) * (pX[i] - mx); den += (pT[i] - mt) ** 2; }
            e.P3a = +(num / den).toFixed(3);
          }
        }
        // P4: crest width at half height in tau, with the peak at the
        // joint vs on an arm stretch of the same band inside the fan
        // (past |tau| 0.65 the reach fade dims the crest under the
        // peak threshold and the fan no longer draws the band).
        const widthF = (row, pk) => {
          let trough = Infinity;
          row.forEach((q, i) => { if (Math.abs(fTaus[i] - fTaus[pk]) < 0.8) trough = Math.min(trough, q.g); });
          const half = (row[pk].g + trough) / 2;
          const cross = (dir) => {
            for (let i = pk + dir; i >= 0 && i < row.length; i += dir) {
              if (Math.abs(fTaus[i] - fTaus[pk]) >= 0.8) break;
              if (row[i].g < half) {
                const t0 = fTaus[i - dir], g0 = row[i - dir].g, t1 = fTaus[i], g1 = row[i].g;
                return g0 === g1 ? t1 : t0 + ((t1 - t0) * (half - g0)) / (g1 - g0);
              }
            }
            return fTaus[pk];
          };
          return cross(1) - cross(-1);
        };
        const peakF = (row, lo, hi) => {
          let pk = -1, pv = -1;
          row.forEach((q, i) => {
            if (fOk(i) && Math.abs(fTaus[i]) >= lo && Math.abs(fTaus[i]) < hi && q.g > pv) { pv = q.g; pk = i; }
          });
          return [pk, pv];
        };
        let wBand = null, wArm = null, dBand = 1e9, dArm = 1e9;
        for (const row of b.GF) {
          const [pkB, pvB] = peakF(row, 0, 0.3);
          if (pkB >= 0 && pvB >= 150 && Math.abs(fTaus[pkB]) < dBand) { dBand = Math.abs(fTaus[pkB]); wBand = widthF(row, pkB); }
          // The arm read sits on the head-side stretch (S3a's arm
          // read: the same crest 1.0 of dG onto the head-side arm;
          // the far side's reach fade would clip the crest's tail
          // and narrow the width by itself).
          let pkA = -1, pvA = -1;
          row.forEach((q, i) => {
            // Fan-disc points only (not vis): on the arm stretch the
            // ribbon may be the drawer, with the same crest phase.
            if (F[i].fan && fTaus[i] <= -0.55 && fTaus[i] > -0.85 && q.g > pvA) { pvA = q.g; pkA = i; }
          });
          if (pkA >= 0 && pvA >= 150 && Math.abs(fTaus[pkA] + 0.7) < dArm) { dArm = Math.abs(fTaus[pkA] + 0.7); wArm = widthF(row, pkA); }
        }
        e.P4 = wBand && wArm ? +((Math.abs(wBand - wArm) / wArm) * 100).toFixed(2) : null;
        e.wBand = wBand, e.wArm = wArm;
        // P5: every visible point of the band (in the fan) is swept by
        // a crest; a point no crest ever shows at is hidden under an
        // over-thread for the whole period and counts separately.
        let p5 = Infinity, hidden = 0;
        for (let i = 0; i < b.pts.length; i++) {
          if (!inFan(i) || !b.vis[i]) continue;
          const dG = b.distJ + taus[i];
          if (dG < 0 || dG > setup.reach - 0.5) continue;
          let mx = 0, seen = false;
          for (const row of b.G) if (row[i].g >= 0) { seen = true; mx = Math.max(mx, row[i].g); }
          if (!seen) continue;
          if (mx < 25) { hidden++; continue; }
          p5 = Math.min(p5, mx / 255);
        }
        e.P5min = +p5.toFixed(4);
        e.hidden = hidden;
      }
    }
    report.bands.push(e);
    console.log(`${STAND} ${e.vertex} ${e.band} (${e.source}, ji ${e.ji}, gold ${e.nr}, pulse ${e.np}): P8max ${e.p8max ?? "-"}/255 n=${e.p8n ?? 0}` +
      (MODE === "full" ? ` P1 ${e.P1}/255 P3 ${e.P3} P4 ${e.P4}% P5min ${e.P5min} fanmax ${b.fanmax !== undefined ? Math.round(b.fanmax) : "-"}/255` : "") +
      ` slot ${e.slot}${e.shared ? " shared" : ""}${e.fallback ? " FALLBACK" : ""} used ${e.used}`);
  }
  // P10's other half: lit arms at a banded vertex that hold no band.
  const bandedV = new Set(setup.bands.map((b) => b.vertex));
  const covered = new Set();
  for (const b of setup.bands) { covered.add(`${b.vertex}|${b.aEdge}`); covered.add(`${b.vertex}|${b.bEdge}`); }
  report.unbanded = setup.pulses
    .filter((p) => bandedV.has(p.near) && !covered.has(`${p.near}|${p.edge}`))
    .map((p) => ({ vertex: p.near, edge: p.edge }));
  for (const u of report.unbanded) console.log(`${STAND} ${u.vertex} e${u.edge}: lit arm with no band (P10)`);
  writeFileSync(OUT, JSON.stringify(report, null, 1));
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
  console.log(`${STAND}: wrote ${OUT} ctxLost check in strips record; bands ${report.bands.length}, unbanded ${report.unbanded.length}`);
} finally {
  await browser.close();
}
