// K1040 S3f2: the lean pass's upload, against a recording fake GL.
// Step 1: upload(T, true) (the caller asserts nothing changed, from the
// sleep state) skips the span record and the row diff - no GL call, no
// bytes - but never the first upload. A moved particle (a fresh tables
// object, as buildLabelB returns) uploads only its rows, and the textures
// then equal a full upload's, bit for bit. Step 2 (K1157): uploadCalls
// counts the texImage2D/texSubImage2D calls beside uploadBytes.
import { describe, expect, it } from "vitest";
import { TEX_W, type LabelBTables } from "../../../src/render/field/label_b";
import { LabelBPass } from "../../../src/render/field/label_b_pass";

interface TexCall { kind: "image" | "sub"; tex: object; row: number; rows: number }
interface Store { rows: number; data: Float32Array }

class FakeGL {
  calls: TexCall[] = [];
  drawCalls: string[] = [];
  private stores = new Map<object, Store>();
  // Distinct numeric constants; only identity matters to the pass.
  TEXTURE_2D = 1; RGBA32F = 2; RGBA = 3; FLOAT = 4; TEXTURE_MIN_FILTER = 5;
  TEXTURE_MAG_FILTER = 6; NEAREST = 7; UNPACK_FLIP_Y_WEBGL = 8;
  UNPACK_PREMULTIPLY_ALPHA_WEBGL = 9; ARRAY_BUFFER = 10; STATIC_DRAW = 11;
  FRAMEBUFFER = 12; VIEWPORT = 13;
  getExtension(): null { return null; }
  createShader(): object { return {}; }
  shaderSource(): void {}
  compileShader(): void {}
  getShaderParameter(): boolean { return true; }
  getShaderInfoLog(): string { return ""; }
  createProgram(): object { return {}; }
  attachShader(): void {}
  bindAttribLocation(): void {}
  linkProgram(): void {}
  getProgramParameter(): boolean { return true; }
  getProgramInfoLog(): string { return ""; }
  createVertexArray(): object { return {}; }
  createBuffer(): object { return {}; }
  createFramebuffer(): object { return {}; }
  createTexture(): object { const t = {}; this.stores.set(t, { rows: 0, data: new Float32Array(0) }); return t; }
  pixelStorei(): void {}
  bindTexture(_t: number, tex: object): void { this.bound = tex; }
  private bound: object | null = null;
  texParameteri(): void {}
  texImage2D(_t: number, _l: number, _i: number, w: number, rows: number, _b: number, _f: number, _ty: number, data: Float32Array): void {
    const st = this.stores.get(this.bound as object) as Store;
    st.rows = rows;
    st.data = Float32Array.from(data.subarray(0, w * rows * 4));
    this.calls.push({ kind: "image", tex: this.bound as object, row: 0, rows });
  }
  texSubImage2D(_t: number, _l: number, _x: number, row: number, w: number, rows: number, _f: number, _ty: number, data: Float32Array, off = 0): void {
    const st = this.stores.get(this.bound as object) as Store;
    st.data.set(data.subarray(off, off + w * rows * 4), row * w * 4);
    this.calls.push({ kind: "sub", tex: this.bound as object, row, rows });
  }
  bindVertexArray(): void {}
  bindBuffer(): void {}
  bufferData(): void {}
  enableVertexAttribArray(): void {}
  vertexAttribPointer(): void {}
  vertexAttribDivisor(): void {}
  bindFramebuffer(): void { this.drawCalls.push("bindFramebuffer"); }
  viewport(): void { this.drawCalls.push("viewport"); }
  clearBufferuiv(): void { this.drawCalls.push("clear"); }
  store(tex: object): Store { return this.stores.get(tex) as Store; }
  texOf(pass: LabelBPass, i: number): object {
    return (pass as unknown as { tabs: Record<string, { tex: object }> }).tabs[["pts", "chain", "span", "fill", "nb", "ps"][i]].tex;
  }
}

