// K868 S3a3: the band pass, the border look's ink drawn from the label
// (docs/design/K868_s3a3_ink.md step 3; module map: label_app.ts).
//
// STRIPS (pure CPU, buildBandStrips): one instanced quad per outline piece,
// W device pixels wide on the piece's inner side, with the outward normal n
// at both ends:
//   tube edges   each chain segment's two edges at +-h, the normals
//                averaged at the vertices so a chain's strips join, cut
//                where the cluster changes (the label pieces' bounds). A
//                cut piece is exactly its part of the segment's uncut quad
//                (S3a8b call 2): its outline point and normal at a cut are
//                the segment's ends' interpolated, so the outline runs
//                straight across the cut;
//   caps         an open chain's two end half circles (radius h);
//   fill arcs    each drawn corner's arc (radius r about q, tA to tB, the
//                label's fills), normals toward q.
// Each carries its member (chain + 1, cluster + 1, flags; s at both ends
// and its chain's s0 and length, to read the packed word's s) and the
// member's depth at both ends (the tube pass's formula; a fill's is 0.09 x).
//
// THE PASS, per strip fragment, d = its distance inside the outline in
// device pixels (the strip's own coordinate):
//   1. discard unless the label here is the strip's member (simLab);
//   2. across = the label one pixel past the outline (here + n (d + 1));
//      discard if across is the member too: no boundary there;
//   3. DEPTH variant only (K923's rule): discard if across is a surface in
//      front of the member (D2). The default leaves it out: the oracle
//      inks a surface's own outline whatever lies across (K868 S3a3's
//      measurements in the handoff).
//   coverage = clamp(d + 0.5) * clamp(W + 0.5 - d), MAX-blended into C (R
//   of an RGBA8 target the label's size). Two or three fetches a fragment.
// Switch curves (two surfaces swapping in depth inside an overlap) are not
// drawn yet: the handoff lists the switch ink this leaves out.
//
// composite() draws C over the canvas in one colour after app.render().
import type { FieldModel } from "../field/oracle";
import type { LabelCamera } from "./label_pass";
import { compile, type Prog } from "./label_pass";
import { TUBE_FLOATS, type LabelPieces } from "./label_pieces";
import { findSwitchLines, type SwitchLine } from "./label_switch";

/** Floats per strip instance: aQ (outline points), aN (outward normals),
 * aM (chain + 1, cluster + 1, flags, 0), aS (sa, sb, chain s0, chain len),
 * aD (depth at both ends). */
export const BAND_FLOATS = 18;
const F_FILL = 1;
const F_CAP = 2;
const F_CLOSED = 4;
/** A switch line (label_switch.ts): a strip centred on it, aM.w = the fill's cluster + 1. */
const F_SWITCH = 8;

export interface BandStrips {
  strips: Float32Array;
  n: number;
  /** The ink's width in world units (the oracle's W). */
  W: number;
  stats: { edges: number; caps: number; arcs: number; switches: number };
}

/** lines: the switch lines (label_switch.ts). The app passes its cached ones
 * (SwitchCache); left out, the uncached search runs (the probes). */
