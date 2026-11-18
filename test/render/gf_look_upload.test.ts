// K1472: every look table the pass uploads (GfPass.setLook) carries the channels its shader reads.
// 9b48e44f (K1458 WIP) turned the reveal FX table (unit 10, read as vec4 by FT) and the pulse/telegraph
// table (unit 9, read as vec4 by DT) into R32F uploads of their RGBA data: the shader read .y = .z = 0
// and .w = 1, so lkFx's alpha (f0.y), which scales ink and coverage while the reveal runs, was 0 and
// rp=gf's appearance reveal drew no thread ink at all (only today's frontier glows showed).
import { describe, expect, it } from "vitest";
import { GfPass } from "../../src/render/gpu_field/gf_pass";
import { GF_TW } from "../../src/render/gpu_field/gf_pack";

const C = { TEXTURE0: 0x84c0, R32F: 0x822e, RGBA32F: 0x8814, RED: 0x1903, RGBA: 0x1908, FLOAT: 0x1406, TEXTURE_2D: 0x0de1 };

interface Up { unit: number; internal: number; format: number; w: number; h: number; n: number }

/** A WebGL2 stand-in that records each texture upload with the unit it went to. */
function fakeGl() {
  const ups: Up[] = [];
  let unit = 0;
  const fns: Record<string, (...a: never[]) => unknown> = {
    activeTexture: (u: number) => { unit = u - C.TEXTURE0; },
    texImage2D: (_t: number, _l: number, internal: number, w: number, h: number, _b: number, format: number, _ty: number, view: Float32Array) => { ups.push({ unit, internal, format, w, h, n: view.length }); },
    texSubImage2D: (_t: number, _l: number, _x: number, _y: number, w: number, h: number, format: number, _ty: number, view: Float32Array) => { ups.push({ unit, internal: -1, format, w, h, n: view.length }); },
    getExtension: () => null,
    getProgramParameter: () => true,
    getShaderParameter: () => true,
  };
  let k = 0x9000;
  const consts = new Map<string, number>();
  const gl = new Proxy({} as Record<string, unknown>, {
    get: (_o, p: string) => {
      if (p in C) return C[p as keyof typeof C];
      if (/^TEXTURE\d+$/.test(p)) return C.TEXTURE0 + Number(p.slice(7));
      if (/^[A-Z][A-Z0-9_]*$/.test(p)) { if (!consts.has(p)) consts.set(p, k++); return consts.get(p); }
      return fns[p] ?? (() => ({}));
    },
  });
  return { gl: gl as unknown as WebGL2RenderingContext, ups };
}

const channels = (format: number): number => (format === C.RGBA ? 4 : format === C.RED ? 1 : 0);

describe("K1472: the look tables upload the channels the shader reads", () => {
  const nPos = 3000;
  const run = () => {
    const { gl, ups } = fakeGl();
    const pass = new GfPass(gl, false);
    const L = { nPos, version: 1, rows: 4, data: new Float32Array(4 * GF_TW * 4) } as unknown as Parameters<GfPass["setLook"]>[0];
    const P = new Float32Array(Math.ceil(nPos / GF_TW) * GF_TW);
    const Pt = new Float32Array(Math.ceil(nPos / GF_TW) * GF_TW);
    const Dyn = new Float32Array(Math.ceil((nPos * 4) / GF_TW) * GF_TW * 4);
    const Fx = new Float32Array(Math.ceil((nPos * 2) / GF_TW) * GF_TW * 4);
    const Gw = new Float32Array(Math.ceil(nPos / GF_TW) * GF_TW * 4);
    const Rt = { data: new Float32Array(2 * GF_TW * 4), rows: 2 };
    pass.setLook(L, 0.1, P, 1, Pt, 1, 0.14, Dyn, 1, 0, Fx, 1, true, null, Gw, 1, Rt, 1);
    // a second frame with new versions takes the texSubImage2D path
    (L as unknown as { version: number }).version = 2;
    pass.setLook(L, 0.1, P, 2, Pt, 2, 0.14, Dyn, 2, 0, Fx, 2, true, null, Gw, 2, Rt, 2);
    pass.dispose();
    return ups;
  };

  it("the reveal FX (unit 10) and pulse/telegraph (unit 9) tables are RGBA32F, read as vec4", () => {
    const ups = run();
    for (const u of [9, 10]) {
      const at = ups.filter((x) => x.unit === u);
      expect(at.length).toBe(2);
      expect(at[0].internal).toBe(C.RGBA32F);
      for (const x of at) expect(x.format).toBe(C.RGBA);
    }
  });

  it("no upload's data length disagrees with its format (master 9b48e44f..: 4 of 14, here 0)", () => {
    const ups = run();
    expect(ups.length).toBe(14);
    const bad = ups.filter((x) => channels(x.format) * x.w * x.h !== x.n).map((x) => `unit ${x.unit}: ${x.n} floats for ${x.w}x${x.h}x${channels(x.format)}`);
    expect(bad).toEqual([]);
  });
});