function tables(): LabelBTables {
  const pts = new Float32Array(TEX_W * 4);
  for (let j = 0; j < 4; j++) pts.set([j, -j, j * 0.5, 0], 4 * j);
  const chain = new Float32Array(TEX_W * 4);
  chain.set([0, 4, 3, 0, 0, 1.5, 0, 2], 0);
  const span = new Float32Array(TEX_W * 4);
  span.set([0, 1, 0, 0, 1, 2, 0, 0], 0);
  return {
    nChains: 1, pts, ptsRows: 1, chain, chainRows: 1, span, spanRows: 1,
    fill: new Float32Array(TEX_W * 4), fillRows: 1, nFills: 0, fillCorner: [],
    inst: new Float32Array([0, 0, 0, 1, 0, 2]), nInst: 3, layoutKey: "3",
    nGroups: 0, keyScale: 1, h: 0.25, invK: 0, spans: [[{ lo: 0, code: 1 }, { lo: 1, code: 2 }]],
    ptOff: [0], nb: new Float32Array(TEX_W * 4), foldR: 0,
  };
}
const clone = (T: LabelBTables): LabelBTables => ({ ...T, pts: T.pts.slice(), chain: T.chain.slice(), span: T.span.slice(), fill: T.fill.slice(), nb: T.nb.slice(), inst: T.inst.slice() });
const bits = (a: Float32Array) => Array.from(new Uint32Array(a.buffer, a.byteOffset, a.length));
const mk = () => { const gl = new FakeGL(); return { gl, pass: new LabelBPass(gl as unknown as WebGL2RenderingContext, false, "tentv", { lean: true }) }; };

describe("lean upload at rest (K1040 S3f2 step 1)", () => {
  it("the first upload never skips, even when the caller asserts rest", () => {
    const { gl, pass } = mk();
    pass.upload(tables(), true);
    expect(pass.uploadBytes).toBeGreaterThan(0);
    expect(gl.calls.length).toBe(5); // pts, chain, span, fill, ps
    expect(pass.uploadCalls).toBe(5);
  });
  it("an unchanged frame uploads nothing: no call, no bytes", () => {
    const { gl, pass } = mk();
    const T = tables();
    pass.upload(T);
    const n = gl.calls.length;
    pass.upload(T, true);
    expect(pass.uploadBytes).toBe(0);
    expect(pass.uploadCalls).toBe(0);
    expect(gl.calls.length).toBe(n);
  });
  it("one moved particle uploads only its rows; the texture equals a full upload's, bit for bit", () => {
    const { gl, pass } = mk();
    const T = tables();
    pass.upload(T);
    const moved = clone(T);
    moved.pts[4] = 99; // point 1's x, in row 0 (the only row)
    const before = gl.calls.length;
    pass.upload(moved);
    const sent = gl.calls.slice(before);
    expect(sent).toEqual([{ kind: "sub", tex: gl.texOf(pass, 0), row: 0, rows: 1 }]);
    expect(pass.uploadBytes).toBe(TEX_W * 16);
    expect(pass.uploadCalls).toBe(1);
    const full = mk();
    full.pass.upload(moved);
    for (let i = 0; i < 6; i++) {
      const a = gl.store(gl.texOf(pass, i)), b = full.gl.store(full.gl.texOf(full.pass, i));
      if (a.rows === 0 && b.rows === 0) continue;
      expect(bits(a.data)).toEqual(bits(b.data));
    }
  });
  it("the moving case (probeAllDirty) still sends every used row", () => {
    const { pass } = mk();
    const T = tables();
    pass.upload(T);
    pass.probeAllDirty = true;
    pass.upload(clone(T));
    expect(pass.uploadCalls).toBe(4); // pts, chain, span, ps (fill has no used texels)
    expect(pass.uploadBytes).toBe(4 * TEX_W * 16);
  });
  it("probeBindOnly stops draw() after the bind and viewport", () => {
    const { gl, pass } = mk();
    pass.probeBindOnly = true;
    pass.draw([1, 0, 0, 1, 0, 0]);
    expect(gl.drawCalls).toEqual(["bindFramebuffer", "viewport"]);
  });
});