export function buildBandStrips(m: FieldModel, lp: LabelPieces, lines?: readonly SwitchLine[]): BandStrips {
  const polys = m.polys;
  const h = m.h;
  const out: number[] = [];
  // The tube pass's depth: ranks by key, as label_pieces assigns them.
  const keyOf = (ci: number, cl: number): number => (cl >= 0 ? 1e6 + cl : m.idOf[ci]);
  const rank = new Map<number, number>();
  for (let i = 0; i < lp.nTubes; i++) {
    const o = i * TUBE_FLOATS;
    rank.set(keyOf(lp.tubes[o + 8], lp.tubes[o + 9]), lp.tubes[o + 10]);
  }
  const zinv = 1 / lp.zr;
  const rinv = 1 / lp.nKeys;
  const sinv = 1 / lp.smax;
  const dep = (z: number, rk: number, s: number): number => 0.5 - 0.45 * (z - lp.zmin) * zinv - 2e-4 * rk * rinv - 2e-6 * s * sinv;
  let edges = 0;
  let caps = 0;
  let arcs = 0;
  const push = (
    ax: number, ay: number, bx: number, by: number,
    nax: number, nay: number, nbx: number, nby: number,
    chain1: number, cl1: number, flags: number,
    sa: number, sb: number, s0: number, len: number,
    da: number, db: number
  ): void => {
    out.push(ax, ay, bx, by, nax, nay, nbx, nby, chain1, cl1, flags, 0, sa, sb, s0, len, da, db);
  };

  for (let ci = 0; ci < polys.length; ci++) {
    const p = polys[ci];
    const closedFlag = p.closed ? F_CLOSED : 0;
    // Unit left normals per segment; a zero-length one borrows a neighbour's.
    const nsx = new Float64Array(p.nseg);
    const nsy = new Float64Array(p.nseg);
    const okSeg = new Uint8Array(p.nseg);
    for (let k = 0; k < p.nseg; k++) {
      const b = k + 1 === p.n ? 0 : k + 1;
      const dx = p.x[b] - p.x[k];
      const dy = p.y[b] - p.y[k];
      const l = Math.sqrt(dx * dx + dy * dy);
      if (l > 1e-9) {
        nsx[k] = -dy / l;
        nsy[k] = dx / l;
        okSeg[k] = 1;
      }
    }
    if (!okSeg.some((v) => v === 1)) continue;
    for (let k = 0; k < p.nseg; k++) {
      if (okSeg[k]) continue;
      for (let j = 1; j < p.nseg; j++) {
        const kk = (k + j) % p.nseg;
        if (okSeg[kk]) {
          nsx[k] = nsx[kk];
          nsy[k] = nsy[kk];
          break;
        }
      }
    }
    // Vertex normals: the two segments' average (an open chain's end vertex
    // takes its one segment's).
    const vn = (v: number): [number, number] => {
      const kin = v - 1 >= 0 ? v - 1 : p.closed ? p.nseg - 1 : -1;
      const kout = v < p.nseg ? v : p.closed ? 0 : -1;
      let x = 0;
      let y = 0;
      if (kin >= 0) {
        x += nsx[kin];
        y += nsy[kin];
      }
      if (kout >= 0) {
        x += nsx[kout];
        y += nsy[kout];
      }
      const l = Math.sqrt(x * x + y * y);
      if (l < 1e-9) return [nsx[kout >= 0 ? kout : kin], nsy[kout >= 0 ? kout : kin]];
      return [x / l, y / l];
    };
    const shifts = p.closed ? [-p.len, 0, p.len] : [0];
    const bounds: number[] = [];
    for (const [lo, hi] of m.chainSpans[ci]) for (const sh of shifts) bounds.push(lo + sh, hi + sh);
    bounds.sort((a, b) => a - b);
    for (let k = 0; k < p.nseg; k++) {
      if (!okSeg[k]) continue;
      const b = k + 1 === p.n ? 0 : k + 1;
      const sA = p.s[k];
      const sB = sA + p.segLen[k];
      const cuts: number[] = [sA];
      const tiny = Math.max(1e-9, (sB - sA) * 1e-9);
      for (const x of bounds) if (x > sA + tiny && x < sB - tiny && x > cuts[cuts.length - 1]) cuts.push(x);
      cuts.push(sB);
      const nA = vn(k);
      const nB = vn(b === 0 && !p.closed ? p.n - 1 : b);
      for (let i = 0; i + 1 < cuts.length; i++) {
        const u0 = cuts[i];
        const u1 = cuts[i + 1];
        const t0 = (u0 - sA) / (sB - sA);
        const t1 = (u1 - sA) / (sB - sA);
        const ax = p.x[k] + (p.x[b] - p.x[k]) * t0;
        const ay = p.y[k] + (p.y[b] - p.y[k]) * t0;
        const bx = p.x[k] + (p.x[b] - p.x[k]) * t1;
        const by = p.y[k] + (p.y[b] - p.y[k]) * t1;
        // S3a8b call 2: at a cut, the vertex normals interpolated at its t.
        const na = i === 0 ? nA : [nA[0] + (nB[0] - nA[0]) * t0, nA[1] + (nB[1] - nA[1]) * t0];
        const nb = i + 2 === cuts.length ? nB : [nA[0] + (nB[0] - nA[0]) * t1, nA[1] + (nB[1] - nA[1]) * t1];
        const cl = m.clusterAt(ci, (u0 + u1) / 2);
        const rk = rank.get(keyOf(ci, cl)) ?? 0;
        const da = dep(m.depthAt(ci, u0), rk, u0);
        const db = dep(m.depthAt(ci, u1), rk, u1);
        for (const sd of [1, -1]) {
          push(
            ax + sd * h * na[0], ay + sd * h * na[1], bx + sd * h * nb[0], by + sd * h * nb[1],
            sd * na[0], sd * na[1], sd * nb[0], sd * nb[1],
            ci + 1, cl + 1, closedFlag, u0, u1, p.s0, p.len, da, db
          );
          edges++;
        }
      }
    }
    // Caps: an open chain's ends, half circles of radius h.
    if (!p.closed) {
      const ends: [number, number, number, number][] = [];
      {
        let k0 = 0;
        while (k0 < p.nseg - 1 && !okSeg[k0]) k0++;
        const b0 = k0 + 1;
        const l0 = Math.hypot(p.x[b0] - p.x[k0], p.y[b0] - p.y[k0]) || 1;
        ends.push([0, -(p.x[b0] - p.x[k0]) / l0, -(p.y[b0] - p.y[k0]) / l0, p.s[0]]);
        let k1 = p.nseg - 1;
        while (k1 > 0 && !okSeg[k1]) k1--;
        const b1 = k1 + 1;
        const l1 = Math.hypot(p.x[b1] - p.x[k1], p.y[b1] - p.y[k1]) || 1;
        ends.push([p.n - 1, (p.x[b1] - p.x[k1]) / l1, (p.y[b1] - p.y[k1]) / l1, p.s[p.n - 1]]);
      }
      for (const [v, ux, uy, s] of ends) {
        const cx = p.x[v];
        const cy = p.y[v];
        const cl = m.clusterAt(ci, s);
        const rk = rank.get(keyOf(ci, cl)) ?? 0;
        const d = dep(m.depthAt(ci, s), rk, s);
        const K = 12;
        const dir = (q: number): [number, number] => {
          const an = -Math.PI / 2 + (Math.PI * q) / K;
          const c = Math.cos(an);
          const sn = Math.sin(an);
          return [ux * c - uy * sn, uy * c + ux * sn];
        };
        for (let q = 0; q < K; q++) {
          const [dax, day] = dir(q);
          const [dbx, dby] = dir(q + 1);
          push(cx + h * dax, cy + h * day, cx + h * dbx, cy + h * dby, dax, day, dbx, dby, ci + 1, cl + 1, F_CAP, s, s, p.s0, p.len, d, d);
          caps++;
        }
      }
    }
  }

  // Fill arcs: the corners the label's fill pass draws.
  for (let J = 0; J < m.clusters.length; J++) {
    const rk = rank.get(1e6 + J) ?? lp.nKeys;
    for (const k of m.clusters[J].corners) {
      const c = m.corners[k];
      if (c.r <= 0 || !c.ok || c.g2?.ok) continue;
      const sw = (c.winA[0] + c.winA[1]) / 2;
      const d = 0.09 * dep(m.depthAt(c.a, sw), rk, sw);
      const a0 = Math.atan2(c.uA[1], c.uA[0]);
      let sweep = Math.atan2(c.uB[1], c.uB[0]) - a0;
      while (sweep > Math.PI) sweep -= 2 * Math.PI;
      while (sweep <= -Math.PI) sweep += 2 * Math.PI;
      const K = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 24)));
      for (let q = 0; q < K; q++) {
        const ea = a0 + (sweep * q) / K;
        const eb = a0 + (sweep * (q + 1)) / K;
        const ux = Math.cos(ea);
        const uy = Math.sin(ea);
        const vx = Math.cos(eb);
        const vy = Math.sin(eb);
        push(
          c.q[0] + c.r * ux, c.q[1] + c.r * uy, c.q[0] + c.r * vx, c.q[1] + c.r * vy,
          -ux, -uy, -vx, -vy, 0, J + 1, F_FILL, 0, 0, 0, 1, d, d
        );
        arcs++;
      }
    }
  }
  // The switch lines: strips centred on a line across the tube where a
  // cluster's fill and the tube swap which is on top (K940's yield order).
  let switches = 0;
  for (const L of lines ?? findSwitchLines(m)) {
    const p = polys[L.chain];
    push(L.ax, L.ay, L.bx, L.by, L.nx, L.ny, L.nx, L.ny, L.chain + 1, L.cluster + 1, F_SWITCH | (p.closed ? F_CLOSED : 0), L.s, L.s, p.s0, p.len, 0, 0);
    out[out.length - 7] = L.J + 1;
    switches++;
  }
  const n = out.length / BAND_FLOATS;
  return { strips: new Float32Array(out), n, W: m.W, stats: { edges, caps, arcs, switches } };
}

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp usampler2D;
`;

const BAND_VS = `${HEAD}
in vec4 aQ; in vec4 aN; in vec4 aM; in vec4 aS; in vec2 aD;
uniform mat3 uM; uniform vec2 uSize; uniform float uW;
out float vD; out float vSv; out float vDep; out vec2 vN; flat out vec4 vM; flat out vec4 vC; out vec2 vQ;
void main() {
  int id = gl_VertexID;
  bool atB = id == 1 || id == 3;
  float t = id >= 2 ? 1.0 : 0.0;
  vec2 q = atB ? aQ.zw : aQ.xy;
  vec2 n = atB ? aN.zw : aN.xy;
  vec2 dq = (uM * vec3(q, 1.0)).xy;
  vec2 dn = (uM * vec3(n, 0.0)).xy;
  float ln = length(dn);
  dn = ln > 1e-12 ? dn / ln : vec2(0.0);
  // An outline strip runs inward from its edge; a switch strip is centred.
  bool sw = (int(aM.z + 0.5) & 8) == 8;
  vD = sw ? (t - 0.5) * (uW + 1.0) : -0.5 + t * (uW + 1.0);
  vQ = dq;
  vN = dn;
  vSv = atB ? aS.y : aS.x;
  vDep = atB ? aD.y : aD.x;
  vM = aM;
  vC = aS;
  gl_Position = vec4((dq - dn * vD) / uSize * 2.0 - 1.0, 0.0, 1.0);
}`;

const BAND_FS = `${HEAD}
uniform usampler2D uL; uniform sampler2D uD2;
uniform float uW; uniform float uSigma; uniform float uLr; uniform int uDepth;
in float vD; in float vSv; in float vDep; in vec2 vN; flat in vec4 vM; flat in vec4 vC; in vec2 vQ;
out vec4 o;
uint lab(vec2 p, ivec2 sz) {
  ivec2 i = ivec2(floor(p));
  if (i.x < 0 || i.y < 0 || i.x >= sz.x || i.y >= sz.y) return 0u;
  return texelFetch(uL, i, 0).x;
}
// The oracle's simLab against the strip's member: the same cluster; else,
// with no fill on either side, the same chain within sigma of s.
bool sim(uint w) {
  if (w == 0u) return false;
  uint mf = uint(vM.z + 0.5);
  uint cl = (w >> 19) & 255u;
  if (cl != 0u && cl == uint(vM.y + 0.5)) return true;
  if (((w >> 27) & 1u) == 1u || (mf & 1u) == 1u) return false;
  if ((w & 255u) != uint(vM.x + 0.5)) return false;
  float s = vC.z + float((w >> 8) & 2047u) / 2047.0 * vC.w;
  float ds = abs(s - vSv);
  if ((mf & 4u) == 4u) ds = min(ds, abs(vC.w - ds));
  return ds <= uSigma;
}
// A switch strip's other surface: the fill's cluster (aM.w = J + 1).
bool simJ(uint w) {
  uint cl = (w >> 19) & 255u;
  return cl != 0u && cl == uint(vM.w + 0.5);
}
void main() {
  ivec2 sz = textureSize(uL, 0);
  vec2 fc = gl_FragCoord.xy;
  if ((uint(vM.z + 0.5) & 8u) == 8u) {
    // A switch: ink W wide centred on the line, where the label just past
    // one side is the tube and just past the other the fill.
    float l0 = length(vN);
    vec2 n0 = l0 > 1e-6 ? vN / l0 : vec2(0.0);
    float r = uW * 0.5 + uLr;
    uint la = lab(vQ + n0 * r, sz);
    uint lb = lab(vQ - n0 * r, sz);
    if (!((sim(la) && simJ(lb)) || (simJ(la) && sim(lb)))) discard;
    float hw = uW * 0.5;
    o = vec4(clamp(vD + hw + 0.5, 0.0, 1.0) * clamp(hw + 0.5 - vD, 0.0, 1.0), 0.0, 0.0, 1.0);
    return;
  }
  if (!sim(lab(fc, sz))) discard;
  float ln = length(vN);
  vec2 nn = ln > 1e-6 ? vN / ln : vec2(0.0);
  vec2 ap = fc + nn * (vD + uLr);
  uint acr = lab(ap, sz);
  if (sim(acr)) discard;
  if (uDepth == 1 && acr != 0u) {
    ivec2 ai = clamp(ivec2(floor(ap)), ivec2(0), sz - 1);
    if (texelFetch(uD2, ai, 0).x <= vDep) discard;
  }
  float cov = clamp(vD + 0.5, 0.0, 1.0) * clamp(uW + 0.5 - vD, 0.0, 1.0);
  o = vec4(cov, 0.0, 0.0, 1.0);
}`;

const COMP_VS = `${HEAD}
void main() {
  int id = gl_VertexID;
  gl_Position = vec4(id == 1 ? 3.0 : -1.0, id == 2 ? 3.0 : -1.0, 0.0, 1.0);
}`;

// C's row 0 is the canvas's top row; the canvas's gl_FragCoord.y counts up.
const COMP_FS = `${HEAD}
uniform sampler2D uC; uniform vec3 uInk; uniform float uRows;
out vec4 o;
void main() {
  float c = texelFetch(uC, ivec2(int(gl_FragCoord.x), int(uRows - gl_FragCoord.y)), 0).r;
  if (c <= 0.0) discard;
  o = vec4(uInk * c, c);
}`;

export interface BandOptions {
  /** The ink's width in device pixels. */
  W: number;
  sigma: number;
  /** K923's depth rule (step 3 above). */
  depth: boolean;
}

export class BandPass {
  private gl: WebGL2RenderingContext;
  private band: Prog;
  private comp: Prog;
  private vao: WebGLVertexArrayObject;
  private emptyVao: WebGLVertexArrayObject;
  private buf: WebGLBuffer;
  private C: WebGLTexture | null = null;
  private fbo: WebGLFramebuffer | null = null;
  private n = 0;
  width = 0;
  height = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.band = compile(gl, BAND_VS, BAND_FS, "band");
    this.comp = compile(gl, COMP_VS, COMP_FS, "band composite");
    this.buf = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;
    this.emptyVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    for (const [name, size, off] of [
      ["aQ", 4, 0],
      ["aN", 4, 4],
      ["aM", 4, 8],
      ["aS", 4, 12],
      ["aD", 2, 16],
    ] as [string, number, number][]) {
      const loc = gl.getAttribLocation(this.band.prog, name);
      if (loc < 0) continue;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, BAND_FLOATS * 4, off * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  setStrips(b: BandStrips): void {
    const gl = this.gl;
    this.n = b.n;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, b.n ? b.strips : new Float32Array(BAND_FLOATS), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private ensureTarget(w: number, h: number): void {
    if (this.C && w === this.width && h === this.height) return;
    const gl = this.gl;
    this.freeTarget();
    this.C = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.C);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.C, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (ok !== gl.FRAMEBUFFER_COMPLETE) throw new Error(`band target incomplete (${ok})`);
    this.width = w;
    this.height = h;
  }

  /** The ink's coverage into C, from the label L and its depth D2 (packed). */
  render(L: WebGLTexture, D2: WebGLTexture, cam: LabelCamera, w: number, h: number, o: BandOptions): void {
    const gl = this.gl;
    this.ensureTarget(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
    if (this.n) {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.MAX);
      gl.blendFunc(gl.ONE, gl.ONE);
      const pr = this.band;
      gl.useProgram(pr.prog);
      gl.uniformMatrix3fv(pr.u("uM"), false, new Float32Array([cam.a, cam.b, 0, cam.c, cam.d, 0, cam.tx, cam.ty, 1]));
      gl.uniform2f(pr.u("uSize"), w, h);
      gl.uniform1f(pr.u("uW"), o.W);
      gl.uniform1f(pr.u("uSigma"), o.sigma);
      gl.uniform1f(pr.u("uLr"), 1);
      gl.uniform1i(pr.u("uDepth"), o.depth ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, L);
      gl.uniform1i(pr.u("uL"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, D2);
      gl.uniform1i(pr.u("uD2"), 1);
      gl.bindVertexArray(this.vao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.n);
      gl.bindVertexArray(null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** C over the bound canvas (the default framebuffer), in one colour. */
  composite(ink: [number, number, number]): void {
    if (!this.C) return;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.useProgram(this.comp.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.C);
    gl.uniform1i(this.comp.u("uC"), 0);
    gl.uniform3f(this.comp.u("uInk"), ink[0], ink[1], ink[2]);
    gl.uniform1f(this.comp.u("uRows"), this.height);
    gl.bindVertexArray(this.emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.disable(gl.BLEND);
  }

  /** C's coverage, one byte per pixel (0-255), row 0 = the canvas's top. */
  read(): Uint8Array {
    const gl = this.gl;
    const w = this.width;
    const h = this.height;
    const all = new Uint8Array(w * h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, all);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const out = new Uint8Array(w * h);
    for (let i = 0; i < out.length; i++) out[i] = all[i * 4];
    return out;
  }

  private freeTarget(): void {
    const gl = this.gl;
    if (this.C) gl.deleteTexture(this.C);
    if (this.fbo) gl.deleteFramebuffer(this.fbo);
    this.C = null;
    this.fbo = null;
    this.width = this.height = 0;
  }

  dispose(): void {
    const gl = this.gl;
    this.freeTarget();
    gl.deleteBuffer(this.buf);
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.emptyVao);
    gl.deleteProgram(this.band.prog);
    gl.deleteProgram(this.comp.prog);
  }
}
