// K1182 Run F (Muse batch 19, 19F): what cuts the biarc rim's gaps
// into stepped corners at four ji147 and cross ji33. Examination only:
// no src/ change, no flag flip. Captures the real wedge rims flag off
// and on (wrapping TriFanMesh.prototype.pushFan around one forced
// rebuild per state), measures six geometry columns per rounded wedge
// (H1 fan folds, H2 corridor exit, H3 arc radii/turns, H4 flank vs arc
// length, H5 route-band fit, H6 band rings), then attributes Run C's
// on-off pixels with four in-page what-ifs (A wider-stencil band
// normals, B arc-uniform flank, C rim/band swap, D band dropped).
//   pwsh -File run_locked.ps1 -Batch batch_exam.txt
// (the dev server must already serve this checkout on K1182_HOST,
// port 5740: npx vite --config .claude/probes/K1182/vite.private-cache.config.ts
//  --port 5740 --strictPort --host 127.0.0.1)
//
// Stands copied verbatim from sheet.mjs (which copied them from
// .claude/probes/K1139/strips.mjs's STANDS, rule 11): cross and four
// keep their q and moves exactly; nothing is added or changed. The
// pinned state is sheet.mjs's: phw=0 in the link, PIN after the moves,
// flag set in the page, a forced rebuild, tickPaint(0).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep, frames } from "./lib.mjs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  cross: { q: Q, moves: [0, 246, 82, 83, 199], focus: ["node_116", "mnode_48"] },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], focus: ["node_378"] },
};
// Brief order: x4 ji 28, ji 147, ji 149 (on the four stand), cross ji 33.
const TARGETS = [
  { stand: "four", ji: 28 },
  { stand: "four", ji: 147 },
  { stand: "four", ji: 149 },
  { stand: "cross", ji: 33 },
];
const OUT = resolve("exam");
const CAPS = join(OUT, "captures");
const CROPS = join(OUT, "crops");
mkdirSync(CAPS, { recursive: true });
mkdirSync(CROPS, { recursive: true });
const CLIP = 200; // CSS px square, centred on the junction (Run C)
const ZOOM = 90; // px per world unit wanted at the junction (Run C)
const DSF = 1.5; // lib.mjs viewport deviceScaleFactor

const setFlagVar = async (page, on) => {
  await page.evaluate(async (on) => {
    const m = await import("/src/render/ribbon/rim_curve.ts");
    m.setRimCurveBiarc(on);
  }, on);
};
const setFlag = async (page, on) => {
  await page.evaluate(async (on) => {
    const m = await import("/src/render/ribbon/rim_curve.ts");
    m.setRimCurveBiarc(on);
    const r = window.__knotRenderer();
    r.joinery.rebuildFillets(true);
    r.tickPaint(0);
  }, on);
  await frames(page, 3);
  await sleep(200);
};
const afterRebuild = async (page) => {
  await page.evaluate(() => window.__knotRenderer().tickPaint(0));
  await frames(page, 3);
  await sleep(200);
};
const centreOf = (page, ji) =>
  page.evaluate((ji) => {
    const fp = window.__knotRenderer().joinery.fieldProbe;
    return { center: fp.center(ji), record: fp.record(ji), arms: (fp.arms(ji) || []).length };
  }, ji);
const screenOf = (page, world) =>
  page.evaluate((w) => {
    const k = window.__knotFabric();
    const w0 = k.toWorld(0, 0), wx = k.toWorld(100, 0), wy = k.toWorld(0, 100);
    return { x: ((w[0] - w0.x) * 100) / (wx.x - w0.x), y: ((w[1] - w0.y) * 100) / (wy.y - w0.y) };
  }, world);
const shootAt = async (page, pt) => {
  const clip = {
    x: Math.max(0, Math.min(1700 - CLIP, Math.round(pt.x - CLIP / 2))),
    y: Math.max(0, Math.min(950 - CLIP, Math.round(pt.y - CLIP / 2))),
    width: CLIP,
    height: CLIP,
  };
  return { buf: await page.screenshot({ type: "png", clip }), clip };
};
function diffCount(aBuf, bBuf) {
  const a = toRGB(decodePNG(aBuf)), b = toRGB(decodePNG(bBuf));
  if (a.W !== b.W || a.H !== b.H) return { px: -1, exact: -1, W: a.W, H: a.H };
  let px = 0, exact = 0;
  for (let i = 0; i < a.W * a.H * 3; i += 3) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > 0) exact++;
    if (d > 8) px++;
  }
  return { px, exact, W: a.W, H: a.H };
}
function upscale(img, f) {
  const W = img.W * f, H = img.H * f;
  const data = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const si = ((y >> 1) * 0 + (Math.floor(y / f) * img.W + Math.floor(x / f))) * 3;
      img.data.copy(data, (y * W + x) * 3, si, si + 3);
    }
  return { W, H, data };
}
const upscale2 = (img) => upscale(img, 2);
function makeSheet(cells, cols, file) {
  const W = cells[0].W, H = cells[0].H, G = 6;
  const rows = Math.ceil(cells.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = rows * H + (rows + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  cells.forEach((im, i) => {
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < H; y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * W * 3, (y + 1) * W * 3);
  });
  writeFileSync(join(OUT, file), encodePNG({ W: SW, H: SH, data }));
  console.log(`${file}: ${SW}x${SH}, ${rows}x${cols}`);
}

// ---- In-page capture: wrap pushFan around one forced rebuild. ----
const CAPTURE_FN = (ji) => {
  const r = window.__knotRenderer();
  const meshB = r.filletMesh, meshT = r.filletTopMesh;
  const proto = Object.getPrototypeOf(meshB);
  const orig = proto.pushFan;
  const calls = [];
  proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
    const wedge = flank != null;
    const vBefore = this.vUsed;
    const res = orig.call(this, apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut);
    if (wedge) {
      const vAfter = this.vUsed;
      calls.push({
        mesh: this === meshB ? 0 : this === meshT ? 1 : -1,
        rec, apex: [apexX, apexY],
        rim: Array.from(rim), flank: Array.from(flank),
        seal: !!seal, flankFill: flankFill ?? null,
        bandIn: bandIn ?? 0, bandOut: bandOut ?? 0,
        vBefore, vAfter,
        vertices: vAfter > vBefore ? Array.from(this.vertexData.subarray(vBefore * 2, vAfter * 2)) : [],
      });
    }
    return res;
  };
  try {
    r.joinery.rebuildFillets(true);
  } finally {
    proto.pushFan = orig;
  }
  const fp = r.joinery.fieldProbe;
  const recNow = fp.record(ji);
  return {
    ji, record: recNow, center: fp.center(ji),
    arms: (fp.arms(ji) || []).map((a) => ({
      chain: a.chain, slot: a.slot, dir: a.dir, dx: a.dx, dy: a.dy, ang: a.ang,
      domain: a.domain, arc0: a.arc0, total: a.total, closed: a.closed, top: a.top, dives: a.dives,
    })),
    routes: (fp.routes(ji) || []).map((x) => ({ ia: x.ia, ib: x.ib, d: x.d, m: x.m })),
    wedges: calls.filter((c) => c.rec === recNow),
    wedgeCallsTotal: calls.length,
    style: {
      threadWidth: r.style.threadWidth, casingWidth: r.style.casingWidth,
      cuspRadius: r.cuspRadius, borderWidth: r.borderWidth, threadLook: r.threadLook,
    },
    view: window.__knotView(),
  };
};

