// K1240 S1: both looks from the one outline table, drawn by WebGL2.
// Border look: the outline stroked as a band of width W measured inward
// (toward the centreline foot each outline point carries), K868's goals
// G1-G6 (two edge strokes, over-owned gaps come from the cuts, junction
// corners from the table's arcs). Filled look: the table's faces filled,
// one flat colour per chain in the section-colours scheme (the gamut arc
// at pastel saturation/lightness, one hue step per chain). Both looks
// read the same OutlineTable; nothing here recomputes geometry.
import type { OutlineTable, SceneIn } from "./outline";

export function parseColor(s: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(s.trim());
  if (m) {
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  const m2 = /^#([0-9a-f]{3})$/i.exec(s.trim());
  if (m2) return [...m2[1]].map((c) => parseInt(c + c, 16) / 255) as [number, number, number];
  return [0, 0, 0];
}

function hslToRgb(hDeg: number, s: number, l: number): [number, number, number] {
  const h = ((hDeg % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** The section-colours scheme: a 280-degree gamut arc from a base hue. */
export function chainColor(chain: number, nChains: number, baseHue: number): [number, number, number] {
  const GOLDEN = 137.508;
  const hue = baseHue + ((chain * GOLDEN) % 280);
  return hslToRgb(hue, 0.45, 0.64);
}

export function baseHueFor(name: string): number {
  let hsh = 2166136261;
  for (let i = 0; i < name.length; i++) { hsh ^= name.charCodeAt(i); hsh = Math.imul(hsh, 16777619); }
  return ((hsh >>> 0) / 4294967295) * 360;
}

/** Simple ear clipping for one face loop (flat points, no holes). */
export function earClip(pts: number[]): number[] {
  const n = pts.length / 2;
  if (n < 3) return [];
  const idx: number[] = [];
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  const order = Array.from({ length: n }, (_, i) => i);
  if (area < 0) order.reverse();
  const X = (i: number): number => pts[2 * i];
  const Y = (i: number): number => pts[2 * i + 1];
  const cross = (a: number, b: number, c: number): number => (X(b) - X(a)) * (Y(c) - Y(a)) - (Y(b) - Y(a)) * (X(c) - X(a));
  const inTri = (px: number, py: number, a: number, b: number, c: number): boolean => {
    const d1 = (px - X(b)) * (Y(a) - Y(b)) - (X(a) - X(b)) * (py - Y(b));
    const d2 = (px - X(c)) * (Y(b) - Y(c)) - (X(b) - X(c)) * (py - Y(c));
    const d3 = (px - X(a)) * (Y(c) - Y(a)) - (X(c) - X(a)) * (py - Y(a));
    const neg = (d1 < -1e-15 && d2 < -1e-15 && d3 < -1e-15);
    const pos = (d1 > 1e-15 && d2 > 1e-15 && d3 > 1e-15);
    return neg || pos;
  };
  const work = order.slice();
  let guard = 0;
  while (work.length > 3 && guard++ < n * n + 16) {
    let clipped = false;
    for (let i = 0; i < work.length; i++) {
      const a = work[(i + work.length - 1) % work.length];
      const b = work[i];
      const c = work[(i + 1) % work.length];
      if (cross(a, b, c) <= 1e-15) continue;
      let empty = true;
      for (const w of work) {
        if (w === a || w === b || w === c) continue;
        if (inTri(X(w), Y(w), a, b, c)) { empty = false; break; }
      }
      if (!empty) continue;
      idx.push(a, b, c);
      work.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) break; // degenerate remainder: fan it
  }
  for (let i = 1; i + 1 < work.length; i++) idx.push(work[0], work[i], work[i + 1]);
  return idx;
}

export interface FillFaceDraw { fanOff: number; fanCnt: number; quadOff: number }
export interface DrawData {
  fillFanPos: Float32Array; // fan triangles per face (stencil pass)
  fillFanCol: Float32Array;
  fillQuadPos: Float32Array; // one bbox quad per face (colour pass)
  fillQuadCol: Float32Array;
  fillFaces: FillFaceDraw[];
  bandPos: Float32Array;
  bandCol: Float32Array;
  bandCount: number;
}

export function buildDrawData(table: OutlineTable, scene: SceneIn): DrawData {
  const baseHue = baseHueFor(scene.name);
  const nCh = scene.chains.length;
  // Fill is drawn with the stencil: a fan from each face's first vertex
  // toggles the stencil, then the face's bbox quad paints where set.
  // That fills any simple loop exactly, with no CPU triangulation.
  const fanPos: number[] = [];
  const fanCol: number[] = [];
  const quadPos: number[] = [];
  const quadCol: number[] = [];
  const fillFaces: FillFaceDraw[] = [];
  for (const f of table.faces) {
    if (f.hole || f.ownerChain < 0) continue;
    const col = chainColor(f.ownerChain, nCh, baseHue);
    const n = f.pts.length / 2;
    if (n < 3) continue;
    const fanOff = fanPos.length / 2;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      x0 = Math.min(x0, f.pts[2 * i]); x1 = Math.max(x1, f.pts[2 * i]);
      y0 = Math.min(y0, f.pts[2 * i + 1]); y1 = Math.max(y1, f.pts[2 * i + 1]);
    }
    for (let i = 1; i + 1 < n; i++) {
      fanPos.push(f.pts[0], f.pts[1], f.pts[2 * i], f.pts[2 * i + 1], f.pts[2 * i + 2], f.pts[2 * i + 3]);
      for (let k = 0; k < 3; k++) fanCol.push(col[0], col[1], col[2]);
    }
    const quadOff = quadPos.length / 2;
    quadPos.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
    for (let k = 0; k < 6; k++) quadCol.push(col[0], col[1], col[2]);
    fillFaces.push({ fanOff, fanCnt: (n - 2) * 3, quadOff });
  }
  const ink = parseColor(scene.look.ink);
  const bandPos: number[] = [];
  const bandCol: number[] = [];
  const W = table.W;
  for (const p of table.pieces) {
    const np = p.pts.length / 2;
    if (np < 2) continue;
    const inner: [number, number][] = [];
    for (let i = 0; i < np; i++) {
      const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
      const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1];
      let dx = cx - x; let dy = cy - y;
      const l = Math.hypot(dx, dy);
      if (l < 1e-12) {
        // Fall back to the segment normal.
        const j = Math.min(i + 1, np - 1);
        const ex = p.pts[2 * j] - x; const ey = p.pts[2 * j + 1] - y;
        const el = Math.hypot(ex, ey) || 1;
        dx = -ey / el; dy = ex / el;
      } else { dx /= l; dy /= l; }
      inner.push([x + dx * W, y + dy * W]);
    }
    for (let i = 0; i + 1 < np; i++) {
      const [ax, ay] = [p.pts[2 * i], p.pts[2 * i + 1]];
      const [bx, by] = [p.pts[2 * i + 2], p.pts[2 * i + 3]];
      const [iax, iay] = inner[i];
      const [ibx, iby] = inner[i + 1];
      bandPos.push(ax, ay, bx, by, iax, iay, bx, by, ibx, iby, iax, iay);
      for (let k = 0; k < 6; k++) bandCol.push(ink[0], ink[1], ink[2]);
    }
  }
  return {
    fillFanPos: Float32Array.from(fanPos), fillFanCol: Float32Array.from(fanCol),
    fillQuadPos: Float32Array.from(quadPos), fillQuadCol: Float32Array.from(quadCol),
    fillFaces,
    bandPos: Float32Array.from(bandPos), bandCol: Float32Array.from(bandCol),
    bandCount: bandPos.length / 2,
  };
}

export class OutlineRenderer {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vaoFill: WebGLVertexArrayObject;
  private vaoQuad: WebGLVertexArrayObject;
  private vaoBand: WebGLVertexArrayObject;
  private uMat: WebGLUniformLocation | null;
  private data: DrawData;
  constructor(canvas: HTMLCanvasElement, data: DrawData) {
    const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, stencil: true });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;
    this.data = data;
    const vs = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec3 aCol;
uniform mat3 uMat;
out vec3 vCol;
void main() {
  vec3 p = uMat * vec3(aPos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
  vCol = aCol;
}`;
    const fs = `#version 300 es
precision highp float;
in vec3 vCol;
out vec4 o;
void main() { o = vec4(vCol, 1.0); }`;
    const mk = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link failed");
    this.prog = prog;
    this.uMat = gl.getUniformLocation(prog, "uMat");
    const mkVao = (pos: Float32Array, col: Float32Array): WebGLVertexArrayObject => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const pb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const cb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cb);
      gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return vao;
    };
    this.vaoFill = mkVao(data.fillFanPos, data.fillFanCol);
    this.vaoQuad = mkVao(data.fillQuadPos, data.fillQuadCol);
    this.vaoBand = mkVao(data.bandPos, data.bandCol);
  }

  /**
   * World->clip matrix from the scene camera. CSS = (a x + c y + e,
   * b x + d y + f); clip = (2 cssX / vpW - 1, 1 - 2 cssY / vpH). A crop
   * re-centres on a world point and zooms about the canvas centre (CSS
   * space, so 1 CSS px = 2 device px at the page's dpr 2).
   * GLSL mat3 is column-major: columns are (m00, m10, 0), (m01, m11, 0),
   * (m02, m12, 1).
   */
  matrix(scene: SceneIn, crop?: { cx: number; cy: number; zoom: number }): Float32Array {
    const m = scene.camera.worldToCss;
    const vp = scene.camera.viewport;
    let a = m[0]; let b = m[1]; let c = m[2]; let d = m[3]; let e = m[4]; let f = m[5];
    if (crop) {
      const ccx = a * crop.cx + c * crop.cy + e;
      const ccy = b * crop.cx + d * crop.cy + f;
      const z = crop.zoom;
      e = (e - ccx) * z + vp[0] / 2;
      f = (f - ccy) * z + vp[1] / 2;
      a *= z; b *= z; c *= z; d *= z;
    }
    return new Float32Array([
      (2 * a) / vp[0], (-2 * b) / vp[1], 0,
      (2 * c) / vp[0], (-2 * d) / vp[1], 0,
      (2 * e) / vp[0] - 1, 1 - (2 * f) / vp[1], 1,
    ]);
  }

  draw(scene: SceneIn, mode: "border" | "fill" | "both", crop?: { cx: number; cy: number; zoom: number }): void {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const paper = parseColor(scene.look.paper);
    gl.clearColor(paper[0], paper[1], paper[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    const mat = this.matrix(scene, crop);
    // Column-major mat3 for GLSL: our Float32Array is built row-pairs as
    // (a, b, 0, c', d', 0, tx, ty, 1) matching GLSL mat3 columns below.
    gl.uniformMatrix3fv(this.uMat, false, mat);
    if (mode === "fill" || mode === "both") {
      // Stencil fill per face: fan toggles, bbox quad paints where set.
      gl.enable(gl.STENCIL_TEST);
      for (const f of this.data.fillFaces) {
        gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.ALWAYS, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
        gl.bindVertexArray(this.vaoFill);
        gl.drawArrays(gl.TRIANGLES, f.fanOff, f.fanCnt);
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        gl.bindVertexArray(this.vaoQuad);
        gl.drawArrays(gl.TRIANGLES, f.quadOff, 6);
      }
      gl.disable(gl.STENCIL_TEST);
    }
    if (mode === "border" || mode === "both") {
      gl.bindVertexArray(this.vaoBand);
      gl.drawArrays(gl.TRIANGLES, 0, this.data.bandCount);
    }
    gl.bindVertexArray(null);
  }

  /** Wall time of one draw: 10 draws back to back, synced with finish(). */
  timeDraw(scene: SceneIn, mode: "border" | "fill" | "both"): number {
    const gl = this.gl;
    this.draw(scene, mode);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) this.draw(scene, mode);
    gl.finish();
    return (performance.now() - t0) / 10;
  }
}

/** World -> device px on the page's canvas (full view, dpr 2). */
export function worldToDevice(scene: SceneIn, x: number, y: number): [number, number] {
  const m = scene.camera.worldToCss;
  return [(m[0] * x + m[2] * y + m[4]) * 2, (m[1] * x + m[3] * y + m[5]) * 2];
}

/** A point on a scene chain at arc length s (raw export points). */
export function scenePointAt(scene: SceneIn, chain: number, s: number): [number, number] {
  const c = scene.chains[chain];
  const pts = c.pts;
  let acc = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
    if (acc + l >= s || i + 5 >= pts.length) {
      const t = l > 0 ? Math.min(1, Math.max(0, (s - acc) / l)) : 0;
      return [pts[i] + (pts[i + 2] - pts[i]) * t, pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t];
    }
    acc += l;
  }
  return [pts[pts.length - 2], pts[pts.length - 1]];
}
