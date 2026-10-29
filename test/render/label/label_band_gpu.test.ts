// K868 S3a8b call 3: the band edges from the label tables
// (src/render/label/label_band_gpu.ts) against buildBandStrips' CPU edges,
// through the vertex shader's float32 reference (label_band_gpu_check.ts),
// on the tracked field scenes as built and with their crossings flipped
// (other clusters, so other cuts). The stage's probe band_gpu20 runs the
// same check on every frame of the four sequences.
//
// K868 S3a8b2, the wiring: buildBandStrips without the tube edges keeps the
// rest of the strips as they were, and BandPass's GPU edges, on a recording
// fake WebGL2: the draw, the units unbound by name after it (G7), and a
// compile failure's fallback with its reason, logged once.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FieldModel, type OracleParams, cornerRadius } from "../../../src/render/field/oracle";
import type { FieldScene } from "../../../src/render/field/scene";
import { BAND_FLOATS, BandPass, buildBandStrips } from "../../../src/render/label/label_band";
import { BandEdgeLayout, bandEdgeSources } from "../../../src/render/label/label_band_gpu";
import { buildLabelPieces, buildLabelPiecesGpu } from "../../../src/render/label/label_pieces";
import { findSwitchLines } from "../../../src/render/label/label_switch";
import { LabelTableBuilder, TBL_W } from "../../../src/render/label/label_tables";
import { checkBandEdges } from "./label_band_gpu_check";

const dir = join(__dirname, "..", "field", "scenes");
const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
/** The label app's oracle params (label_app.ts rebuild). */
const params = (s: FieldScene, sigma?: number): OracleParams => {
  const h = s.look.halfWidth;
  return {
    rRound: 0,
    rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0),
    spans: "k883",
    crMax: 3,
    labelOnly: true,
    sigma,
  };
};
const flip = (s: FieldScene): FieldScene => ({ ...s, crossings: s.crossings.map((x) => ({ ...x, over: x.over === "a" ? ("b" as const) : ("a" as const) })) });

describe("band edges from the tables: the CPU's edges, cut by the span table", () => {
  const seen = { segments: 0, cuts: 0 };
  const tb = new LabelTableBuilder();
  const cases = names.flatMap((n) => [
    { name: n, s: load(n), sigma: undefined as number | undefined },
    { name: `${n} flipped`, s: flip(load(n)), sigma: 1.2 * load(n).look.halfWidth },
  ]);
  for (const { name, s, sigma } of cases) {
    it(name, () => {
      const m = new FieldModel(s, params(s, sigma));
      const r = checkBandEdges(m, tb.build(m), buildLabelPieces(m));
      expect(r.diffs).toEqual([]);
      expect(r.clusterTiny).toBe(0);
      seen.segments += r.segments;
      seen.cuts += r.cuts;
    });
  }
  it("the scenes hold segments and cuts", () => {
    expect(seen.segments).toBeGreaterThan(0);
    expect(seen.cuts).toBeGreaterThan(0);
  });

  it("uploads the instances only when a chain's segment count changes", () => {
    const s = load(names[0]);
    const m = new FieldModel(s, params(s));
    const T = tb.build(m);
    const L = new BandEdgeLayout();
    expect(L.update(T)).toBe(true);
    expect(L.update(T)).toBe(false);
    const T2 = { ...T, data: T.data.slice() };
    T2.data[4 * 3 * 0 + 1] += 1;
    expect(L.update(T2)).toBe(true);
    expect(L.update(T2)).toBe(false);
    expect(L.update({ ...T2, nChains: T2.nChains - 1 })).toBe(true);
  });

  it("splits the depth variant in JS (K320: no dead text)", () => {
    const off = bandEdgeSources(TBL_W, false);
    const on = bandEdgeSources(TBL_W, true);
    for (const t of [off.vs, off.fs, on.vs, on.fs]) {
      expect(t).not.toContain("#ifdef");
      expect(t).toContain(`#define TBL_W ${TBL_W}`);
    }
    expect(off.fs).not.toContain("depthAt");
    expect(off.fs).not.toContain("uD2");
    expect(on.fs).toContain("float depthAt(");
    expect(on.fs).toContain("uniform sampler2D uD2;");
    expect(on.vs).toBe(off.vs);
  });
});

/** A recording WebGL2 stand-in: each constant a distinct number, every call
 * logged, every shader compiling unless `fail` says so about its source. */
function fakeGl(fail: (src: string) => boolean): { gl: WebGL2RenderingContext; calls: unknown[][]; K: (n: string) => number } {
  const ids = new Map<string, number>();
  const K = (n: string): number => {
    if (!ids.has(n)) ids.set(n, 1000 * (ids.size + 1));
    return ids.get(n)!;
  };
  const calls: unknown[][] = [];
  const src = new Map<object, string>();
  let obj = 0;
  const gl = new Proxy(
    {},
    {
      get(_t, p) {
        if (typeof p !== "string") return undefined;
        if (/^[A-Z][A-Z0-9_]*$/.test(p)) return K(p);
        return (...a: unknown[]) => {
          calls.push([p, ...a]);
          if (p.startsWith("create")) return { kind: p, id: ++obj };
          switch (p) {
            case "shaderSource":
              src.set(a[0] as object, a[1] as string);
              return undefined;
            case "getShaderParameter":
              return !fail(src.get(a[0] as object) ?? "");
            case "getShaderInfoLog":
              return "ERROR: 0:1: fake";
            case "getProgramParameter":
              return true;
            case "getAttribLocation":
              return 3;
            case "getUniformLocation":
              return { u: a[1] };
            case "checkFramebufferStatus":
              return K("FRAMEBUFFER_COMPLETE");
            case "getError":
              return 0;
            default:
              return undefined;
          }
        };
      },
    }
  ) as unknown as WebGL2RenderingContext;
  return { gl, calls, K };
}

