// K923: micro-benchmark of K915 Step 6's GPU borders (label pass + band
// pass) against a full-screen disc search, on a K868 scene's geometry.
// Standalone WebGL2, no app code. URL keys:
//   scene=<K868 scene> (muse_hash)  v=floor|label|band|both|search|labelsearch|dbg
//   z=<zoom over the fit> (1)  poi=dense|<poi name> (the 6x centre)
//   w,h,dpr (411, 753, 2: the canvas is w*dpr x h*dpr device px)
//   sw=0 (no switch strips)  lr=<n> (label target at 1/n resolution)
//   count=1 (desktop: fragment counts into window.__k923Counts)
//   sync=0 (no 1-px readPixels ending each frame; see the frame loop)
//   diagnostics: step=<k> (every k-th chain point), fmt=8 (RGBA8UI label:
//   the 16-bit fields TRUNCATED, so the band's tests are garbled; a size
//   proxy only), fmt=32 (RGBA8UI, fields packed: chain 8 | s 11 | cluster 8
//   | z 5 bits, the strips' z quantized alike; the band's tests hold),
//   bf=raster (band strips without fetch/discard)
// window.__k923RenderLoop(n) times n renders in one task (sync.mjs drives it).
// Every frame starts with a zero-count marker draw, so bench_frame.mjs
// times every variant (floor included) from the same point. band and
// search read a label rendered once at load; label/both/labelsearch
// render it every frame.
"use strict";
(async function () {
  const Q = new URLSearchParams(location.search);
  const SCENE = Q.get("scene") || "muse_hash";
  const V = Q.get("v") || "both";
  const ZOOM = +(Q.get("z") || 1);
  const POI = Q.get("poi") || "dense";
  const CW = +(Q.get("w") || 411), CH = +(Q.get("h") || 753), DPR = +(Q.get("dpr") || 2);
  const FW = Math.round(CW * DPR), FH = Math.round(CH * DPR);
  const COUNT = Q.get("count") === "1";
  const SW = Q.get("sw") !== "0";
  const LR = Math.max(1, Math.round(+(Q.get("lr") || 1)));
  const STEP = Math.max(1, Math.round(+(Q.get("step") || 1))); // keep every STEP-th chain point (diagnostic)
  const FMT8 = Q.get("fmt") === "8"; // RGBA8UI label target (diagnostic: the integer target's size)
  const PACK = Q.get("fmt") === "32"; // 32-bit packed label (RGBA8UI): chain 8 | s 11 | cluster 8 | z 5
  const BRASTER = Q.get("bf") === "raster"; // band/switch strips without fetch or discard (diagnostic)
  const LW = Math.ceil(FW / LR), LH = Math.ceil(FH / LR);
  const stampEl = document.getElementById("stamp");
  let ready = false, frames = 0, stampText = "P9 K923 loading";
  const setStamp = (t) => { stampText = t; stampEl.textContent = t; };
  window.__knotPerf = () => ({ state: ready ? "frozen" : "loading", asleep: ready, plucks: 0 });
  window.__knotRenderer = () => (ready ? { k923: 1 } : null);
  const fail = (msg) => { setStamp("P9 K923 ERROR " + msg); window.__k923Error = String(msg); throw new Error(msg); };

  const canvas = document.getElementById("c");
  canvas.width = FW; canvas.height = FH;
  canvas.style.width = CW + "px"; canvas.style.height = CH + "px";
  const gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
  if (!gl) fail("no webgl2");
  let lost = 0;
  canvas.addEventListener("webglcontextlost", (e) => { lost++; e.preventDefault(); setStamp(stampText + " LOST"); });

  const scene = await (await fetch(`../K868/scenes/${SCENE}.json`, { cache: "no-store" })).json();
  const h = scene.look.halfWidth, Wworld = scene.look.band;
  const paperHex = scene.look.paper || "#e6e9ee";
  const paper = [1, 3, 5].map((i) => parseInt(paperHex.slice(i, i + 2), 16) / 255);

  // ---- chains: arc length, tangents --------------------------------------
  const chains = [], byId = new Map();
  let zmax = 0;
  for (const c of scene.chains) {
    let cp = c.pts, cz = c.z;
    if (STEP > 1) {
      const m0 = cp.length / 2, keep = [];
      for (let i = 0; i < m0; i += STEP) keep.push(i);
      if (!c.closed && keep[keep.length - 1] !== m0 - 1) keep.push(m0 - 1);
      cp = keep.flatMap((i) => [cp[2 * i], cp[2 * i + 1]]); cz = keep.map((i) => cz[i]);
    }
    const n = cp.length / 2;
    if (n < 2) continue;
    const P = cp, Z = cz;
    const S = new Float64Array(n + 1);
    for (let i = 1; i < n; i++) S[i] = S[i - 1] + Math.hypot(P[2 * i] - P[2 * i - 2], P[2 * i + 1] - P[2 * i - 1]);
    let L = S[n - 1];
    if (c.closed) L += Math.hypot(P[0] - P[2 * n - 2], P[1] - P[2 * n - 1]);
    S[n] = L;
    const T = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      let a = i - 1, b = i + 1;
      if (c.closed) { a = (a + n) % n; b %= n; } else { a = Math.max(a, 0); b = Math.min(b, n - 1); }
      const tx = P[2 * b] - P[2 * a], ty = P[2 * b + 1] - P[2 * a + 1], l = Math.hypot(tx, ty) || 1;
      T[2 * i] = tx / l; T[2 * i + 1] = ty / l;
    }
    for (let i = 0; i < n; i++) zmax = Math.max(zmax, Math.abs(Z[i]));
    const ch = { id: c.id, closed: !!c.closed, n, P, Z, S, L, T, cl: new Uint16Array(n) };
    chains.push(ch); byId.set(c.id, ch);
  }
  zmax = zmax * 1.05 + 1e-6;
  function at(ch, s) {
    const L = ch.L, n = ch.n, S = ch.S, P = ch.P;
    if (ch.closed) s = ((s % L) + L) % L; else s = Math.min(Math.max(s, 0), L);
    let lo = 0, hi = ch.closed ? n : n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const i = lo, j = (i + 1) % n;
    const f = Math.min(Math.max((s - S[i]) / ((S[i + 1] - S[i]) || 1), 0), 1);
    let tx = P[2 * j] - P[2 * i], ty = P[2 * j + 1] - P[2 * i + 1];
    const l = Math.hypot(tx, ty) || 1;
    return { x: P[2 * i] + tx * f, y: P[2 * i + 1] + ty * f, z: ch.Z[i] + (ch.Z[j] - ch.Z[i]) * f, tx: tx / l, ty: ty / l, i };
  }
  // The strips' depth key; with fmt=32 it is quantized like the packed label's 5 bits.
  const zq = (z) => Math.round(Math.min(Math.max(z / zmax * 0.5 + 0.5, 0), 1) * (PACK ? 31 : 4095));
  const s16 = (ch, s) => Math.round(Math.min(Math.max(s / ch.L, 0), 1) * 65535);
  const sig16 = (ch) => Math.max(8, Math.round(Math.PI * h / ch.L * 65535)); // sigma = pi*h (K915 Step 6)

  // ---- junction clusters on the arms' tube points --------------------------
  const J = scene.junctions || [];
  const RCL2 = (3.5 * h) ** 2;
  J.forEach((jn, ji) => {
    for (const arm of jn.arms) {
      const ch = byId.get(arm.chain);
      if (!ch) continue;
      const a = at(ch, arm.s);
      for (const d of [-1, 1]) {
        let k = a.i + (d > 0 ? 1 : 0);
        for (let step = 0; step < ch.n; step++, k += d) {
          let kk = k;
          if (ch.closed) kk = ((k % ch.n) + ch.n) % ch.n; else if (k < 0 || k >= ch.n) break;
          const dx = ch.P[2 * kk] - jn.c[0], dy = ch.P[2 * kk + 1] - jn.c[1];
          if (dx * dx + dy * dy > RCL2) break;
          ch.cl[kk] = ji + 1;
        }
      }
    }
  });

  // ---- camera: fit the bbox (+h) to the canvas; zoom about a POI ----------
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const ch of chains) for (let i = 0; i < ch.n; i++) {
    const x = ch.P[2 * i], y = ch.P[2 * i + 1];
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  bx0 -= h; by0 -= h; bx1 += h; by1 += h;
  const sFit = Math.min(FW / ((bx1 - bx0) * 1.04), FH / ((by1 - by0) * 1.04));
  const scale = sFit * ZOOM;
  let cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, poiName = "fit";
  if (ZOOM > 1) {
    if (POI !== "dense") {
      const p = (scene.pois || []).find((q) => q.name === POI);
      if (!p) fail("no poi " + POI);
      cx = p.at[0]; cy = p.at[1]; poiName = POI;
    } else {
      const hw = FW / scale / 2, hh = FH / scale / 2;
      const cands = J.map((jn) => ({ name: jn.id, x: jn.c[0], y: jn.c[1] }));
      scene.crossings.forEach((c, k) => { const ch = byId.get(c.a.chain); if (ch) { const p = at(ch, c.a.s); cands.push({ name: "x" + k, x: p.x, y: p.y }); } });
      let best = -1;
      for (const c of cands) {
        let cnt = 0;
        for (const ch of chains) { const P = ch.P; for (let i = 0; i < ch.n; i++) if (Math.abs(P[2 * i] - c.x) < hw && Math.abs(P[2 * i + 1] - c.y) < hh) cnt++; }
        if (cnt > best) { best = cnt; cx = c.x; cy = c.y; poiName = c.name; }
      }
    }
  }
  const offX = FW / 2 - cx * scale, offY = FH / 2 - cy * scale;
  const Wpx = Wworld * scale;

  // ---- label geometry: tubes, fills, caps ----------------------------------
  const LV = { pos: [], z: [], s: [], id: [], idx: [] };
  let lvN = 0;
  const lvert = (x, y, z, sN, a, b, c) => { LV.pos.push(x, y); LV.z.push(z); LV.s.push(sN); LV.id.push(a, b, c, 0); return lvN++; };
  for (const ch of chains) {
    const n = ch.n, m = ch.closed ? n + 1 : n, fl = ch.closed ? 4 : 0, base = lvN;
    for (let k = 0; k < m; k++) {
      const i = k % n, x = ch.P[2 * i], y = ch.P[2 * i + 1], nx = -ch.T[2 * i + 1], ny = ch.T[2 * i];
      const sN = k === n ? 1 : ch.S[i] / ch.L;
      lvert(x + h * nx, y + h * ny, ch.Z[i], sN, ch.id + 1, ch.cl[i], fl);
      lvert(x - h * nx, y - h * ny, ch.Z[i], sN, ch.id + 1, ch.cl[i], fl);
    }
    for (let k = 0; k < m - 1; k++) { const a = base + 2 * k, b = a + 2; LV.idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  const arcs = [];
  J.forEach((jn, ji) => {
    const c = jn.c, arms = [];
    let zs = 0;
    for (const arm of jn.arms) {
      const ch = byId.get(arm.chain);
      if (!ch) continue;
      const a = at(ch, arm.s);
      arms.push({ ux: a.tx * arm.dir, uy: a.ty * arm.dir, ang: Math.atan2(a.ty * arm.dir, a.tx * arm.dir) });
      zs += a.z;
    }
    if (arms.length < 2) return;
    const zj = zs / arms.length;
    arms.sort((p, q) => p.ang - q.ang);
    const ring = [];
    for (let k = 0; k < arms.length; k++) {
      const A = arms[k], B = arms[(k + 1) % arms.length];
      let th = B.ang - A.ang;
      if (k === arms.length - 1) th += 2 * Math.PI;
      let nax = -A.uy, nay = A.ux; if (nax * B.ux + nay * B.uy < 0) { nax = -nax; nay = -nay; }
      let nbx = -B.uy, nby = B.ux; if (nbx * A.ux + nby * A.uy < 0) { nbx = -nbx; nby = -nby; }
      if (th > 0.1745 && th < 3.054) {
        const r = h;
        let mx = A.ux + B.ux, my = A.uy + B.uy;
        const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
        const d = (h + r) / Math.sin(th / 2), fx = c[0] + mx * d, fy = c[1] + my * d;
        const a0 = Math.atan2(-nay, -nax), a1 = Math.atan2(-nby, -nbx);
        let sw = a1 - a0;
        while (sw > Math.PI) sw -= 2 * Math.PI;
        while (sw < -Math.PI) sw += 2 * Math.PI;
        const K = Math.max(2, Math.ceil(Math.abs(sw) / (Math.PI / 12))), pts = [];
        for (let q = 0; q <= K; q++) { const an = a0 + sw * q / K, ux = Math.cos(an), uy = Math.sin(an); pts.push([fx + r * ux, fy + r * uy, ux, uy]); }
        for (const p of pts) ring.push([p[0], p[1]]);
        arcs.push({ pts, ji, z: zj });
      } else {
        ring.push([c[0] + h * nax, c[1] + h * nay], [c[0] + h * nbx, c[1] + h * nby]);
      }
    }
    const ci = lvert(c[0], c[1], zj, 0, 0, ji + 1, 1), r0 = lvN;
    for (const p of ring) lvert(p[0], p[1], zj, 0, 0, ji + 1, 1);
    for (let q = 0; q < ring.length; q++) LV.idx.push(ci, r0 + q, r0 + (q + 1) % ring.length);
  });
  const caps = [];
  for (const de of scene.deadEnds || []) {
    const ch = byId.get(de.chain);
    if (!ch) continue;
    const a = at(ch, de.s), sg = de.s < ch.L / 2 ? -1 : 1;
    const ux = a.tx * sg, uy = a.ty * sg, nx = -uy, ny = ux, K = 12, pts = [];
    for (let q = 0; q <= K; q++) {
      const an = -Math.PI / 2 + Math.PI * q / K, dx = ux * Math.cos(an) + nx * Math.sin(an), dy = uy * Math.cos(an) + ny * Math.sin(an);
      pts.push([a.x + h * dx, a.y + h * dy, dx, dy]);
    }
    const sN = Math.min(Math.max(de.s / ch.L, 0), 1), fl = 2 | (ch.closed ? 4 : 0);
    const ci = lvert(a.x, a.y, a.z, sN, ch.id + 1, 0, fl), r0 = lvN;
    for (const p of pts) lvert(p[0], p[1], a.z, sN, ch.id + 1, 0, fl);
    for (let q = 0; q < K; q++) LV.idx.push(ci, r0 + q, r0 + q + 1);
    caps.push({ pts, ch, s: de.s, z: a.z });
  }

  // ---- band geometry: a strip W wide inside every outline piece -----------
  const BV = { q: [], n: [], t: [], m: [], sig: [], idx: [] };
  let bvN = 0;
  const bstrip = (pts) => { // [x, y, nx, ny, chain, s16, cluster, flags, sig]
    const base = bvN;
    for (const p of pts) for (let t = 0; t < 2; t++) { BV.q.push(p[0], p[1]); BV.n.push(p[2], p[3]); BV.t.push(t); BV.m.push(p[4], p[5], p[6], p[7]); BV.sig.push(p[8]); bvN++; }
    for (let k = 0; k < pts.length - 1; k++) { const a = base + 2 * k, b = a + 2; BV.idx.push(a, a + 1, b, a + 1, b + 1, b); }
  };
  for (const ch of chains) {
    const n = ch.n, m = ch.closed ? n + 1 : n, sg = sig16(ch), fl = ch.closed ? 4 : 0;
    for (const side of [1, -1]) {
      const pts = [];
      for (let k = 0; k < m; k++) {
        const i = k % n, nx = -ch.T[2 * i + 1] * side, ny = ch.T[2 * i] * side;
        pts.push([ch.P[2 * i] + h * nx, ch.P[2 * i + 1] + h * ny, nx, ny, ch.id + 1, k === n ? 65535 : s16(ch, ch.S[i]), ch.cl[i], (zq(ch.Z[i]) << 4) | fl, sg]);
      }
      bstrip(pts);
    }
  }
  for (const a of arcs) bstrip(a.pts.map((p) => [p[0], p[1], -p[2], -p[3], 0, 0, a.ji + 1, (zq(a.z) << 4) | 1, 8]));
  for (const c of caps) {
    const s = s16(c.ch, c.s), fl = 2 | (c.ch.closed ? 4 : 0), sg = sig16(c.ch);
    bstrip(c.pts.map((p) => [p[0], p[1], p[2], p[3], c.ch.id + 1, s, 0, (zq(c.z) << 4) | fl, sg]));
  }
  // Switch strips (stand-in): one per crossing, W wide, centred on the
  // crossing and running along the over thread's normal for the overlap's
  // length; 3 fetches a fragment.
  const SV = { q: [], n: [], t: [], m: [], m2: [], sig: [], idx: [] };
  let svN = 0;
  if (SW) for (const x of scene.crossings) {
    const oc = x.over === "a" ? x.a : x.b, uc = x.over === "a" ? x.b : x.a;
    const O = byId.get(oc.chain), U = byId.get(uc.chain);
    if (!O || !U) continue;
    const po = at(O, oc.s), pu = at(U, uc.s);
    const sn = Math.abs(po.tx * pu.ty - po.ty * pu.tx);
    const len = Math.min(Math.max(2 * h / Math.max(sn, 1e-3), 2 * h), 6 * h);
    const nx = -po.ty, ny = po.tx;
    const m1 = [O.id + 1, s16(O, oc.s), O.cl[po.i], (zq(po.z) << 4) | (O.closed ? 4 : 0)];
    const m2 = [U.id + 1, s16(U, uc.s), U.cl[pu.i], (zq(pu.z) << 4) | (U.closed ? 4 : 0)];
    const sg = Math.max(sig16(O), sig16(U)), base = svN;
    for (const e of [-0.5, 0.5]) for (let t = 0; t < 2; t++) {
      SV.q.push(po.x + nx * len * e, po.y + ny * len * e); SV.n.push(po.tx, po.ty); SV.t.push(t);
      SV.m.push(...m1); SV.m2.push(...m2); SV.sig.push(sg); svN++;
    }
    SV.idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  // ---- GL programs -------------------------------------------------------
  const LABEL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
layout(location=1) in float a_z;
layout(location=2) in float a_s;
layout(location=3) in uvec4 a_id;
uniform vec3 u_cam; uniform vec2 u_fb; uniform float u_zmax;
out float v_s; out float v_z; flat out uvec4 v_id;
void main() {
  vec2 dev = a_pos * u_cam.x + u_cam.yz;
  float zn = clamp(a_z / u_zmax, -1.0, 1.0);
  float depth = -zn * 0.98 + float(a_id.x) * (0.01 / 65536.0);
  gl_Position = vec4(dev.x / u_fb.x * 2.0 - 1.0, 1.0 - dev.y / u_fb.y * 2.0, depth, 1.0);
  v_s = a_s; v_z = zn; v_id = a_id;
}`;
  const LABEL_FS = `#version 300 es
precision highp float; precision highp int;
in float v_s; in float v_z; flat in uvec4 v_id;
layout(location=0) out uvec4 o;
void main() {
#ifdef PACK32
  // chain 8 bits in .x, cluster 8 in .z (the count's coverage test reads them),
  // s 11 bits split over .y (high 8) and .w (low 3), z 5 bits in .w's low bits.
  uint s11 = uint(clamp(v_s, 0.0, 1.0) * 2047.0 + 0.5);
  uint z5 = uint(clamp(v_z * 0.5 + 0.5, 0.0, 1.0) * 31.0 + 0.5);
  o = uvec4(v_id.x & 255u, s11 >> 3u, v_id.y & 255u, ((s11 & 7u) << 5u) | z5);
#else
  uint s16 = uint(clamp(v_s, 0.0, 1.0) * 65535.0 + 0.5);
  uint zq = uint(clamp(v_z * 0.5 + 0.5, 0.0, 1.0) * 4095.0 + 0.5);
  o = uvec4(v_id.x, s16, v_id.y, (zq << 4u) | (v_id.z & 15u));
#endif
}`;
  const ONE_FS = `#version 300 es
precision highp float;
out vec4 o;
void main() { o = vec4(1.0); }`;
  const BAND_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_q;
layout(location=1) in vec2 a_n;
layout(location=2) in float a_t;
layout(location=3) in uvec4 a_m;
layout(location=4) in float a_sig;
uniform vec3 u_cam; uniform vec2 u_fb; uniform float u_W;
flat out uvec4 v_m; flat out float v_sig; out float v_d; out vec2 v_n;
void main() {
  float off = 0.5 - a_t * (u_W + 1.0);
  vec2 dev = a_q * u_cam.x + u_cam.yz + a_n * off;
  v_d = -0.5 + a_t * (u_W + 1.0);
  v_n = vec2(a_n.x, -a_n.y);
  v_m = a_m; v_sig = a_sig;
  gl_Position = vec4(dev.x / u_fb.x * 2.0 - 1.0, 1.0 - dev.y / u_fb.y * 2.0, 0.0, 1.0);
}`;
  const SW_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_q;
layout(location=1) in vec2 a_n;
layout(location=2) in float a_t;
layout(location=3) in uvec4 a_m;
layout(location=4) in float a_sig;
layout(location=5) in uvec4 a_m2;
uniform vec3 u_cam; uniform vec2 u_fb; uniform float u_W;
flat out uvec4 v_m; flat out uvec4 v_m2; flat out float v_sig; out float v_d; out vec2 v_n;
void main() {
  float off = (a_t - 0.5) * (u_W + 1.0);
  vec2 dev = a_q * u_cam.x + u_cam.yz + a_n * off;
  v_d = off; v_n = vec2(a_n.x, -a_n.y);
  v_m = a_m; v_m2 = a_m2; v_sig = a_sig;
  gl_Position = vec4(dev.x / u_fb.x * 2.0 - 1.0, 1.0 - dev.y / u_fb.y * 2.0, 0.0, 1.0);
}`;
  const FS_HEAD = `#version 300 es
precision highp float; precision highp int; precision highp usampler2D; precision highp sampler2D;
uniform usampler2D u_label; uniform float u_W; uniform float u_lr; uniform ivec2 u_lsz; uniform vec4 u_ink;
out vec4 o;
bool paperL(uvec4 a) { return a.x == 0u && a.z == 0u; }
bool similar(uvec4 a, uvec4 m, float sig) {
  if (a.z != 0u && a.z == m.z) return true;
  if (a.x == 0u || a.x != m.x) return false;
  float ds = abs(float(a.y) - float(m.y));
  if ((m.w & 4u) != 0u) ds = min(ds, 65536.0 - ds);
  return ds <= sig;
}
// fmt=32: unpack to the 16-bit layout's meaning (s rebuilt mid-bin to 16 bits;
// z stays 5 bits, compared with the strips' 5-bit key).
uvec4 U(uvec4 r) {
#ifdef PACK32
  return uvec4(r.x, (((r.y << 3u) | (r.w >> 5u)) << 5u) | 16u, r.z, (r.w & 31u) << 4u);
#else
  return r;
#endif
}
uvec4 L(vec2 fc) { return U(texelFetch(u_label, clamp(ivec2(floor(fc / u_lr)), ivec2(0), u_lsz - 1), 0)); }
`;
  const BAND_FS = FS_HEAD + `
flat in uvec4 v_m; flat in float v_sig; in float v_d; in vec2 v_n;
void main() {
  uvec4 own = L(gl_FragCoord.xy);
#ifndef RASTER
  if (!similar(own, v_m, v_sig)) discard;
#endif
  vec2 nn = v_n * inversesqrt(max(dot(v_n, v_n), 1e-8));
  uvec4 acr = L(gl_FragCoord.xy + nn * (v_d + u_lr));
#ifndef RASTER
  if (similar(acr, v_m, v_sig)) discard;
  if (!paperL(acr) && (acr.w >> 4u) >= (v_m.w >> 4u)) discard;
#endif
#ifdef COUNT
  o = vec4(1.0);
#else
  float cov = clamp(v_d + 0.5, 0.0, 1.0) * clamp(u_W + 0.5 - v_d, 0.0, 1.0);
  o = u_ink * cov;
#endif
}`;
  const SW_FS = FS_HEAD + `
flat in uvec4 v_m; flat in uvec4 v_m2; flat in float v_sig; in float v_d; in vec2 v_n;
void main() {
  uvec4 own = L(gl_FragCoord.xy);
#ifndef RASTER
  if (!similar(own, v_m, v_sig) && !similar(own, v_m2, v_sig)) discard;
#endif
  vec2 nn = v_n * inversesqrt(max(dot(v_n, v_n), 1e-8)) * (u_W * 0.5 + u_lr);
  uvec4 a1 = L(gl_FragCoord.xy + nn), a2 = L(gl_FragCoord.xy - nn);
#ifndef RASTER
  bool sw = (similar(a1, v_m, v_sig) && similar(a2, v_m2, v_sig)) || (similar(a1, v_m2, v_sig) && similar(a2, v_m, v_sig));
  if (!sw) discard;
#endif
#ifdef COUNT
  o = vec4(1.0);
#else
  o = u_ink * clamp(u_W * 0.5 + 0.5 - abs(v_d), 0.0, 1.0);
#endif
}`;
  const FULL_VS = `#version 300 es
void main() { gl_Position = vec4(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0, 0.0, 1.0); }`;
  const SEARCH_FS = FS_HEAD + `
uniform sampler2D u_sigTex; uniform int u_R; uniform float u_R2;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  uvec4 own = U(texelFetch(u_label, p, 0)); // fmt=32 drops the closed flag: search not timed with it
  if (paperL(own)) discard;
  float sig = texelFetch(u_sigTex, ivec2(int(own.x), 0), 0).r;
  float best = 1e9;
  for (int dy = -u_R; dy <= u_R; dy++) {
    int w = int(floor(sqrt(max(u_R2 - float(dy * dy), 0.0))));
    for (int dx = -w; dx <= w; dx++) {
      uvec4 a = U(texelFetch(u_label, clamp(p + ivec2(dx, dy), ivec2(0), u_lsz - 1), 0));
      if (!similar(a, own, sig)) best = min(best, float(dx * dx + dy * dy));
    }
  }
  float cov = clamp(u_W + 0.5 - sqrt(best), 0.0, 1.0);
  if (cov <= 0.0) discard;
  o = u_ink * cov;
}`;
  const VIS_FS = FS_HEAD + `
void main() {
  uvec4 a = L(gl_FragCoord.xy);
  if (paperL(a)) { o = vec4(0.93, 0.93, 0.93, 1.0); return; }
  if (a.x == 0u) { o = vec4(1.0, 0.75, 0.25, 1.0); return; }
  float hue = fract(float(a.x) * 0.618034);
  vec3 c = clamp(abs(mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  c = mix(vec3(1.0), c, 0.5) * (0.55 + 0.45 * float(a.w >> 4u) / 4095.0);
  if (a.z != 0u) c = mix(c, vec3(1.0, 0.75, 0.25), 0.3);
  o = vec4(c, 1.0);
}`;
  const MARK_VS = `#version 300 es
void main() { gl_Position = vec4(0.0, 0.0, 0.0, 1.0); gl_PointSize = 1.0; }`;
  const MARK_FS = `#version 300 es
precision mediump float;
out vec4 o;
void main() { o = vec4(0.0); }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) fail("compile: " + gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs, defs) {
    const p = gl.createProgram();
    const d = (PACK ? "#define PACK32 1\n" : "") + (defs || "");
    const addDefs = (src) => (d ? src.replace("#version 300 es\n", "#version 300 es\n" + d + "\n") : src);
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, addDefs(fs)));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) fail("link: " + gl.getProgramInfoLog(p));
    gl.useProgram(p);
    const set = (name, f, ...v) => { const loc = gl.getUniformLocation(p, name); if (loc) gl[f](loc, ...v); };
    set("u_cam", "uniform3f", scale, offX, offY);
    set("u_fb", "uniform2f", FW, FH);
    set("u_zmax", "uniform1f", zmax);
    set("u_W", "uniform1f", Wpx);
    set("u_lr", "uniform1f", LR);
    set("u_lsz", "uniform2i", LW, LH);
    set("u_ink", "uniform4f", 0, 0, 0, 1);
    set("u_label", "uniform1i", 0);
    set("u_sigTex", "uniform1i", 1);
    const R = Wpx + 0.5;
    set("u_R", "uniform1i", Math.floor(R));
    set("u_R2", "uniform1f", R * R);
    return p;
  }
  const P = {
    label: program(LABEL_VS, LABEL_FS), band: program(BAND_VS, BAND_FS, BRASTER ? "#define RASTER 1" : ""), sw: program(SW_VS, SW_FS, BRASTER ? "#define RASTER 1" : ""),
    search: program(FULL_VS, SEARCH_FS), vis: program(FULL_VS, VIS_FS), mark: program(MARK_VS, MARK_FS),
  };

  // ---- buffers -----------------------------------------------------------
  function vao(attrs, idx) {
    const va = gl.createVertexArray();
    gl.bindVertexArray(va);
    for (const a of attrs) {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, a.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(a.loc);
      if (a.int) gl.vertexAttribIPointer(a.loc, a.size, gl.UNSIGNED_SHORT, 0, 0);
      else gl.vertexAttribPointer(a.loc, a.size, gl.FLOAT, false, 0, 0);
    }
    if (idx) { const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW); }
    gl.bindVertexArray(null);
    return va;
  }
  const vaoLabel = vao([
    { loc: 0, size: 2, data: new Float32Array(LV.pos) }, { loc: 1, size: 1, data: new Float32Array(LV.z) },
    { loc: 2, size: 1, data: new Float32Array(LV.s) }, { loc: 3, size: 4, int: true, data: new Uint16Array(LV.id) },
  ], LV.idx);
  const vaoBand = vao([
    { loc: 0, size: 2, data: new Float32Array(BV.q) }, { loc: 1, size: 2, data: new Float32Array(BV.n) },
    { loc: 2, size: 1, data: new Float32Array(BV.t) }, { loc: 3, size: 4, int: true, data: new Uint16Array(BV.m) },
    { loc: 4, size: 1, data: new Float32Array(BV.sig) },
  ], BV.idx);
  const vaoSw = svN ? vao([
    { loc: 0, size: 2, data: new Float32Array(SV.q) }, { loc: 1, size: 2, data: new Float32Array(SV.n) },
    { loc: 2, size: 1, data: new Float32Array(SV.t) }, { loc: 3, size: 4, int: true, data: new Uint16Array(SV.m) },
    { loc: 4, size: 1, data: new Float32Array(SV.sig) }, { loc: 5, size: 4, int: true, data: new Uint16Array(SV.m2) },
  ], SV.idx) : null;
  const vaoEmpty = gl.createVertexArray();
  const nLabelIdx = LV.idx.length, nBandIdx = BV.idx.length, nSwIdx = SV.idx.length;

  // ---- targets -----------------------------------------------------------
  const labelTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, labelTex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, FMT8 || PACK ? gl.RGBA8UI : gl.RGBA16UI, LW, LH);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const depthRb = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, LW, LH);
  const labelFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, labelFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, labelTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) fail("label fbo incomplete");
  const maxId = chains.reduce((m, c) => Math.max(m, c.id + 1), 0);
  const sigTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, sigTex);
  const sigData = new Float32Array(maxId + 1);
  for (const ch of chains) sigData[ch.id + 1] = sig16(ch);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, maxId + 1, 1, 0, gl.RED, gl.FLOAT, sigData);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ---- passes ------------------------------------------------------------
  const ZERO4 = new Uint32Array(4), ONE1 = new Float32Array([1]);
  function drawLabel(prog) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, labelFbo);
    gl.viewport(0, 0, LW, LH);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    gl.clearBufferuiv(gl.COLOR, 0, ZERO4);
    gl.clearBufferfv(gl.DEPTH, 0, ONE1);
    gl.useProgram(prog || P.label); gl.bindVertexArray(vaoLabel);
    gl.drawElements(gl.TRIANGLES, nLabelIdx, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.invalidateFramebuffer(gl.FRAMEBUFFER, [gl.DEPTH_ATTACHMENT]);
  }
  function clearDefault() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, FW, FH);
    gl.clearColor(paper[0], paper[1], paper[2], 1); gl.clear(gl.COLOR_BUFFER_BIT);
  }
  function drawBand(pb, ps) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, labelTex);
    gl.useProgram(pb || P.band); gl.bindVertexArray(vaoBand);
    gl.drawElements(gl.TRIANGLES, nBandIdx, gl.UNSIGNED_INT, 0);
    if (vaoSw) { gl.useProgram(ps || P.sw); gl.bindVertexArray(vaoSw); gl.drawElements(gl.TRIANGLES, nSwIdx, gl.UNSIGNED_INT, 0); }
    gl.disable(gl.BLEND);
  }
  function drawFull(prog, blend) {
    if (blend) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sigTex);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, labelTex);
    gl.useProgram(prog); gl.bindVertexArray(vaoEmpty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }

  // Taps of the search's disc (radius W + 0.5).
  const R = Wpx + 0.5;
  let taps = 0;
  for (let dy = -Math.floor(R); dy <= Math.floor(R); dy++) taps += 2 * Math.floor(Math.sqrt(Math.max(R * R - dy * dy, 0))) + 1;
  const info = {
    scene: SCENE, v: V, zoom: ZOOM, poi: poiName, fb: [FW, FH], label: [LW, LH], lr: LR, Wpx: +Wpx.toFixed(3), scale: +scale.toFixed(4),
    taps, labelVerts: lvN, labelTris: nLabelIdx / 3, bandVerts: bvN, bandTris: nBandIdx / 3, switchStrips: svN / 4,
    fills: J.length, arcs: arcs.length, caps: caps.length, sw: SW,
  };
  window.__k923Info = info;

  drawLabel(); // the static label band/search read
  clearDefault();

  if (COUNT) {
    try { window.__k923Counts = doCounts(); } catch (e) { window.__k923Counts = { error: String(e && e.message || e) }; }
  }

  // ---- frame loop --------------------------------------------------------
  // Chrome's WebGL finish() is a flush (it returns without waiting for the
  // GPU), so bench_frame's first-draw -> finish() alone times the CPU's
  // submission. sync=1 (the default) ends every frame with a 1-px readPixels,
  // which cannot return before the GPU is done: bench_frame's frameMs then
  // covers the passes' GPU time. __k923RenderLoop(n) is K892's render-sync
  // measure (scripts/phone_pass/walk.mjs renderLoop): n back-to-back renders,
  // each ended by the readback, in one task.
  const SYNC = Q.get("sync") !== "0";
  const px1 = new Uint8Array(4);
  const base = `P9 K923 v=${V} ${SCENE} z=${ZOOM} poi=${poiName} W=${Wpx.toFixed(2)}px ${FW}x${FH} lr=${LR}${SW ? "" : " sw=0"}${SYNC ? "" : " sync=0"}${STEP > 1 ? " step=" + STEP : ""}${FMT8 ? " fmt=8" : ""}${PACK ? " fmt=32" : ""}${BRASTER ? " bf=raster" : ""}`;
  setStamp(base + " warm");
  function passes() {
    if (V === "label" || V === "both" || V === "labelsearch" || V === "dbg") drawLabel();
    clearDefault();
    if (V === "dbg") drawFull(P.vis, false);
    if (V === "band" || V === "both" || V === "dbg") drawBand();
    if (V === "search" || V === "labelsearch") drawFull(P.search, true);
  }
  function frame() {
    requestAnimationFrame(frame);
    gl.useProgram(P.mark); gl.bindVertexArray(vaoEmpty); gl.drawArrays(gl.POINTS, 0, 0); // the timing marker
    passes();
    if (SYNC) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);
    if (++frames === 30) { ready = true; setStamp(base + (lost ? " LOST" : "")); }
  }
  requestAnimationFrame(frame);
  window.__k923Lost = () => lost;
  window.__k923RenderLoop = (n = 60, warm = 10) => {
    const once = () => { const t0 = performance.now(); passes(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); return performance.now() - t0; };
    for (let i = 0; i < warm; i++) once();
    const ts = [];
    for (let i = 0; i < n; i++) ts.push(once());
    const mean = ts.reduce((a, b) => a + b, 0) / ts.length;
    ts.sort((a, b) => a - b);
    const q = (f) => +ts[Math.min(ts.length - 1, Math.floor(f * ts.length))].toFixed(3);
    return { n: ts.length, median: q(0.5), p10: q(0.1), p90: q(0.9), p95: q(0.95), max: +ts[ts.length - 1].toFixed(3), mean: +mean.toFixed(3), lost };
  };

  // ---- counts (desktop) --------------------------------------------------
  function doCounts() {
    if (!gl.getExtension("EXT_color_buffer_float")) return { error: "no EXT_color_buffer_float" };
    const fmt = gl.getExtension("EXT_float_blend") ? gl.RGBA32F : gl.RGBA16F;
    const mk = (w, hh, depth) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, hh);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (depth) { const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, hh); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("count fbo incomplete");
      return { f, w, hh };
    };
    const begin = (c) => { gl.bindFramebuffer(gl.FRAMEBUFFER, c.f); gl.viewport(0, 0, c.w, c.hh); gl.clearBufferfv(gl.COLOR, 0, new Float32Array(4)); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); };
    const sum = (c) => { const b = new Float32Array(c.w * c.hh * 4); gl.readPixels(0, 0, c.w, c.hh, gl.RGBA, gl.FLOAT, b); let s = 0; for (let i = 0; i < b.length; i += 4) s += b[i]; gl.disable(gl.BLEND); return Math.round(s); };
    const out = { fmt: fmt === gl.RGBA32F ? "RGBA32F" : "RGBA16F" };
    const cl = mk(LW, LH, true), cf = mk(FW, FH, false);
    const pOne = program(LABEL_VS, ONE_FS);
    // label: every fragment rasterized, then those passing the depth test in draw order
    begin(cl); gl.disable(gl.DEPTH_TEST); gl.useProgram(pOne); gl.bindVertexArray(vaoLabel); gl.drawElements(gl.TRIANGLES, nLabelIdx, gl.UNSIGNED_INT, 0);
    out.labelRaster = sum(cl);
    begin(cl); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.clearBufferfv(gl.DEPTH, 0, ONE1);
    gl.useProgram(pOne); gl.bindVertexArray(vaoLabel); gl.drawElements(gl.TRIANGLES, nLabelIdx, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
    out.labelDepthPass = sum(cl);
    // label: covered pixels (the final label)
    drawLabel();
    gl.bindFramebuffer(gl.FRAMEBUFFER, labelFbo);
    const lb = new Uint32Array(LW * LH * 4);
    gl.readPixels(0, 0, LW, LH, gl.RGBA_INTEGER, gl.UNSIGNED_INT, lb);
    let cov = 0, fill = 0, cap = 0;
    for (let i = 0; i < lb.length; i += 4) { if (lb[i] || lb[i + 2]) { cov++; if (lb[i + 3] & 1) fill++; if (lb[i + 3] & 2) cap++; } }
    out.labelCovered = cov; out.labelFillPx = fill; out.labelCapPx = cap; out.labelPixels = LW * LH;
    // band: rasterized vs inked (edges + arcs + caps; switch strips apart)
    const pbr = program(BAND_VS, BAND_FS, "#define COUNT 1\n#define RASTER 1"), pbi = program(BAND_VS, BAND_FS, "#define COUNT 1");
    const psr = program(SW_VS, SW_FS, "#define COUNT 1\n#define RASTER 1"), psi = program(SW_VS, SW_FS, "#define COUNT 1");
    const one = (prog, va, n) => { begin(cf); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, labelTex); gl.useProgram(prog); gl.bindVertexArray(va); gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_INT, 0); return sum(cf); };
    out.bandRaster = one(pbr, vaoBand, nBandIdx);
    out.bandInk = one(pbi, vaoBand, nBandIdx);
    out.switchRaster = vaoSw ? one(psr, vaoSw, nSwIdx) : 0;
    out.switchInk = vaoSw ? one(psi, vaoSw, nSwIdx) : 0;
    // fetches a frame
    out.bandFetches = 2 * (out.bandRaster) + 3 * out.switchRaster; // upper bound (no early discard)
    out.searchTaps = taps;
    out.searchFetches = FW * FH + cov * (taps + 1); // 1 own fetch everywhere, the disc + sigma on covered px
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    drawLabel();
    return out;
  }
})();