// ---- In-page what-ifs: wrap pushFan, matched by rec + wedge order. ----
const WHATIF_FN = ({ mode, targetRec, offRims, onRims }) => {
  const r = window.__knotRenderer();
  const meshB = r.filletMesh;
  const proto = Object.getPrototypeOf(meshB);
  if (window.__examPushFanOrig) proto.pushFan = window.__examPushFanOrig;
  const orig = proto.pushFan;
  window.__examPushFanOrig = orig;
  // Wedge order resets at each junction's block of wedge calls (a
  // rebuild emits one junction's wedges consecutively), so the swap
  // matches by rec + order in EVERY rebuild while installed - the
  // app rebuilds fillets on later frames, and a one-shot wrapper's
  // fans would be overwritten before the screenshot.
  let wedgeIdx = 0;
  let prevWedgeRec = -999;
  const findTips = (flank) => {
    let tipA = -1, tipB = -1;
    for (let i = 0; i < flank.length; i++) if (flank[i] < 1 - 1e-9) { tipA = i; break; }
    for (let i = flank.length - 1; i >= 0; i--) if (flank[i] > -1 + 1e-9) { tipB = i; break; }
    return [tipA, tipB];
  };
  const arcUniformFlank = (rim, flank) => {
    const out = Array.from(flank);
    const [tipA, tipB] = findTips(flank);
    if (tipA < 0 || tipB <= tipA) return out;
    const cum = [0];
    for (let i = tipA + 1; i <= tipB; i++)
      cum.push(cum[cum.length - 1] + Math.hypot(rim[i * 2] - rim[(i - 1) * 2], rim[i * 2 + 1] - rim[(i - 1) * 2 + 1]));
    const total = cum[cum.length - 1];
    if (!(total > 1e-12)) return out;
    const fA = flank[tipA], fB = flank[tipB];
    for (let i = tipA; i <= tipB; i++) out[i] = fA + (fB - fA) * (cum[i - tipA] / total);
    return out;
  };
  proto.pushFan = function (apexX, apexY, rim, rec, flank, seal, flankFill, bandIn, bandOut) {
    let useRim = rim, useFlank = flank, useBandIn = bandIn ?? 0, useBandOut = bandOut ?? 0;
    const isTarget = rec === targetRec && flank != null;
    let idx = -1;
    if (flank != null) {
      if (rec !== prevWedgeRec) wedgeIdx = 0;
      prevWedgeRec = rec;
      if (isTarget) idx = wedgeIdx;
      wedgeIdx++;
    }
    if (mode === "swapOn" && isTarget && onRims[idx]) useRim = onRims[idx].slice();
    if (mode === "swapOff" && isTarget && offRims[idx]) useRim = offRims[idx].slice();
    if (mode === "B" && isTarget) useFlank = arcUniformFlank(rim, flank);
    if (mode === "D" && isTarget) { useBandIn = 0; useBandOut = 0; }
    const vBefore = this.vUsed;
    const res = orig.call(this, apexX, apexY, useRim, rec, useFlank, seal, flankFill, useBandIn, useBandOut);
    if (mode === "A" && isTarget) {
      // Rebuild this fan's band rings with normals from a wider rim
      // stencil (i-2..i+2 in place of pushFan's i-1..i+1).
      const rimCount = useRim.length / 2;
      const vAfter = this.vUsed;
      const vCount = vAfter - vBefore;
      if (rimCount > 2 && vCount >= 1 + 2 * rimCount && useBandIn > 0) {
        const vd = this.vertexData;
        const hasOuter = vCount >= 1 + 3 * rimCount && useBandOut > 0;
        for (let i = 0; i < rimCount; i++) {
          const px = useRim[i * 2], py = useRim[i * 2 + 1];
          const i0 = Math.max(i - 2, 0), i1 = Math.min(i + 2, rimCount - 1);
          let tx = useRim[i1 * 2] - useRim[i0 * 2], ty = useRim[i1 * 2 + 1] - useRim[i0 * 2 + 1];
          const tl = Math.hypot(tx, ty);
          if (tl > 1e-9) { tx /= tl; ty /= tl; } else { tx = 1; ty = 0; }
          let nx = -ty, ny = tx;
          if (nx * (apexX - px) + ny * (apexY - py) < 0) { nx = -nx; ny = -ny; }
          const ii = vBefore + 1 + rimCount + i;
          vd[ii * 2] = px + nx * useBandIn;
          vd[ii * 2 + 1] = py + ny * useBandIn;
          if (hasOuter) {
            const oo = vBefore + 1 + 2 * rimCount + i;
            vd[oo * 2] = px - nx * useBandOut;
            vd[oo * 2 + 1] = py - ny * useBandOut;
          }
        }
      }
    }
    return res;
  };
  // Left installed until RESTORE_FN: later frames rebuild fillets,
  // and the screenshot must show the wrapped fans, not the flag's.
  r.joinery.rebuildFillets(true);
  r.tickPaint(0);
  return { wedgesTouched: wedgeIdx };
};
const RESTORE_FN = () => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r.filletMesh);
  if (window.__examPushFanOrig) {
    proto.pushFan = window.__examPushFanOrig;
    delete window.__examPushFanOrig;
  }
  r.joinery.rebuildFillets(true);
  r.tickPaint(0);
  return true;
};

