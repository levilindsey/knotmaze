// K1040 timing prototype: K1040 F2's form B evaluated per pixel in one
// WebGL2 fragment pass over a scene export (K868 S1a format), at a given dpr.
// Not the look: the cost of the worst case. docs/design/K1040_junction_field.md
// F5 has the results; run.mjs drives it in headed Chrome.
//
// CPU per frame (timed): world -> device px, arc length, pinned-hat depth
// (K868 3.3), arm spans and group clusters (K868 3.4, simplified: a crossing
// cut at d - 2h), straight-arm corners (q, r, t_a, t_b, V) at cr, and the
// tile lists (16 px tiles: segments within h + W + aa, corners within
// r + h + W + aa). GPU per pixel: the pieces (nearest per chain within sigma,
// 4 kept), the top surface by depth, the exposed-outline terms (side feet with
// a +-3 segment burial window per other member, fills, arcs, endpoints).
"use strict";
(function () {
  const TILE = 16;
  const TW = 2048; // texture width for linear arrays
  const log = (s) => { document.getElementById("log").textContent += s + "\n"; };

  function median(a) { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; }
  function pct(a, q) { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(q * b.length))] : NaN; }

  // ---------------------------------------------------------------- CPU prep
  function prep(scene, opt) {
    const t = {};
    const T0 = performance.now();
    // camera: the scene's own at dpr, or (opt.fit = [w, h] device px) the
    // scene's points fitted into that buffer, as a phone at fit would show it
    let M, pxw, Wpx, Hpx;
    if (opt.fit) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of scene.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
      [Wpx, Hpx] = opt.fit;
      pxw = 0.96 * Math.min(Wpx / (x1 - x0), Hpx / (y1 - y0));
      M = [pxw, 0, 0, pxw, (Wpx - pxw * (x1 + x0)) / 2, (Hpx - pxw * (y1 + y0)) / 2];
    } else {
      const m = scene.camera.worldToCss, d = opt.dpr;
      M = m.map((x) => x * d); pxw = scene.camera.pxPerUnit * d;
      Wpx = Math.round(scene.camera.viewport[0] * d); Hpx = Math.round(scene.camera.viewport[1] * d);
    }
    const dpr = 1; // M is world -> device px
    const h = scene.look.halfWidth, W = scene.look.band;
    const amp = scene.look.depthAmp, win = scene.look.depthWindow * (scene.look.ctrlArc ?? 0.47);
    // vertices: (x, y, s, z) device px, world s, z; attrs (chain, surf, segStart)
    let nv = 0; for (const c of scene.chains) nv += c.pts.length / 2 + (c.closed ? 1 : 0) + 1;
    const vtx = new Float32Array(4 * nv), vat = new Float32Array(4 * nv);
    const chainBase = new Map(), chainLen = new Map(), chainN = new Map();
    let v = 0;
    for (const c of scene.chains) {
      chainBase.set(c.id, v);
      const p = c.pts, n = p.length / 2, cnt = n + (c.closed ? 1 : 0);
      let s = 0, px0 = 0, py0 = 0;
      for (let i = 0; i < cnt; i++) {
        const j = i % n, x = p[2 * j], y = p[2 * j + 1];
        if (i > 0) s += Math.hypot(x - px0, y - py0);
        px0 = x; py0 = y;
        vtx[4 * v] = (M[0] * x + M[2] * y + M[4]) * dpr;
        vtx[4 * v + 1] = (M[1] * x + M[3] * y + M[5]) * dpr;
        vtx[4 * v + 2] = s; vtx[4 * v + 3] = 0;
        vat[4 * v] = c.id; vat[4 * v + 1] = -1; vat[4 * v + 2] = i < cnt - 1 ? 1 : 0;
        v++;
      }
      // sentinel (not a segment start)
      vtx.set(vtx.subarray(4 * (v - 1), 4 * v), 4 * v); vat[4 * v] = -1; vat[4 * v + 1] = -1; vat[4 * v + 2] = 0; v++;
      chainLen.set(c.id, s); chainN.set(c.id, cnt);
    }
    t.transform = performance.now() - T0;

    // depth: pinned hats per chain
    const T1 = performance.now();
    const pins = new Map();
    const addPin = (ch, s, sg) => { if (!pins.has(ch)) pins.set(ch, []); pins.get(ch).push([s, sg]); };
    for (const x of scene.crossings) { addPin(x.a.chain, x.a.s, x.over === "a" ? 1 : -1); addPin(x.b.chain, x.b.s, x.over === "a" ? -1 : 1); }
    for (const [ch, ps] of pins) {
      ps.sort((a, b) => a[0] - b[0]);
      const base = chainBase.get(ch), cnt = chainN.get(ch); if (base === undefined) continue;
      let k = 0;
      for (let i = 0; i < cnt; i++) {
        const s = vtx[4 * (base + i) + 2];
        while (k < ps.length && ps[k][0] < s) k++;
        let z = 0;
        for (const m of [k - 1, k]) {
          if (m < 0 || m >= ps.length) continue;
          const [sm, sg] = ps[m];
          const wl = Math.min(win, m > 0 ? sm - ps[m - 1][0] : win), wr = Math.min(win, m + 1 < ps.length ? ps[m + 1][0] - sm : win);
          const d = s - sm, w = d < 0 ? wl : wr;
          if (w > 0) z += sg * amp * Math.max(0, 1 - Math.abs(d) / w);
        }
        vtx[4 * (base + i) + 3] = z;
      }
    }
    t.depth = performance.now() - T1;

    // groups: arm spans, clusters (union-find), surf per vertex
    const T2 = performance.now();
    const J = scene.junctions, parent = J.map((_, i) => i);
    const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const roots = new Map(); // chain -> [[s, junction]]
    J.forEach((j, ji) => { for (const a of j.arms) { if (!roots.has(a.chain)) roots.set(a.chain, []); roots.get(a.chain).push([a.s, ji]); } });
    for (const r of roots.values()) r.sort((a, b) => a[0] - b[0]);
    const spans = []; // [chain, s0, s1, junction]
    J.forEach((j, ji) => {
      for (const a of j.arms) {
        const L = chainLen.get(a.chain) ?? 0;
        let end = a.dir > 0 ? L : 0, endJ = -1;
        for (const [s, jj] of roots.get(a.chain) ?? []) {
          if (jj === ji) continue;
          if (a.dir > 0 ? (s > a.s && s < end) : (s < a.s && s > end)) { end = s; endJ = jj; }
        }
        for (const [s] of pins.get(a.chain) ?? []) {
          const cut = a.dir > 0 ? s - 2 * h : s + 2 * h;
          if (a.dir > 0 ? (s > a.s && cut < end) : (s < a.s && cut > end)) { end = Math.max(Math.min(cut, end), Math.min(a.s, end)); endJ = -1; if (a.dir < 0) end = Math.min(Math.max(cut, end), Math.max(a.s, end)); }
        }
        if (endJ >= 0) parent[find(ji)] = find(endJ);
        spans.push([a.chain, Math.min(a.s, end), Math.max(a.s, end), ji]);
      }
    });
    for (const [ch, s0, s1, ji] of spans) {
      const base = chainBase.get(ch), cnt = chainN.get(ch); if (base === undefined) continue;
      const g = find(ji);
      for (let i = 0; i < cnt; i++) { const s = vtx[4 * (base + i) + 2]; if (s >= s0 && s <= s1) vat[4 * (base + i) + 1] = g; }
    }
    t.groups = performance.now() - T2;

    // corners: straight arms from the junction centre
    const T3 = performance.now();
    const crn = [];
    const pointAt = (ch, s) => {
      const base = chainBase.get(ch), cnt = chainN.get(ch);
      let lo = 0, hi = cnt - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (vtx[4 * (base + m) + 2] <= s) lo = m; else hi = m; }
      const a = 4 * (base + lo), b = 4 * (base + hi), L = vtx[b + 2] - vtx[a + 2], u = L > 0 ? Math.min(1, Math.max(0, (s - vtx[a + 2]) / L)) : 0;
      return [vtx[a] + u * (vtx[b] - vtx[a]), vtx[a + 1] + u * (vtx[b + 1] - vtx[a + 1]), vtx[a + 3] + u * (vtx[b + 3] - vtx[a + 3])];
    };
    const hp = h * pxw, Wp = W * pxw;
    J.forEach((j, ji) => {
      const g = find(ji);
      const arms = j.arms.map((a) => { const p0 = pointAt(a.chain, a.s), p1 = pointAt(a.chain, a.s + a.dir * 2 * h); return { ang: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), c: p0 }; });
      arms.sort((a, b) => a.ang - b.ang);
      const c = [M[0] * j.c[0] + M[2] * j.c[1] + M[4], M[1] * j.c[0] + M[3] * j.c[1] + M[5], arms[0].c[2]];
      for (let i = 0; i < arms.length; i++) {
        const a0 = arms[i].ang, a1 = i + 1 < arms.length ? arms[i + 1].ang : arms[0].ang + 2 * Math.PI;
        const th = a1 - a0; if (th > Math.PI - 0.02 || th < 0.05) continue;
        const r = (opt.cr / 3) * Math.min(2 * hp, 1.5 * hp * Math.tan(th / 2));
        const bis = a0 + th / 2, bx = Math.cos(bis), by = Math.sin(bis), sn = Math.sin(th / 2);
        const qd = (hp + r) / sn, q = [c[0] + bx * qd, c[1] + by * qd], V = [c[0] + bx * hp / sn, c[1] + by * hp / sn];
        const foot = (ang, sgn) => { const dx = Math.cos(ang), dy = Math.sin(ang), along = (hp + r) * Math.cos(th / 2) / sn; const nx = -dy * sgn, ny = dx * sgn; return [c[0] + dx * along + nx * hp, c[1] + dy * along + ny * hp]; };
        const ta = foot(a0, 1), tb = foot(a1, -1);
        crn.push(q[0], q[1], r, 1, ta[0], ta[1], tb[0], tb[1], V[0], V[1], g, c[2]);
      }
    });
    const nc = crn.length / 12;
    t.corners = performance.now() - T3;

    // tiles
    const T4 = performance.now();
    const ntx = Math.ceil(Wpx / TILE), nty = Math.ceil(Hpx / TILE), nt = ntx * nty;
    const aa = 0.5, R = hp + Wp + aa;
    const segCnt = new Uint32Array(nt), crnCnt = new Uint32Array(nt);
    const segRange = (i) => {
      const a = 4 * i, b = 4 * (i + 1);
      const x0 = Math.min(vtx[a], vtx[b]) - R, x1 = Math.max(vtx[a], vtx[b]) + R, y0 = Math.min(vtx[a + 1], vtx[b + 1]) - R, y1 = Math.max(vtx[a + 1], vtx[b + 1]) + R;
      return [Math.max(0, Math.floor(x0 / TILE)), Math.min(ntx - 1, Math.floor(x1 / TILE)), Math.max(0, Math.floor(y0 / TILE)), Math.min(nty - 1, Math.floor(y1 / TILE))];
    };
    const crnRange = (k) => {
      const o = 12 * k, rr = crn[o + 2] + hp + Wp + aa + 2;
      const xs = [crn[o], crn[o + 4], crn[o + 6], crn[o + 8]], ys = [crn[o + 1], crn[o + 5], crn[o + 7], crn[o + 9]];
      return [Math.max(0, Math.floor((Math.min(...xs) - rr) / TILE)), Math.min(ntx - 1, Math.floor((Math.max(...xs) + rr) / TILE)), Math.max(0, Math.floor((Math.min(...ys) - rr) / TILE)), Math.min(nty - 1, Math.floor((Math.max(...ys) + rr) / TILE))];
    };
    for (let i = 0; i < nv - 1; i++) {
      if (vat[4 * i + 2] < 0.5) continue;
      const [tx0, tx1, ty0, ty1] = segRange(i);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) segCnt[ty * ntx + tx]++;
    }
    for (let k = 0; k < nc; k++) { const [tx0, tx1, ty0, ty1] = crnRange(k); for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) crnCnt[ty * ntx + tx]++; }
    const til = new Uint32Array(4 * nt);
    let off = 0;
    for (let i = 0; i < nt; i++) { til[4 * i] = off; til[4 * i + 1] = 0; off += segCnt[i]; }
    for (let i = 0; i < nt; i++) { til[4 * i + 2] = off; til[4 * i + 3] = 0; off += crnCnt[i]; }
    const idx = new Uint32Array(Math.max(1, Math.ceil(off / TW)) * TW);
    for (let i = 0; i < nv - 1; i++) {
      if (vat[4 * i + 2] < 0.5) continue;
      const [tx0, tx1, ty0, ty1] = segRange(i);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const tt = 4 * (ty * ntx + tx); idx[til[tt] + til[tt + 1]++] = i; }
    }
    for (let k = 0; k < nc; k++) { const [tx0, tx1, ty0, ty1] = crnRange(k); for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const tt = 4 * (ty * ntx + tx); idx[til[tt + 2] + til[tt + 3]++] = k; } }
    t.tiles = performance.now() - T4;
    t.total = performance.now() - T0;
    return { t, vtx, vat, nv, crn: new Float32Array(crn), nc, til, ntx, nty, idx, nidx: off, segCnt, crnCnt, Wpx, Hpx, hp, Wp, aa, pxw };
  }

  // ---------------------------------------------------------------- GL
  const VS = `#version 300 es
  in vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FS = `#version 300 es
  precision highp float; precision highp int; precision highp usampler2D; precision highp sampler2D;
  uniform sampler2D uVtx, uVat, uCrn; uniform usampler2D uTil, uIdx;
  uniform float uH, uW, uAA, uSigma; uniform int uMode;
  out vec4 o;
  ivec2 lin(int i) { return ivec2(i & ${TW - 1}, i >> ${Math.log2(TW)}); }
  vec4 vtx(int i) { return texelFetch(uVtx, lin(i), 0); }
  vec4 vat(int i) { return texelFetch(uVat, lin(i), 0); }
  vec4 crn(int c, int j) { return texelFetch(uCrn, lin(3 * c + j), 0); }
  float segD(vec2 p, vec2 a, vec2 b, out float u, out vec2 c) {
    vec2 ab = b - a; u = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-12), 0.0, 1.0); c = a + u * ab; return length(p - c);
  }
  float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
  bool inTri(vec2 p, vec2 a, vec2 b, vec2 c) {
    float d1 = cross2(b - a, p - a), d2 = cross2(c - b, p - b), d3 = cross2(a - c, p - c);
    return !((d1 < 0.0 || d2 < 0.0 || d3 < 0.0) && (d1 > 0.0 || d2 > 0.0 || d3 > 0.0));
  }
  bool inFill(vec2 x, int c) {
    vec4 A = crn(c, 0), B = crn(c, 1), C = crn(c, 2);
    return A.z > 0.0 && inTri(x, C.xy, B.xy, B.zw) && length(x - A.xy) > A.z;
  }
  float band(float D) { return 1.0 - smoothstep(uW - uAA, uW + uAA, D); }
  void main() {
    vec2 p = gl_FragCoord.xy;
    ivec2 t = ivec2(p) / ${TILE};
    uvec4 T = texelFetch(uTil, t, 0);
    int off = int(T.x), cnt = int(T.y), coff = int(T.z), ccnt = int(T.w);
    float pd[4]; float ps[4]; float pz[4]; int pch[4]; int psf[4]; int pk[4]; vec2 pc[4];
    for (int j = 0; j < 4; ++j) { pd[j] = 1e9; ps[j] = 0.0; pz[j] = 0.0; pch[j] = -1; psf[j] = -1; pk[j] = 0; pc[j] = vec2(0.0); }
    int n = 0, within = 0;
    float reach = uH + uW + uAA;
    for (int i = 0; i < cnt; ++i) {
      int k = int(texelFetch(uIdx, lin(off + i), 0).x);
      vec4 A = vtx(k), B = vtx(k + 1);
      float u; vec2 c; float d = segD(p, A.xy, B.xy, u, c);
      if (d > reach) continue;
      within++;
      vec4 at = vat(k); int ch = int(at.x), sf = int(at.y);
      float s = mix(A.z, B.z, u), z = mix(A.w, B.w, u);
      int slot = -1;
      for (int j = 0; j < 4; ++j) { if (j >= n) break; if (pch[j] == ch && abs(ps[j] - s) <= uSigma) { slot = j; break; } }
      if (slot >= 0) { if (d < pd[slot]) { pd[slot] = d; ps[slot] = s; pz[slot] = z; psf[slot] = sf; pk[slot] = k; pc[slot] = c; } continue; }
      if (n < 4) { slot = n; n++; } else {
        float far = -1.0; for (int j = 0; j < 4; ++j) if (pd[j] > far) { far = pd[j]; slot = j; }
        if (d >= far) continue;
      }
      pd[slot] = d; ps[slot] = s; pz[slot] = z; pch[slot] = ch; psf[slot] = sf; pk[slot] = k; pc[slot] = c;
    }
    // surfaces: a group id, or the piece itself
    int key[4];
    for (int j = 0; j < 4; ++j) key[j] = (j < n && psf[j] >= 0) ? psf[j] : 100000 + j;
    int topKey = -1; float topZ = -1e9, secZ = -1e9;
    for (int j = 0; j < 4; ++j) {
      if (j >= n || pd[j] >= uH) continue;
      float zS = pz[j], dS = pd[j];
      for (int m = 0; m < 4; ++m) if (m < n && m != j && key[m] == key[j] && pd[m] < dS) { dS = pd[m]; zS = pz[m]; }
      if (key[j] == topKey) continue;
      if (zS > topZ) { secZ = topZ; topZ = zS; topKey = key[j]; } else if (zS > secZ) secZ = zS;
    }
    int ncr = 0, fills = 0;
    for (int i = 0; i < ccnt; ++i) {
      int c = int(texelFetch(uIdx, lin(coff + i), 0).x);
      ncr++;
      if (inFill(p, c)) { fills++; vec4 C = crn(c, 2); int g = int(C.z); if (g != topKey && C.w > topZ) { secZ = topZ; topZ = C.w; topKey = g; } }
    }
    float ink = 0.0; int burTests = 0;
    if (topKey >= 0) {
      for (int a = 0; a < 4; ++a) {
        if (a >= n || key[a] != topKey || pd[a] >= uH) continue;
        float D = uH - pd[a];
        if (D > uW + uAA) continue;
        vec2 f = pc[a] + uH * (p - pc[a]) / max(pd[a], 1e-6);
        float bur = 0.0;
        for (int b = 0; b < 4; ++b) {
          if (b >= n || b == a || key[b] != topKey) continue;
          for (int w = -3; w <= 3; ++w) {
            int kk = pk[b] + w; if (kk < 0) continue;
            vec4 at = vat(kk); if (int(at.x) != pch[b] || at.z < 0.5) continue;
            burTests++;
            float u; vec2 c; if (segD(f, vtx(kk).xy, vtx(kk + 1).xy, u, c) < uH - 1e-3) bur = 1.0;
          }
        }
        for (int i = 0; i < ccnt; ++i) {
          int c = int(texelFetch(uIdx, lin(coff + i), 0).x);
          if (int(crn(c, 2).z) == topKey && inFill(f, c)) bur = max(bur, crn(c, 0).w);
        }
        ink = max(ink, (1.0 - bur) * band(D));
      }
      for (int i = 0; i < ccnt; ++i) {
        int c = int(texelFetch(uIdx, lin(coff + i), 0).x);
        vec4 A = crn(c, 0), B = crn(c, 1), C = crn(c, 2);
        if (int(C.z) != topKey) continue;
        float om = A.w;
        vec2 q = A.xy, ta = B.xy, tb = B.zw;
        float s0 = cross2(ta - q, tb - q);
        bool wedge = cross2(ta - q, p - q) * s0 >= 0.0 && cross2(p - q, tb - q) * s0 >= 0.0;
        if (wedge && length(p - q) > A.z) ink = max(ink, om * band(length(p - q) - A.z));
        ink = max(ink, om * band(length(p - ta)));
        ink = max(ink, om * band(length(p - tb)));
        ink = max(ink, (1.0 - om) * band(length(p - C.xy)));
      }
    }
    if (uMode == 1) { o = vec4(float(cnt) / 255.0, float(within) / 255.0, float(n * 16 + min(ncr, 15)) / 255.0, float(min(burTests, 255)) / 255.0); return; }
    vec3 paper = vec3(0.92, 0.9, 0.85);
    vec3 tint = topKey >= 0 ? (topKey >= 100000 ? vec3(0.97, 0.96, 0.92) : vec3(0.85, 0.92, 0.97)) : paper;
    o = vec4(mix(tint, vec3(0.05), ink), 1.0);
  }`;

  const FS_FLOOR = `#version 300 es
  precision highp float; out vec4 o; void main() { o = vec4(0.5); }`;

  function compile(gl, vs, fs) {
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "aPos"); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function tex(gl, unit, w, h, ifmt, fmt, type, data) {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    return t;
  }
  function padTo(arr, comps, Ctor) { const rows = Math.max(1, Math.ceil(arr.length / comps / TW)); const out = new Ctor(rows * TW * comps); out.set(arr); return [out, rows]; }

  async function run(scene, opt) {
    opt = Object.assign({ dpr: 2, cr: 3, frames: 60, sync: 30, prepReps: 15, png: true, crop: null }, opt);
    const res = { scene: scene.name, opt };
    // CPU prep, repeated for a median
    const reps = [];
    let P;
    for (let i = 0; i < opt.prepReps; i++) { P = prep(scene, opt); reps.push(P.t); }
    const keys = Object.keys(reps[0]);
    res.cpu = {}; for (const k of keys) res.cpu[k] = { p50: median(reps.map((r) => r[k])), max: Math.max(...reps.map((r) => r[k])) };
    res.sizes = { vertices: P.nv, corners: P.nc, tiles: P.ntx * P.nty, idx: P.nidx, Wpx: P.Wpx, Hpx: P.Hpx, hPx: P.hp, WPx: P.Wp };
    // per-pixel loop counts implied by the tiles (every pixel of a tile loops its list)
    const tileSeg = Array.from(P.segCnt), tileCrn = Array.from(P.crnCnt);
    res.tileSegments = { max: Math.max(...tileSeg), p95: pct(tileSeg, 0.95), p50: pct(tileSeg, 0.5), nonEmptyP95: pct(tileSeg.filter((x) => x > 0), 0.95), nonEmptyMax: Math.max(...tileSeg) };
    res.tileCorners = { max: Math.max(...tileCrn), p95: pct(tileCrn, 0.95), nonEmptyP95: pct(tileCrn.filter((x) => x > 0), 0.95) };

    const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16; document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("no webgl2");
    gl.getExtension("EXT_color_buffer_float");
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    res.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const tq = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    res.timerQuery = !!tq;
    const T5 = performance.now();
    const [vtxD, vr] = padTo(P.vtx, 4, Float32Array), [vatD] = padTo(P.vat, 4, Float32Array), [crnD, cr] = padTo(P.crn.length ? P.crn : new Float32Array(4), 4, Float32Array);
    tex(gl, 0, TW, vr, gl.RGBA32F, gl.RGBA, gl.FLOAT, vtxD);
    tex(gl, 1, TW, vr, gl.RGBA32F, gl.RGBA, gl.FLOAT, vatD);
    tex(gl, 2, TW, cr, gl.RGBA32F, gl.RGBA, gl.FLOAT, crnD);
    tex(gl, 3, P.ntx, P.nty, gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT, P.til);
    tex(gl, 4, TW, P.idx.length / TW, gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, P.idx);
    res.cpu.upload = { p50: performance.now() - T5 };
    const prog = compile(gl, VS, FS), floor = compile(gl, VS, FS_FLOOR);
    gl.useProgram(prog);
    const U = (n) => gl.getUniformLocation(prog, n);
    gl.uniform1i(U("uVtx"), 0); gl.uniform1i(U("uVat"), 1); gl.uniform1i(U("uCrn"), 2); gl.uniform1i(U("uTil"), 3); gl.uniform1i(U("uIdx"), 4);
    gl.uniform1f(U("uH"), P.hp); gl.uniform1f(U("uW"), P.Wp); gl.uniform1f(U("uAA"), P.aa); gl.uniform1f(U("uSigma"), Math.PI * scene.look.halfWidth);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const fbt = gl.createTexture(); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fbt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, P.Wpx, P.Hpx, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbt, 0);
    gl.viewport(0, 0, P.Wpx, P.Hpx);
    const px1 = new Uint8Array(4);
    const draw = (p, mode) => { gl.useProgram(p); if (p === prog) gl.uniform1i(U("uMode"), mode); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    // warm up (compiles, first-use)
    for (let i = 0; i < 3; i++) { draw(prog, 0); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); draw(floor, 0); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); }
    // render sync (K923's method): each draw ends in a 1 px readPixels
    const sync = (p) => { const ts = []; for (let i = 0; i < opt.sync; i++) { const a = performance.now(); draw(p, 0); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); ts.push(performance.now() - a); } return ts; };
    const sF = [], sP = [];
    for (let r = 0; r < 3; r++) { sF.push(...sync(floor)); sP.push(...sync(prog)); }
    res.renderSync = { floorP50: median(sF), protoP50: median(sP), protoP95: pct(sP, 0.95), overFloorP50: median(sP) - median(sF) };
    // timer queries, one per frame on rAF
    if (tq) {
      const qs = [];
      for (let i = 0; i < opt.frames; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const q = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q); draw(prog, 0); gl.endQuery(tq.TIME_ELAPSED_EXT); qs.push(q);
      }
      const ms = []; let disjoint = 0;
      for (let tries = 0; tries < 200 && ms.length < qs.length; tries++) {
        await new Promise((r) => requestAnimationFrame(r));
        for (let i = 0; i < qs.length; i++) {
          if (!qs[i]) continue;
          if (gl.getQueryParameter(qs[i], gl.QUERY_RESULT_AVAILABLE)) { if (gl.getParameter(tq.GPU_DISJOINT_EXT)) disjoint++; ms.push(gl.getQueryParameter(qs[i], gl.QUERY_RESULT) / 1e6); gl.deleteQuery(qs[i]); qs[i] = null; }
        }
      }
      res.timer = { n: ms.length, p50: median(ms), p95: pct(ms, 0.95), max: Math.max(...ms), disjoint };
      const bb = [];
      for (let i = 0; i < 40; i++) { const q2 = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q2); draw(prog, 0); gl.endQuery(tq.TIME_ELAPSED_EXT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); for (let k = 0; k < 100 && !gl.getQueryParameter(q2, gl.QUERY_RESULT_AVAILABLE); k++) await new Promise((r) => requestAnimationFrame(r)); bb.push(gl.getQueryParameter(q2, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q2); }
      res.timerSynced = { n: bb.length, p50: median(bb), p95: pct(bb, 0.95), max: Math.max(...bb) };
    }
    // stats pass: per-pixel counts
    draw(prog, 1);
    const all = new Uint8Array(P.Wpx * P.Hpx * 4);
    gl.readPixels(0, 0, P.Wpx, P.Hpx, gl.RGBA, gl.UNSIGNED_BYTE, all);
    const hist = (sel) => { const hh = new Uint32Array(256); for (let i = 0; i < all.length; i += 4) hh[sel(i)]++; return hh; };
    const q = (hh, f) => { let tot = 0; for (const x of hh) tot += x; let acc = 0; for (let i = 0; i < 256; i++) { acc += hh[i]; if (acc >= f * tot) return i; } return 255; };
    const mx = (hh) => { for (let i = 255; i >= 0; i--) if (hh[i]) return i; return 0; };
    const hLoop = hist((i) => all[i]), hWithin = hist((i) => all[i + 1]), hPieces = hist((i) => all[i + 2] >> 4), hCrn = hist((i) => all[i + 2] & 15), hBur = hist((i) => all[i + 3]);
    res.perPixel = {
      loop: { max: mx(hLoop), p95: q(hLoop, 0.95), p50: q(hLoop, 0.5) },
      withinReach: { max: mx(hWithin), p95: q(hWithin, 0.95), p50: q(hWithin, 0.5) },
      pieces: { max: mx(hPieces), p95: q(hPieces, 0.95) },
      corners: { max: mx(hCrn), p95: q(hCrn, 0.95) },
      burialSegTests: { max: mx(hBur), p95: q(hBur, 0.95), p99: q(hBur, 0.99) },
    };
    if (opt.png) {
      draw(prog, 0);
      gl.readPixels(0, 0, P.Wpx, P.Hpx, gl.RGBA, gl.UNSIGNED_BYTE, all);
      const cv = document.createElement("canvas"); cv.width = P.Wpx; cv.height = P.Hpx;
      const c2 = cv.getContext("2d"), img = c2.createImageData(P.Wpx, P.Hpx);
      img.data.set(all); // row 0 is gl y 0, which is scene y 0 (y down): no flip
      c2.putImageData(img, 0, 0);
      res.png = cv.toDataURL("image/png");
    }
    const lost = gl.isContextLost(); res.contextLost = lost;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return res;
  }
  // K923's disc search, for a desktop -> Pixel ratio: N integer fetches a
  // pixel over a disc, at the Pixel's buffer (822x1506). The Pixel measured
  // 6.75 ms over its floor for 45 taps and 4.50 ms for 29 (K923_s3_bench.md).
  async function calib(opt) {
    opt = Object.assign({ w: 822, h: 1506, taps: [29, 45], sync: 40 }, opt);
    const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16; document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { antialias: false, powerPreference: "high-performance" });
    const n = opt.w * opt.h, data = new Uint32Array(n);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 4294967295) >>> 0;
    tex(gl, 0, opt.w, opt.h, gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT, data);
    const offs = []; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) offs.push([x, y]);
    offs.sort((a, b) => a[0] * a[0] + a[1] * a[1] - (b[0] * b[0] + b[1] * b[1]));
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const fbt = gl.createTexture(); gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, fbt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, opt.w, opt.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbt, 0);
    gl.viewport(0, 0, opt.w, opt.h);
    const px1 = new Uint8Array(4);
    const floor = compile(gl, VS, FS_FLOOR);
    const sync = (p) => { const ts = []; for (let i = 0; i < opt.sync; i++) { const a = performance.now(); gl.useProgram(p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); ts.push(performance.now() - a); } return ts; };
    const out = { w: opt.w, h: opt.h, taps: {} };
    for (const N of opt.taps) {
      const list = offs.slice(0, N).map(([x, y]) => `acc ^= texelFetch(uL, clamp(q + ivec2(${x}, ${y}), ivec2(0), sz), 0).x;`).join("\n");
      const fs = `#version 300 es
      precision highp float; precision highp int; precision highp usampler2D;
      uniform usampler2D uL; out vec4 o;
      void main() { ivec2 q = ivec2(gl_FragCoord.xy), sz = textureSize(uL, 0) - 1; uint acc = 0u;
      ${list}
      o = vec4(float(acc & 255u) / 255.0); }`;
      const prog = compile(gl, VS, fs);
      gl.useProgram(prog); gl.uniform1i(gl.getUniformLocation(prog, "uL"), 0);
      sync(prog); sync(floor);
      const sF = [], sP = [];
      for (let r = 0; r < 3; r++) { sF.push(...sync(floor)); sP.push(...sync(prog)); }
      out.taps[N] = { floorP50: median(sF), p50: median(sP), overFloorP50: median(sP) - median(sF) };
      const tq = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      if (tq) {
        const one = async (p) => { const ms = []; for (let i = 0; i < 40; i++) { const q = gl.createQuery(); gl.beginQuery(tq.TIME_ELAPSED_EXT, q); gl.useProgram(p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.endQuery(tq.TIME_ELAPSED_EXT); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); for (let k = 0; k < 100 && !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE); k++) await new Promise((r) => requestAnimationFrame(r)); ms.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6); gl.deleteQuery(q); } return ms; };
        const tP = await one(prog), tF = await one(floor);
        Object.assign(out.taps[N], { timerP50: median(tP), timerFloorP50: median(tF) });
      }
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove();
    return out;
  }
  window.k1040 = { run, prep, calib };
  log("k1040 proto ready");
})();
