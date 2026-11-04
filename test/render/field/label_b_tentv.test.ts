// K1040 S3d: the vertex-light tent's pins (mode tentv). Its shaders keep the
// tent's two properties (no discard, no gl_FragDepth, depth from the vertex
// shader), its vertex shaders emit S3c's geometry verbatim and carry no span
// search, and the per-point span record ("ps") is the search S3c's vertex
// shader ran. The pixel census is a GPU probe
// (.claude/probes/K1040/s3/s3.mjs verdict --mode tentv).
import { describe, expect, it } from "vitest";
import { tentSpanRecord, type TentSpanTables } from "../../../src/render/field/label_b_tent";
import { labelBTentSources, labelBTentVSources } from "../../../src/render/field/label_b_tent_glsl";

/** GLSL with its comments removed. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** main() up to and including its emit(...) line. */
function geometry(src: string): string {
  const c = code(src);
  const a = c.indexOf("void main()");
  const e = c.indexOf("emit(", a);
  return c.slice(a, c.indexOf("\n", e));
}

describe("vertex-light tent sources", () => {
  for (const dbg of [false, true]) {
    const V = labelBTentVSources(dbg);
    const S = labelBTentSources(dbg);
    it(`no discard, no gl_FragDepth (debugOut ${dbg})`, () => {
      for (const src of [V.segVs, V.capVs, V.fs]) {
        expect(code(src)).not.toMatch(/\bdiscard\b/);
        expect(code(src)).not.toMatch(/\bgl_FragDepth\b/);
      }
    });
    it(`the vertex shaders write gl_Position, one flat ivec3 and no span search (debugOut ${dbg})`, () => {
      for (const src of [V.segVs, V.capVs]) {
        const c = code(src);
        expect(c).toMatch(/gl_Position\s*=/);
        expect(c).toMatch(/\binvariant gl_Position;/);
        expect(c.match(/\bflat out\b[^;]*;/g)).toEqual(["flat out ivec3 vQ;"]);
        expect(c).not.toMatch(/\bspanAt\s*\(/);
        expect(c).not.toMatch(/fetch\(uSpan/);
      }
    });
    it(`the vertex shaders emit S3c's geometry verbatim (debugOut ${dbg})`, () => {
      expect(geometry(V.segVs)).toBe(geometry(S.segVs));
      expect(geometry(V.capVs)).toBe(geometry(S.capVs));
      expect(geometry(V.segVs)).toMatch(/emit\(P, N, o, z - abs\(o\) \* uInvK\);$/);
      expect(geometry(V.capVs)).toMatch(/emit\(C\.xy, N, o, C\.w - abs\(o\) \* uInvK\);$/);
    });
    it(`the fragment shader reads the record on its own unit (debugOut ${dbg})`, () => {
      const c = code(V.fs);
      expect(c).toMatch(/uniform\s+(highp\s+)?sampler2D\s+uPs;/);
      expect(c).toMatch(/flat in ivec3 vQ;/);
      expect(c).toMatch(/oWord\s*=/);
    });
  }
});

/** Tables for chains given as (point s values, span (lo, code) list). */
function tables(chains: { s: number[]; spans: [number, number][] }[]): TentSpanTables {
  const nPts = chains.reduce((a, c) => a + c.s.length, 0);
  const nSp = chains.reduce((a, c) => a + c.spans.length, 0);
  const pts = new Float32Array(4 * nPts);
  const span = new Float32Array(4 * (nSp + 3)); // padded, as the pass pads to whole rows
  const chain = new Float32Array(8 * chains.length);
  let off = 0, so = 0;
  chains.forEach((c, ci) => {
    c.s.forEach((s, j) => pts.set([j, -j, s, 0], 4 * (off + j)));
    c.spans.forEach(([lo, cd], i) => span.set([lo, cd, 0, 0], 4 * (so + i)));
    chain.set([off, c.s.length, Math.max(c.s.length - 1, 0), 0, 0, 1, so, c.spans.length], 8 * ci);
    off += c.s.length;
    so += c.spans.length;
  });
  return { nChains: chains.length, pts, chain, span };
}

/** The linear reference: the last span whose lo is at most s (span 0 if none). */
function reference(T: TentSpanTables): Float32Array {
  const out = new Float32Array(T.pts.length);
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = T.chain[8 * ci], n = T.chain[8 * ci + 1], so = T.chain[8 * ci + 6], ns = T.chain[8 * ci + 7];
    for (let j = off; j < off + n; j++) {
      const s = T.pts[4 * j + 2];
      let k = 0;
      for (let i = 1; i < ns; i++) if (T.span[4 * (so + i)] <= s) k = i;
      out.set([k, T.span[4 * (so + k) + 1], k + 1 < ns ? T.span[4 * (so + k + 1)] : 1e30, 0], 4 * j);
    }
  }
  return out;
}

describe("tentSpanRecord", () => {
  const T = tables([
    // s below the first lo, on a lo exactly, between, past the last
    { s: [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.99, 1.5], spans: [[0.1, 3], [0.25, 7], [0.5, 2], [0.75, 9]] },
    // one span: every point reads it, the next lo is fround(1e30)
    { s: [2, 2.5, 3, 4], spans: [[2, 5]] },
    // seven spans, the halving's deepest path
    { s: [10, 10.1, 10.2, 10.3, 10.35, 10.6, 10.65, 11], spans: [[10, 1], [10.1, 2], [10.2, 3], [10.3, 4], [10.4, 5], [10.5, 6], [10.6, 7]] },
  ]);
  it("matches the linear reference on every point of every chain", () => {
    expect(Array.from(tentSpanRecord(T))).toEqual(Array.from(reference(T)));
  });
  it("records index, code and the next lo", () => {
    const ps = tentSpanRecord(T);
    // chain 0, point 3: s 0.25 sits on span 1's lo exactly
    expect(Array.from(ps.subarray(12, 16))).toEqual([1, 7, Math.fround(0.5), 0]);
    // chain 0, point 7: past the last span
    expect(Array.from(ps.subarray(28, 32))).toEqual([3, 9, Math.fround(1e30), 0]);
    // chain 1, point 0: a one-span chain
    expect(Array.from(ps.subarray(32, 36))).toEqual([0, 5, Math.fround(1e30), 0]);
  });
  it("reuses an out array of the right length and replaces one of another", () => {
    const out = new Float32Array(T.pts.length).fill(-1);
    expect(tentSpanRecord(T, out)).toBe(out);
    expect(Array.from(out)).toEqual(Array.from(reference(T)));
    const short = new Float32Array(4);
    const got = tentSpanRecord(T, short);
    expect(got).not.toBe(short);
    expect(got.length).toBe(T.pts.length);
  });
});

/** S3d's search verbatim (16 halvings per point): what the S3f walk must reproduce bit for bit. */
function halvings(T: TentSpanTables): Float32Array {
  const ps = new Float32Array(T.pts.length);
  const { pts, chain, span } = T;
  const at = (i: number) => (i < span.length ? span[i] : 0);
  for (let ci = 0; ci < T.nChains; ci++) {
    const off = chain[8 * ci], n = chain[8 * ci + 1], so = chain[8 * ci + 6], ns = chain[8 * ci + 7];
    for (let j = off; j < off + n; j++) {
      const s = pts[4 * j + 2];
      let lo = 0, hi = ns - 1;
      for (let it = 0; it < 16; it++) {
        if (lo >= hi) break;
        const mid = (lo + hi + 1) >> 1;
        if (at(4 * (so + mid)) <= s) lo = mid;
        else hi = mid - 1;
      }
      ps.set([lo, Math.trunc(at(4 * (so + lo) + 1)), lo + 1 < ns ? at(4 * (so + lo + 1)) : 1e30, 0], 4 * j);
    }
  }
  return ps;
}
const bits = (a: Float32Array) => Array.from(new Uint32Array(a.buffer, a.byteOffset, a.length));

describe("tentSpanRecord's walk (K1040 S3f)", () => {
  it("matches the halvings bit for bit: s backwards, repeated, NaN, unsorted and duplicate spans", () => {
    const T = tables([
      // s runs backwards and jumps: the walk steps back
      { s: [0.9, 0.3, 0.3, 0.05, 0.6, 0.1, 2], spans: [[0.1, 3], [0.25, 7], [0.5, 2], [0.75, 9]] },
      // NaN s reads span 0, as the halvings do
      { s: [0.4, NaN, 0.8, NaN], spans: [[0.1, 1], [0.3, 2], [0.7, 3]] },
      // unsorted spans: the halvings' answer, not the last lo <= s
      { s: [0.05, 0.2, 0.45, 0.6, 0.9], spans: [[0.1, 1], [0.5, 2], [0.3, 3], [0.8, 4]] },
      // duplicate lo values
      { s: [0.1, 0.2, 0.3, 0.35], spans: [[0.1, 1], [0.2, 2], [0.2, 3], [0.2, 4], [0.3, 5]] },
    ]);
    expect(bits(tentSpanRecord(T))).toEqual(bits(halvings(T)));
  });
  it("matches the halvings on 200 random chains", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
    const chains: { s: number[]; spans: [number, number][] }[] = [];
    for (let c = 0; c < 200; c++) {
      const ns = 1 + Math.floor(rnd() * 40);
      const los: number[] = [];
      let lo = rnd();
      for (let i = 0; i < ns; i++) { los.push(lo); if (rnd() > 0.15) lo += rnd() * 0.5; }
      if (c % 9 === 0) los.reverse(); // some unsorted
      const s: number[] = [];
      let x = rnd() * 0.5;
      const n = Math.floor(rnd() * 60);
      for (let j = 0; j < n; j++) {
        const r = rnd();
        x = r < 0.1 ? los[Math.floor(rnd() * ns)] : r < 0.2 ? x - rnd() : x + rnd() * 0.4;
        s.push(x);
      }
      chains.push({ s, spans: los.map((l, i) => [l, i + 1] as [number, number]) });
    }
    const T = tables(chains);
    expect(bits(tentSpanRecord(T))).toEqual(bits(halvings(T)));
  });
});