describe("K868 S3a8b2: the GPU edges wired", () => {
  const tb = new LabelTableBuilder();
  const cam = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  const tex = (): WebGLTexture => ({}) as WebGLTexture;
  /** A tube edge: none of the fill, cap and switch flags. */
  const isEdge = (f: Float32Array, i: number): boolean => (f[i * BAND_FLOATS + 10] & (1 | 2 | 8)) === 0;

  it("strips without the tube edges are the full strips' others, in order", () => {
    let kept = 0;
    let edges = 0;
    for (const n of names) {
      for (const s of [load(n), flip(load(n))]) {
        const m = new FieldModel(s, params(s));
        const lines = findSwitchLines(m);
        for (const lp of [buildLabelPieces(m), buildLabelPiecesGpu(m, tb.build(m))]) {
          const full = buildBandStrips(m, lp, lines);
          const part = buildBandStrips(m, lp, lines, { tubeEdges: false });
          expect(full.tubeEdges).toBe(true);
          expect(part.tubeEdges).toBe(false);
          const rest: number[] = [];
          let nEdge = 0;
          for (let i = 0; i < full.n; i++) {
            if (isEdge(full.strips, i)) nEdge++;
            else rest.push(...full.strips.subarray(i * BAND_FLOATS, (i + 1) * BAND_FLOATS));
          }
          expect(nEdge).toBe(full.stats.edges);
          expect(part.n).toBe(full.n - nEdge);
          expect(Array.from(part.strips)).toEqual(Array.from(new Float32Array(rest)));
          expect(part.stats).toEqual({ ...full.stats, edges: 0 });
          kept += part.n;
          edges += nEdge;
        }
      }
    }
    expect(kept).toBeGreaterThan(0);
    expect(edges).toBeGreaterThan(0);
  });

  it("draws two instances a segment, uploads them once, unbinds its units by name", () => {
    const s = load(names[0]);
    const m = new FieldModel(s, params(s));
    const T = tb.build(m);
    const { gl, calls, K } = fakeGl(() => false);
    const b = new BandPass(gl);
    expect(b.edgesReady(false)).toBe(true);
    expect(b.edgeError).toEqual([null, null]);
    const div = calls.filter((c) => c[0] === "vertexAttribDivisor");
    expect(div[div.length - 1]).toEqual(["vertexAttribDivisor", 3, 2]);
    for (const depth of [false, true]) {
      calls.length = 0;
      b.render(tex(), tex(), cam, 64, 48, { W: 2, sigma: 1, depth, edges: { T, tbl: tex(), h: m.h } });
      const at = calls.findIndex((c) => c[0] === "drawArraysInstanced");
      expect(calls[at]).toEqual(["drawArraysInstanced", K("TRIANGLE_STRIP"), 0, 4, 2 * T.nSegs]);
      expect(calls.filter((c) => c[0] === "drawArraysInstanced").length).toBe(1);
      expect(calls.some((c) => c[0] === "uniform1f" && (c[1] as { u: string }).u === "uH" && c[2] === m.h)).toBe(true);
      // The instances upload on the first draw only (the layout is the same).
      expect(calls.some((c) => c[0] === "bufferSubData")).toBe(!depth);
      const after = calls.slice(at);
      for (const u of depth ? [0, 1, 2] : [0, 1]) {
        const i = after.findIndex((c) => c[0] === "activeTexture" && c[1] === K(`TEXTURE${u}`));
        expect(i).toBeGreaterThan(0);
        expect(after[i + 1]).toEqual(["bindTexture", K("TEXTURE_2D"), null]);
      }
    }
  });

  it("an edge program that fails to compile: its reason, logged once, no edge draw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const { gl, calls } = fakeGl((src) => src.includes("in vec2 aSeg;"));
      const b = new BandPass(gl);
      expect(b.edgesReady(false)).toBe(false);
      expect(b.edgeError[0]).toContain("label band edge shader: ERROR: 0:1: fake");
      expect(b.edgeError[1]).toBeNull();
      expect(b.edgesReady(false)).toBe(false);
      expect(new BandPass(gl).edgesReady(false)).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain("the CPU draws the tube edges");
      expect(b.edgesReady(true)).toBe(false);
      expect(b.edgeError[1]).toContain("label band edge (depth) shader");
      expect(warn).toHaveBeenCalledTimes(2);
      const s = load(names[0]);
      const m = new FieldModel(s, params(s));
      calls.length = 0;
      b.render(tex(), tex(), cam, 8, 8, { W: 2, sigma: 1, depth: false, edges: { T: tb.build(m), tbl: tex(), h: m.h } });
      expect(calls.some((c) => c[0] === "drawArraysInstanced")).toBe(false);
    } finally {
      warn.mockRestore();
    }
  });
});