// ===================== Geometry (pure, from captures) =====================
const pt = (rim, i) => [rim[i * 2], rim[i * 2 + 1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const hyp = (a) => Math.hypot(a[0], a[1]);
function findTips(flank) {
  let tipA = -1, tipB = -1;
  for (let i = 0; i < flank.length; i++) if (flank[i] < 1 - 1e-9) { tipA = i; break; }
  for (let i = flank.length - 1; i >= 0; i--) if (flank[i] > -1 + 1e-9) { tipB = i; break; }
  return [tipA, tipB];
}
const signedTri = (o, a, b) => 0.5 * cross2(sub(a, o), sub(b, o));
function wrapPi(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
function distPtSeg(p, a, b) {
  const d = sub(b, a), l2 = dot2(d, d);
  const t = l2 > 1e-12 ? Math.max(0, Math.min(1, dot2(sub(p, a), d) / l2)) : 0;
  return hyp(sub(p, [a[0] + d[0] * t, a[1] + d[1] * t]));
}
function distOutsideTri(p, A, B, C) {
  const s1 = cross2(sub(B, A), sub(p, A)), s2 = cross2(sub(C, B), sub(p, B)), s3 = cross2(sub(A, C), sub(p, C));
  const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  if (inside) return 0;
  return Math.min(distPtSeg(p, A, B), distPtSeg(p, B, C), distPtSeg(p, C, A));
}
function solve3(M, v) {
  const [a, b, c] = M[0], [d, e, f] = M[1], [g, h, i] = M[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-18) return null;
  const x = (v[0] * (e * i - f * h) - b * (v[1] * i - f * v[2]) + c * (v[1] * h - e * v[2])) / det;
  const y = (a * (v[1] * i - f * v[2]) - v[0] * (d * i - f * g) + c * (d * v[2] - v[1] * g)) / det;
  const z = (a * (e * v[2] - v[1] * h) - b * (d * v[2] - v[1] * g) + v[0] * (d * h - e * g)) / det;
  return [x, y, z];
}
function circleFit(pts) {
  // Kasa fit: x^2+y^2 + D x + E y + F = 0.
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0, sxz = 0, syz = 0, sz = 0;
  const n = pts.length;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; sxz += x * z; syz += y * z; sz += z;
  }
  const sol = solve3([[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], [-sxz, -syz, -sz]);
  if (!sol) return { r: Infinity, rms: Infinity, cx: 0, cy: 0 };
  const [D, E, F] = sol;
  const cx = -D / 2, cy = -E / 2;
  const r2 = (D * D + E * E) / 4 - F;
  if (!(r2 > 0)) return { r: Infinity, rms: Infinity, cx, cy };
  const r = Math.sqrt(r2);
  let ss = 0;
  for (const p of pts) ss += (Math.hypot(p[0] - cx, p[1] - cy) - r) ** 2;
  return { r: r > 1e6 ? Infinity : r, rms: Math.sqrt(ss / n), cx, cy };
}
const turnDegAt = (prev, cur, next) => {
  const a = sub(cur, prev), b = sub(next, cur);
  if (hyp(a) < 1e-12 || hyp(b) < 1e-12) return 0;
  return (Math.atan2(Math.abs(cross2(a, b)), dot2(a, b)) * 180) / Math.PI;
};
function quadArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return 0.5 * s;
}
function wedgeGeom(w) {
  const rim = w.rim, flank = w.flank, m = rim.length / 2;
  const [tipA, tipB] = findTips(flank);
  const interior = tipB - tipA - 1;
  return { rim, flank, m, tipA, tipB, interior, rounded: interior === 7 };
}
function analysePair(tag, offW, onW) {
  const go = wedgeGeom(offW), gn = wedgeGeom(onW);
  const apex = offW.apex;
  const out = { tag, tipA: go.tipA, tipB: go.tipB, rimCount: go.m, interior: go.interior, rounded: go.rounded };
  if (!go.rounded) return out;
  const A = pt(offW.rim, go.tipA), B = pt(offW.rim, go.tipB);
  // Corner from the flag-off quadratic's middle point P4 (i = 4 of n = 8).
  const P4 = pt(offW.rim, go.tipA + 4);
  const C = [2 * P4[0] - (A[0] + B[0]) / 2, 2 * P4[1] - (A[1] + B[1]) / 2];
  out.corner = C;
  let quadErr = 0;
  for (let i = 1; i < 8; i++) {
    const q = i / 8, u = 1 - q;
    const ex = u * u * A[0] + 2 * u * q * C[0] + q * q * B[0];
    const ey = u * u * A[1] + 2 * u * q * C[1] + q * q * B[1];
    const p = pt(offW.rim, go.tipA + i);
    quadErr = Math.max(quadErr, Math.hypot(p[0] - ex, p[1] - ey));
  }
  out.quadErr = quadErr;
  out.branch = quadErr <= 1e-6 ? "quadratic" : "cubic";
  let onOff = 0;
  for (let i = go.tipA; i <= go.tipB; i++) {
    const a = pt(offW.rim, i), b = pt(onW.rim, i);
    onOff = Math.max(onOff, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  out.onOffMax = onOff;
  out.biarcFired = onOff > 1e-9;
  const maxR = (w) => {
    let r = 0;
    for (let i = 0; i < w.rim.length / 2; i++) r = Math.max(r, Math.hypot(w.rim[i * 2] - w.apex[0], w.rim[i * 2 + 1] - w.apex[1]));
    return r;
  };
  out.maxROff = maxR(offW);
  out.maxROn = maxR(onW);
  const perFlag = (w, g) => {
    const rim = w.rim, m2 = g.m;
    const tris = [];
    for (let i = 0; i < m2 - 1; i++) tris.push(signedTri(w.apex, pt(rim, i), pt(rim, i + 1)));
    const minority = (arr) => {
      const pos = arr.filter((v) => v > 1e-12).length, neg = arr.filter((v) => v < -1e-12).length;
      return { minority: Math.min(pos, neg) + arr.filter((v) => Math.abs(v) <= 1e-12).length, pos, neg, total: arr.length };
    };
    const rimTris = tris.slice(g.tipA, g.tipB);
    const thetas = [];
    for (let i = 0; i < m2; i++) thetas.push(Math.atan2(rim[i * 2 + 1] - w.apex[1], rim[i * 2] - w.apex[0]));
    let dsum = 0;
    const diffs = [];
    for (let i = 0; i < m2 - 1; i++) { const d = wrapPi(thetas[i + 1] - thetas[i]); diffs.push(d); dsum += d; }
    const sgn = dsum >= 0 ? 1 : -1;
    let back = 0;
    for (const d of diffs) back = Math.max(back, -sgn * d);
    const h1 = {
      whole: minority(tris), rim: minority(rimTris),
      maxBackwardDeg: (back * 180) / Math.PI,
    };
    // H2
    let h2 = null;
    if (out.branch === "quadratic") {
      let mx = 0;
      for (let i = g.tipA + 1; i < g.tipB; i++) mx = Math.max(mx, distOutsideTri(pt(rim, i), A, B, C));
      h2 = { outsideWorld: mx };
    }
    // H3: two circle fits split at the best shared sample.
    const segPts = [];
    for (let i = g.tipA; i <= g.tipB; i++) segPts.push(pt(rim, i));
    let best = null;
    for (let s = 2; s <= segPts.length - 3; s++) {
      const f1 = circleFit(segPts.slice(0, s + 1)), f2 = circleFit(segPts.slice(s));
      const score = f1.rms ** 2 * (s + 1) + f2.rms ** 2 * (segPts.length - s);
      if (!best || score < best.score) best = { s, f1, f2, score };
    }
    let maxTurn = 0;
    for (let i = g.tipA; i <= g.tipB; i++) {
      if (i - 1 < 0 || i + 1 >= m2) continue;
      maxTurn = Math.max(maxTurn, turnDegAt(pt(rim, i - 1), pt(rim, i), pt(rim, i + 1)));
    }
    const tipTurnA = g.tipA - 1 >= 0 ? turnDegAt(pt(rim, g.tipA - 1), pt(rim, g.tipA), pt(rim, g.tipA + 1)) : null;
    const tipTurnB = g.tipB + 1 < m2 ? turnDegAt(pt(rim, g.tipB - 1), pt(rim, g.tipB), pt(rim, g.tipB + 1)) : null;
    const h3 = {
      r1: best.f1.r, r2: best.f2.r, split: best.s,
      ratio: Math.max(best.f1.r, best.f2.r) / Math.min(best.f1.r, best.f2.r),
      smaller: Math.min(best.f1.r, best.f2.r),
      bandIn: w.bandIn, bandOut: w.bandOut,
      smallerLtBandIn: Math.min(best.f1.r, best.f2.r) < w.bandIn,
      smallerLtBandOut: Math.min(best.f1.r, best.f2.r) < w.bandOut,
      maxTurnDeg: maxTurn,
    };
    // H6
    const verts = w.vertices, vCount = verts.length / 2;
    const vtx = (local) => [verts[local * 2], verts[local * 2 + 1]];
    const hasInner = vCount >= 1 + 2 * m2, hasOuter = vCount >= 1 + 3 * m2;
    let innerFlips = 0, outerFlips = 0, innerWrong = 0, outerWrong = 0, maxNorm = null;
    if (hasInner) {
      const normals = [];
      for (let i = 0; i < m2; i++) {
        const rp = pt(rim, i), ip = vtx(1 + m2 + i);
        const d = sub(ip, rp);
        normals.push(hyp(d) > 1e-12 ? [d[0] / hyp(d), d[1] / hyp(d)] : null);
        if (dot2(sub(ip, rp), sub(w.apex, rp)) <= 0) innerWrong++;
        if (hasOuter) {
          const op = vtx(1 + 2 * m2 + i);
          if (dot2(sub(op, rp), sub(w.apex, rp)) >= 0) outerWrong++;
        }
      }
      let mx = 0;
      for (let i = 0; i + 1 < m2; i++) {
        if (!normals[i] || !normals[i + 1]) continue;
        mx = Math.max(mx, (Math.atan2(Math.abs(cross2(normals[i], normals[i + 1])), dot2(normals[i], normals[i + 1])) * 180) / Math.PI);
      }
      maxNorm = mx;
      for (let i = 0; i + 1 < m2; i++) {
        const fanSign = Math.sign(signedTri(w.apex, pt(rim, i), pt(rim, i + 1)));
        if (fanSign === 0) continue;
        const iq = quadArea([pt(rim, i), pt(rim, i + 1), vtx(1 + m2 + i + 1), vtx(1 + m2 + i)]);
        if (iq === 0 || Math.sign(iq) !== fanSign) innerFlips++;
        if (hasOuter) {
          const oq = quadArea([pt(rim, i), vtx(1 + 2 * m2 + i), vtx(1 + 2 * m2 + i + 1), pt(rim, i + 1)]);
          if (oq === 0 || Math.sign(oq) !== fanSign) outerFlips++;
        }
      }
    }
    const h6 = {
      tipTurnADeg: tipTurnA, tipTurnBDeg: tipTurnB,
      innerFlips, outerFlips, innerWrong, outerWrong,
      maxNormalDeg: maxNorm, hasInner, hasOuter,
    };
    // H4
    const cum = [0];
    for (let i = g.tipA + 1; i <= g.tipB; i++) cum.push(cum[cum.length - 1] + hyp(sub(pt(rim, i), pt(rim, i - 1))));
    const total = cum[cum.length - 1];
    const fA = w.flank[g.tipA], fB = w.flank[g.tipB];
    let h4max = 0;
    for (let i = g.tipA; i <= g.tipB; i++) {
      const s = total > 1e-12 ? cum[i - g.tipA] / total : 0;
      h4max = Math.max(h4max, Math.abs(w.flank[i] - (fA + (fB - fA) * s)));
    }
    const h4 = { maxDiffFlank: h4max, maxDiffNorm: Math.abs(fB - fA) > 1e-12 ? h4max / Math.abs(fB - fA) : 0 };
    return { h1, h2, h3, h6, h4 };
  };
  out.off = perFlag(offW, go);
  out.on = perFlag(onW, gn);
  return out;
}
function drawnWedgeKs(arms) {
  const ks = [];
  for (let k = 0; k < arms.length; k++) {
    const A = arms[k], B = arms[(k + 1) % arms.length];
    let gap = B.ang - A.ang;
    if (k === arms.length - 1) gap += Math.PI * 2;
    if (gap > 2.6 && A.chain === B.chain) continue;
    ks.push(k);
  }
  return ks;
}
function routeWedge(arms, route) {
  if (!route || route.ia < 0 || route.ib < 0) return null; // one-arm (head) band: fitted in no wedge
  const len = arms.length;
  const gapAfter = (k) => arms[(k + 1) % len].ang - arms[k].ang + (k === len - 1 ? Math.PI * 2 : 0);
  if (route.ib === (route.ia + 1) % len && gapAfter(route.ia) < Math.PI) return route.ia;
  if (route.ia === (route.ib + 1) % len && gapAfter(route.ib) < Math.PI) return route.ib;
  return null;
}
const fmt = (v, d = 3) => (v === null || v === undefined ? "n/a" : !Number.isFinite(v) ? "inf" : v.toFixed(d));

// ===================== Main =====================
const browser = await openBrowser();
const allMeta = [];
const shotsByTag = new Map(); // tag -> Map(shotId -> Buffer)
const capsByTag = new Map(); // tag -> {off, on}
try {
  for (const tgt of TARGETS) {
    const st = STANDS[tgt.stand];
    const tag = `${tgt.stand}_ji${tgt.ji}`;
    const log = [];
    const page = await openPage(browser, st.q, log);
    const shots = new Map();
    shotsByTag.set(tag, shots);
    try {
      await waitAsleep(page);
      await viewStill(page);
      for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused on ${tgt.stand}`);
      await waitAsleep(page, 20000);
      const info0 = await centreOf(page, tgt.ji);
      if (!info0.center) throw new Error(`ji ${tgt.ji} has no junction centre on ${tgt.stand}`);
      // Zoom on the junction (sheet.mjs's wheel logic, verbatim in effect).
      let pt = await screenOf(page, info0.center);
      const pxPerWorld = () =>
        page.evaluate((p) => {
          const k = window.__knotFabric();
          const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
          return 100 / Math.hypot(b.x - a.x, b.y - a.y);
        }, pt);
      const wheel = async (dy) => {
        await page.mouse.move(pt.x, pt.y);
        await page.keyboard.down("Control");
        await page.mouse.wheel({ deltaY: dy });
        await page.keyboard.up("Control");
        await sleep(250);
        await viewStill(page);
      };
      let s0 = await pxPerWorld();
      if (s0 < ZOOM * 0.97) {
        await wheel(-30);
        const s1 = await pxPerWorld();
        const kEff = Math.log(s1 / s0) / 30;
        if (kEff > 0 && s1 < ZOOM * 0.97) await wheel(-Math.log(ZOOM / s1) / kEff);
      }
      const scale = await pxPerWorld();
      await page.mouse.move(2, 2);
      await sleep(400);
      await viewStill(page);
      await waitAsleep(page, 20000);
      await page.evaluate(PIN);
      await sleep(200);
      pt = await screenOf(page, info0.center);
      const info = await centreOf(page, tgt.ji);

      // Captures + baselines at one pinned state.
      await setFlagVar(page, false);
      const capOff = await page.evaluate(CAPTURE_FN, tgt.ji);
      await afterRebuild(page);
      const offShot = await shootAt(page, pt);
      shots.set("off", offShot.buf);
      await setFlag(page, false);
      const ctlShot = await shootAt(page, pt);
      shots.set("control", ctlShot.buf);
      await setFlagVar(page, true);
      const capOn = await page.evaluate(CAPTURE_FN, tgt.ji);
      await afterRebuild(page);
      const onShot = await shootAt(page, pt);
      shots.set("on", onShot.buf);

      const rec = capOff.record;
      const offRims = capOff.wedges.map((w) => w.rim);
      const onRims = capOn.wedges.map((w) => w.rim);
      const whatIf = async (shotId, mode, flagOn) => {
        await setFlagVar(page, flagOn);
        const res = await page.evaluate(WHATIF_FN, { mode, targetRec: rec, offRims, onRims });
        await afterRebuild(page);
        const s = await shootAt(page, pt);
        shots.set(shotId, s.buf);
        await page.evaluate(RESTORE_FN);
        await afterRebuild(page);
        console.log(`${tag} what-if ${shotId} (${mode}, flag ${flagOn ? "on" : "off"}): touched ${res.wedgesTouched}`);
      };
      await whatIf("A", "A", true);
      await whatIf("B", "B", true);
      await whatIf("CswapOn", "swapOn", false);
      await whatIf("CswapOff", "swapOff", true);
      await whatIf("Doff", "D", false);
      await whatIf("Don", "D", true);
      await setFlag(page, false);

      const saveCap = (name, cap, flagOn) => {
        writeFileSync(join(CAPS, name), JSON.stringify({ stand: tgt.stand, ji: tgt.ji, tag, flagOn, ...cap }, null, 1));
      };
      saveCap(`${tag}_off.json`, capOff, false);
      saveCap(`${tag}_on.json`, capOn, true);
      capsByTag.set(tag, { off: capOff, on: capOn });
      for (const [id, buf] of shots) writeFileSync(join(CROPS, `${tag}_${id}.png`), buf);
      const meta = {
        stand: tgt.stand, ji: tgt.ji, tag, center: info.center, record: rec,
        arms: info.arms, scale, clip: offShot.clip,
        stamp: await page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || ""),
        ctxLost: await page.evaluate(() => window.__ctxLost),
        log: log.slice(0, 20),
      };
      allMeta.push(meta);
      console.log(`${tag}: centre ${JSON.stringify(meta.center)} rec ${rec} scale ${scale?.toFixed(1)} wedges off ${capOff.wedges.length} on ${capOn.wedges.length} ctxLost ${meta.ctxLost}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

// ---- Geometry table, what-if counts, sheets. ----
const geometry = { targets: [] };
const whatif = { targets: [], note: "px/exact as Run C counts (max channel diff >8 / >0) on 300x300 device crops; shareToOff = 1 - diff(W,off).px/diff(on,off).px" };
for (const tgt of TARGETS) {
  const tag = `${tgt.stand}_ji${tgt.ji}`;
  const { off, on } = capsByTag.get(tag);
  const shots = shotsByTag.get(tag);
  const ks = drawnWedgeKs(off.arms);
  const pairs = [];
  const n = Math.min(off.wedges.length, on.wedges.length);
  for (let i = 0; i < n; i++) {
    const a = analysePair(tag, off.wedges[i], on.wedges[i]);
    a.order = i;
    a.wedgeK = ks[i] ?? null;
    pairs.push(a);
  }
  const rounded = pairs.filter((p) => p.rounded);
  const fired = rounded.filter((p) => p.biarcFired).map((p) => p.order);
  // H5
  const h5 = [];
  const nr = Math.max(off.routes.length, on.routes.length);
  for (let i = 0; i < nr; i++) {
    const ro = off.routes[i], rn = on.routes[i];
    const ref = ro || rn;
    const wk = routeWedge(off.arms, ref);
    h5.push({
      route: i, ia: ref.ia, ib: ref.ib, wedgeK: wk,
      wedgeOrder: wk === null ? null : (ks.indexOf(wk) >= 0 ? ks.indexOf(wk) : null),
      dOff: ro ? ro.d : null, mOff: ro ? ro.m : null,
      dOn: rn ? rn.d : null, mOn: rn ? rn.m : null,
    });
  }
  geometry.targets.push({
    tag, stand: tgt.stand, ji: tgt.ji, center: off.center, record: off.record,
    style: off.style, armsCount: off.arms.length,
    wedgeCountOff: off.wedges.length, wedgeCountOn: on.wedges.length,
    roundedCount: rounded.length, sharpCount: pairs.length - rounded.length,
    biarcFiredOrders: fired, pairs, h5,
    routesOff: off.routes, routesOn: on.routes,
  });
  // What-if pixel counts.
  const offBuf = shots.get("off"), onBuf = shots.get("on");
  const base = diffCount(offBuf, onBuf);
  const ctrl = diffCount(offBuf, shots.get("control"));
  const rows = { tag, stand: tgt.stand, ji: tgt.ji, controlOffOff: ctrl, onOff: base, whatifs: {} };
  for (const id of ["A", "B", "CswapOn", "CswapOff", "Doff", "Don"]) {
    const w = shots.get(id);
    const dOff = diffCount(w, offBuf), dOn = diffCount(w, onBuf);
    rows.whatifs[id] = {
      vsOff: dOff, vsOn: dOn,
      shareToOffPx: base.px > 0 ? 1 - dOff.px / base.px : null,
      shareToOffExact: base.exact > 0 ? 1 - dOff.exact / base.exact : null,
    };
  }
  whatif.targets.push(rows);
  console.log(`${tag}: wedges ${off.wedges.length} rounded ${rounded.length} fired ${JSON.stringify(fired)} control px ${ctrl.px} on-off px ${base.px}`);
}
writeFileSync(join(OUT, "captures.json"), JSON.stringify({ targets: allMeta, geometry: geometry.targets.map((t) => ({ tag: t.tag, wedgeCountOff: t.wedgeCountOff, wedgeCountOn: t.wedgeCountOn, roundedCount: t.roundedCount, sharpCount: t.sharpCount, biarcFiredOrders: t.biarcFiredOrders })) }, null, 1));
writeFileSync(join(OUT, "geometry.json"), JSON.stringify(geometry, null, 1));
writeFileSync(join(OUT, "whatif.json"), JSON.stringify(whatif, null, 1));

// Markdown geometry table (units in the header notes of the report too).
{
  const lines = [];
  lines.push("# K1182 Run F geometry table (from exam/captures/*.json)");
  lines.push("");
  lines.push("Units: distances world units; angles degrees; H4 flank units (and normalized by the tip-to-tip flank span); counts are triangle/quad counts.");
  lines.push("H1 minority = triangles with the minority signed-area sign (whole perimeter / rim tip-to-tip). H2 outside = farthest interior rim point outside triangle (tipA, corner, tipB), corner from the flag-off quadratic; cubic wedges skip H2. H3 radii from two Kasa circle fits split at the best shared rim sample. H6 flips = band quads whose signed area sign differs from their fan segment's.");
  lines.push("");
  for (const t of geometry.targets) {
    lines.push(`## ${t.tag} (record ${t.record}, arms ${t.armsCount}, wedges ${t.wedgeCountOff}, rounded ${t.roundedCount}, biarc fired orders ${JSON.stringify(t.biarcFiredOrders)})`);
    lines.push("");
    lines.push("| wedge (order/k) | flag | branch | H1 whole min/total | H1 rim min/total | H1 back deg | H2 out world | H2 onOff world | H3 r1/r2 world | H3 smaller vs bandIn/bandOut | H3 maxTurn deg | H6 tipA/tipB deg | H6 flips in/out | H6 wrong in/out | H6 maxNorm deg | H4 max flank |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const p of t.pairs) {
      if (!p.rounded) continue;
      for (const [flagName, f] of [["off", p.off], ["on", p.on]]) {
        lines.push(`| ${p.order}/${p.wedgeK} | ${flagName} | ${p.branch} | ${f.h1.whole.minority}/${f.h1.whole.total} | ${f.h1.rim.minority}/${f.h1.rim.total} | ${fmt(f.h1.maxBackwardDeg, 1)} | ${f.h2 ? fmt(f.h2.outsideWorld, 4) : "cubic"} | ${fmt(p.onOffMax, 4)} | ${fmt(f.h3.r1, 3)}/${fmt(f.h3.r2, 3)} | ${fmt(f.h3.smaller, 3)} vs ${fmt(f.h3.bandIn, 4)}/${fmt(f.h3.bandOut, 4)} | ${fmt(f.h3.maxTurnDeg, 1)} | ${fmt(f.h6.tipTurnADeg, 1)}/${fmt(f.h6.tipTurnBDeg, 1)} | ${f.h6.innerFlips}/${f.h6.outerFlips} | ${f.h6.innerWrong}/${f.h6.outerWrong} | ${fmt(f.h6.maxNormalDeg, 1)} | ${fmt(f.h4.maxDiffFlank, 4)} |`);
      }
    }
    lines.push("");
    if (t.h5.length) {
      lines.push("H5 routes (d/m world units):");
      lines.push("");
      lines.push("| route | arms ia/ib | wedge k (order) | d off | d on | m off | m on |");
      lines.push("|---|---|---|---|---|---|---|");
      for (const r of t.h5) lines.push(`| ${r.route} | ${r.ia}/${r.ib} | ${r.wedgeK} (${r.wedgeOrder}) | ${fmt(r.dOff, 4)} | ${fmt(r.dOn, 4)} | ${fmt(r.mOff, 4)} | ${fmt(r.mOn, 4)} |`);
      lines.push("");
    }
    // Swapped-rim reach (task 3C note): emitFan set rMax from the flag rim.
    const sw = t.pairs.filter((p) => p.rounded).map((p) => `order ${p.order}: on-off maxR delta ${fmt(p.maxROn - p.maxROff, 4)} world`);
    lines.push(`Swapped-rim reach (farthest rim vertex from the apex, on minus off): ${sw.join("; ") || "no rounded wedges"}.`);
    lines.push("");
  }
  writeFileSync(join(OUT, "geometry.md"), lines.join("\n"));
}

// What-if markdown.
{
  const lines = [];
  lines.push("# K1182 Run F what-if pixel attribution (300x300 device crops, Run C counting)");
  lines.push("");
  for (const t of whatif.targets) {
    lines.push(`## ${t.tag}: control off/off px>8 ${t.controlOffOff.px} (exact ${t.controlOffOff.exact}); on-off px>8 ${t.onOff.px} (exact ${t.onOff.exact})`);
    lines.push("");
    lines.push("| what-if | vs off px>8 (exact) | vs on px>8 (exact) | share of on-off returned to off (px>8) |");
    lines.push("|---|---|---|---|");
    const names = { A: "A wider-stencil band normals, flag on", B: "B arc-uniform flank, flag on", CswapOn: "C flag off + biarc wedge rim (today's band)", CswapOff: "C flag on band + today's wedge rim", Doff: "D band dropped, flag off", Don: "D band dropped, flag on" };
    for (const id of ["A", "B", "CswapOn", "CswapOff", "Doff", "Don"]) {
      const w = t.whatifs[id];
      lines.push(`| ${names[id]} | ${w.vsOff.px} (${w.vsOff.exact}) | ${w.vsOn.px} (${w.vsOn.exact}) | ${w.shareToOffPx === null ? "n/a" : (w.shareToOffPx * 100).toFixed(1) + "%"} |`);
    }
    lines.push("");
  }
  writeFileSync(join(OUT, "whatif.md"), lines.join("\n"));
}

// Sheet: rows off / on / A / B / CswapOn / CswapOff / Doff / Don, Run C order.
{
  const ROWS = ["off", "on", "A", "B", "CswapOn", "CswapOff", "Doff", "Don"];
  const cells = [];
  for (const row of ROWS) for (const tgt of TARGETS) {
    const tag = `${tgt.stand}_ji${tgt.ji}`;
    cells.push(upscale2(toRGB(decodePNG(shotsByTag.get(tag).get(row)))));
  }
  makeSheet(cells, TARGETS.length, "sheet.png");
  writeFileSync(join(OUT, "sheet_rows.json"), JSON.stringify({ rows: ROWS, columns: TARGETS.map((t) => `${t.stand}_ji${t.ji}`), cell: "200 CSS px crop at sheet.mjs's clip, screenshot at DSF 1.5 (300x300), upscaled 2x" }, null, 1));
}

// Overlays per target: captured rims over the crops at 4x.
// World -> CSS screen is window.__knotView()'s (world * s + x, y);
// CSS -> crop device px is (css - clip) * DSF, then the 4x upscale.
{
  const plot = (img, x, y, col, rad) => {
    for (let yy = Math.max(0, Math.floor(y - rad)); yy <= Math.min(img.H - 1, y + rad); yy++)
      for (let xx = Math.max(0, Math.floor(x - rad)); xx <= Math.min(img.W - 1, x + rad); xx++) {
        const o = (Math.round(yy) * img.W + Math.round(xx)) * 3;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2];
      }
  };
  const line = (img, a, b, col, rad) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let i = 0; i <= n; i++) plot(img, a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n, col, rad);
  };
  for (const tgt of TARGETS) {
    const tag = `${tgt.stand}_ji${tgt.ji}`;
    const { off, on } = capsByTag.get(tag);
    const meta = allMeta.find((m) => m.tag === tag);
    const shots = shotsByTag.get(tag);
    const F = 4;
    const toPx = (cap, wpt) => [( (wpt[0] * cap.view.s + cap.view.x) - meta.clip.x) * DSF * F, ((wpt[1] * cap.view.s + cap.view.y) - meta.clip.y) * DSF * F];
    const drawCap = (img, cap, rimCol, ringCol, apexCol) => {
      for (const w of cap.wedges) {
        const rimPx = [];
        for (let i = 0; i < w.rim.length / 2; i++) rimPx.push(toPx(cap, [w.rim[i * 2], w.rim[i * 2 + 1]]));
        const verts = w.vertices, m = w.rim.length / 2, vCount = verts.length / 2;
        const ringPx = (base) => {
          const pts = [];
          for (let i = 0; i < m; i++) pts.push(toPx(cap, [verts[(base + i) * 2], verts[(base + i) * 2 + 1]]));
          return pts;
        };
        if (vCount >= 1 + 2 * m) {
          const inner = ringPx(1 + m);
          for (let i = 0; i + 1 < m; i++) line(img, inner[i], inner[i + 1], ringCol, 1);
        }
        if (vCount >= 1 + 3 * m) {
          const outer = ringPx(1 + 2 * m);
          for (let i = 0; i + 1 < m; i++) line(img, outer[i], outer[i + 1], ringCol, 1);
        }
        for (let i = 0; i + 1 < rimPx.length; i++) line(img, rimPx[i], rimPx[i + 1], rimCol, 2);
        for (const p of rimPx) plot(img, p[0], p[1], rimCol, 4);
        const ap = toPx(cap, w.apex);
        plot(img, ap[0], ap[1], apexCol, 6);
        line(img, [ap[0] - 12, ap[1]], [ap[0] + 12, ap[1]], apexCol, 2);
        line(img, [ap[0], ap[1] - 12], [ap[0], ap[1] + 12], apexCol, 2);
      }
    };
    const mk = (bgId, draws, file) => {
      const img = upscale(toRGB(decodePNG(shots.get(bgId))), F);
      for (const d of draws) d(img);
      writeFileSync(join(OUT, file), encodePNG(img));
      console.log(`${file}: ${img.W}x${img.H}`);
    };
    mk("off", [(img) => drawCap(img, off, [40, 110, 255], [130, 190, 255], [255, 220, 40])], `overlay_${tag}_off.png`);
    mk("on", [(img) => drawCap(img, on, [255, 50, 50], [255, 150, 150], [255, 220, 40])], `overlay_${tag}_on.png`);
    mk("off", [
      (img) => drawCap(img, off, [40, 110, 255], [130, 190, 255], [255, 220, 40]),
      (img) => drawCap(img, on, [255, 50, 50], [255, 150, 150], [255, 220, 40]),
    ], `overlay_${tag}.png`);
  }
}
console.log("exam done");
