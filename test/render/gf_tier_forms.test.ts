// K1362 s8: the tier's source forms `one` (the configuration loop's body under a constant trip count when nr == 0)
// and `bx` (the burial loops stop once a face cannot beat the surface's best value). Exactness on the GPU is the cmp
// bench's (0 px against full on 12 scenes: `one` on both GPUs; `bx` on the desktop only, 8-97 px on the Pixel); here
// the text: each form only adds what it says, the copy is the loop's own body, and the rounding fact bx rests on.
import { describe, expect, it } from "vitest";
import { gfFs, type GfTier } from "../../src/render/gpu_field/gf_glsl";

const T: GfTier = { p: 3, k: 2, ramps: true };
const count = (s: string, sub: string): number => s.split(sub).length - 1;
const LOOP = "    for (int cfg = 0; cfg <= nr; cfg++) {\n";
const BREAK = "if (!((1.0 - bur) * bx2 > v)) break;";
const SKIP = "if (!(bx2 > v)) continue;";

describe("gf tier forms", () => {
  it("one: nr == 0 runs a copy of the loop's own body once, the rest the loop", () => {
    for (const probe of [false, true]) {
      const plain = gfFs(probe, true, T);
      const one = gfFs(probe, true, { ...T, one: true });
      expect(count(plain, LOOP)).toBe(1);
      expect(count(one, LOOP)).toBe(1);
      expect(count(one, "    if (nr == 0) {\n    for (int cfg = 0; cfg <= 0; cfg++) {\n")).toBe(1);
      const a = plain.indexOf(LOOP) + LOOP.length;
      const body = plain.slice(a, plain.indexOf("\n    }\n    if (thruK >= 0) {", a));
      expect(body.length).toBeGreaterThan(100);
      expect(count(one, body)).toBe(2);
      expect(one.replace(`    if (nr == 0) {\n    for (int cfg = 0; cfg <= 0; cfg++) {\n${body}\n    }\n    } else {\n`, "").replace(`${LOOP}${body}\n    }\n    }`, `${LOOP}${body}\n    }`)).toBe(plain);
      expect(gfFs(probe, true, { ...T, one: false })).toBe(plain);
    }
  });

  it("bx: adds only its skips and breaks, on the piece, key and tangent faces", () => {
    for (const probe of [false, true]) for (const tangent of [true, false]) {
      const plain = gfFs(probe, tangent, T);
      const bx = gfFs(probe, tangent, { ...T, bx: true });
      expect(plain).not.toContain("bx2");
      expect(count(bx, SKIP)).toBe(3);
      expect(count(bx, BREAK)).toBe(4);
      expect(bx.split("\n").filter((l) => !l.includes("bx2")).join("\n")).toBe(plain);
      expect(bx).toContain("float bx2 = band2(h - X); " + SKIP);
      expect(bx).toContain("float bx2 = band2(Dk); " + SKIP);
      expect(bx).toContain("float bx2 = band2(dT); " + SKIP);
    }
    const both = gfFs(false, true, { ...T, one: true, bx: true });
    expect(count(both, BREAK)).toBe(4);
    expect(count(gfFs(false, true, { ...T, bx: true }, { split: 2 }), BREAK)).toBe(4);
  });

  it("fast (s9): only the define differs; layers1 is called for layers() alone and composite() stays shared", () => {
    for (const tangent of [true, false]) {
      const plain = gfFs(false, tangent, T);
      const fast = gfFs(false, tangent, { ...T, fast: true });
      expect(plain).not.toContain("#define FAST 1");
      expect(count(fast, "#define FAST 1\n")).toBe(1);
      expect(fast.replace("#define FAST 1\n", "\n")).toBe(plain);
      expect(gfFs(true, tangent, { ...T, fast: true })).toBe(gfFs(true, tangent, T));
      expect(count(fast, "if (fast) layers1(); else\n#endif\n      layers(p);\n")).toBe(1);
      expect(count(fast, "layers1()")).toBe(2);
    }
  });

  it("s (s9): a surface cap below p + k changes only MAXS and adds SCAP; at or above p + k it is the plain source", () => {
    for (const probe of [false, true]) for (const tangent of [true, false]) {
      const plain = gfFs(probe, tangent, T);
      expect(plain).not.toContain("#define SCAP");
      expect(count(plain, "#define MAXS 5\n\n")).toBe(1);
      expect(count(plain, "#ifdef SCAP\n")).toBe(5);
      expect(plain).toContain("  if (ns == MAXS) { sOvf = true; return MAXS - 1; }\n");
      expect(plain).toContain("      if (sOvf) { discard; return; }\n");
      for (const s of [5, 6]) expect(gfFs(probe, tangent, { ...T, s })).toBe(plain);
      for (const s of [1, 2, 3, 4]) {
        const cap = gfFs(probe, tangent, { ...T, s });
        expect(count(cap, `#define MAXS ${s}\n#define SCAP 1\n`)).toBe(1);
        expect(cap.replace(`#define MAXS ${s}\n#define SCAP 1\n`, "#define MAXS 5\n\n")).toBe(plain);
      }
    }
  });

  it("lab (s9): only the define differs, the probe is untouched, and the running label picks what the arrays pick", () => {
    for (const tangent of [true, false]) {
      const plain = gfFs(false, tangent, T);
      const lab = gfFs(false, tangent, { ...T, lab: true });
      expect(plain).not.toContain("#define LABRUN 1");
      expect(lab.replace("#define LABRUN 1\n", "\n")).toBe(plain);
      expect(gfFs(true, tangent, { ...T, lab: true })).toBe(gfFs(true, tangent, T));
      expect(count(lab, "labK = ")).toBe(3);
    }
    // The arrays' choice (sckey / scch / scov, then the first covered surface with the greatest key) against the
    // running one, on random contribution lists with ties, -BIG and NaN keys. Keys are float32s; no arithmetic.
    const BIG = 1e30;
    let s = 0x2545f491;
    const rnd = (n: number): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };
    const KEYS = [-BIG, NaN, -1, 0, 0.5, 0.5, 2, Math.fround(0.1)];
    for (let it = 0; it < 20000; it++) {
      const n = 1 + rnd(6); const ns = 1 + rnd(4);
      const cs = Array.from({ length: n }, () => ({ e: rnd(ns), key: KEYS[rnd(KEYS.length)], cov: rnd(3) > 0, ch: rnd(9) }));
      const sck = new Array(ns).fill(-BIG); const sch = new Array(ns).fill(-1); const scv = new Array(ns).fill(false);
      for (const c of cs) if (c.cov) { scv[c.e] = true; if (c.key > sck[c.e]) { sck[c.e] = c.key; sch[c.e] = c.ch; } }
      let top = -1;
      for (let i = 0; i < ns; i++) if (scv[i] && (top < 0 || sck[i] > sck[top])) top = i;
      const want = top >= 0 ? sch[top] : -1;
      let labC = -1; let labK = -BIG; let labE = -1;
      for (const c of cs) if (c.cov && (c.key > labK || (c.key === labK && c.e < labE))) { labK = c.key; labE = c.e; labC = c.ch; }
      expect(labC).toBe(want);
    }
  });

  it("bx rests on: a rounded product of values in [0, 1] is at most each factor", () => {
    let s = 0x9e3779b9;
    const rnd = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const u = s / 2 ** 32; return Math.fround(u < 0.1 ? 0 : u > 0.9 ? 1 : u); };
    for (let i = 0; i < 20000; i++) {
      const a = rnd(); const b = rnd(); const c = rnd();
      const ab = Math.fround(a * b);
      expect(ab <= a && ab <= b).toBe(true);
      const abc = Math.fround(ab * c); const bc = Math.fround(b * c);
      expect(abc <= ab && Math.fround(a * bc) <= ab).toBe(true);
      const bur = rnd(); const bur2 = Math.max(bur, rnd());
      expect(Math.fround(Math.fround(1 - bur2) * b) <= Math.fround(Math.fround(1 - bur) * b)).toBe(true);
    }
  });
});

// K1362 s10: tier forms that keep fewer per-pixel values (the Pixel's cost follows the arrays). Each changes only its
// defines in the source text; the models below replay the GLSL statements on the values they move.
describe("gf tier forms, s10 lean arrays", () => {
  const L: GfTier = { ...T, s: 3, lab: true };
  const FLAGS: [Partial<GfTier>, string[]][] = [
    [{ grp: true }, ["PGRP"]], [{ ks: true }, ["PKS"]], [{ kq: true }, ["PKQ"]], [{ lh: true }, ["PLH"]],
    [{ so: true }, ["SORTIN"]], [{ grp: true, cs: true }, ["PGRP", "PCS"]], [{ kr: true }, ["KLEAN", "KRHO"]], [{ kl: true }, ["KLEAN"]],
  ];
  let s = 0x51ed2701;
  const rnd = (n: number): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };

  it("each flag adds only its defines; the probe is untouched; split, reg and pack refuse them", () => {
    for (const tangent of [true, false]) {
      const plain = gfFs(false, tangent, L);
      for (const [f, defs] of FLAGS) {
        let src = gfFs(false, tangent, { ...L, ...f });
        for (const d of defs) { expect(src).toContain(`#define ${d} 1\n`); src = src.replace(`#define ${d} 1\n`, "\n"); }
        expect(src).toBe(plain);
        expect(gfFs(true, tangent, { ...L, ...f })).toBe(gfFs(true, tangent, L));
        expect(() => gfFs(false, tangent, { ...L, ...f, reg: true })).toThrow(/plain-form/);
      }
    }
    expect(() => gfFs(false, true, { ...T, s: 3, so: true })).toThrow(/needs lab/);
    expect(() => gfFs(false, true, { ...L, cs: true })).toThrow(/needs grp/);
  });

  it("grp: psurf written once and decoded per configuration is the pg / pramp membership, with the same weights", () => {
    const MAXP = 3; const MAXR = 2;
    const RAMPS = [0, 0.25, 0.5, 0.75, 1, Math.fround(0.1), Math.fround(0.9), 0.5];
    for (let it = 0; it < 20000; it++) {
      const np = 1 + rnd(MAXP);
      const mg = Array.from({ length: np }, () => rnd(5) - 1); const mr = Array.from({ length: np }, () => RAMPS[rnd(RAMPS.length)]);
      // the arrays (the #else form)
      const pg = [...mg]; const pr = [...mr]; let nr = 0; let i0 = 0; let i1 = 0;
      for (let j = 0; j < np; j++) if (mg[j] >= 0 && mr[j] > 0 && mr[j] < 1) { if (nr < MAXR) { if (nr === 0) i0 = j; else i1 = j; nr++; } else pr[j] = mr[j] >= 0.5 ? 1 : 0; }
      if (nr === 2 && pr[i0] < pr[i1]) { const t = i0; i0 = i1; i1 = t; }
      // PGRP
      const ps: number[] = []; let gnr = 0; let g0 = 0; let g1 = 0; let r0 = 0; let r1 = 0;
      for (let j = 0; j < np; j++) {
        let p = mr[j]; let rmp = false;
        if (mg[j] >= 0 && mr[j] > 0 && mr[j] < 1) { if (gnr < MAXR) { if (gnr === 0) { g0 = j; r0 = mr[j]; } else { g1 = j; r1 = mr[j]; } gnr++; rmp = true; } else p = mr[j] >= 0.5 ? 1 : 0; }
        ps[j] = rmp ? -1 - j - MAXP * (mg[j] + 1) : mg[j] >= 0 && p >= 1 ? mg[j] : -1 - j;
      }
      if (gnr === 2 && r0 < r1) { let t = g0; g0 = g1; g1 = t; t = r0; r0 = r1; r1 = t; }
      expect([gnr, g0, g1]).toEqual([nr, i0, i1]);
      for (let cfg = 0; cfg <= nr; cfg++) {
        if (cfg >= 1) { const jr = cfg === 1 ? g0 : g1; const id = ps[jr]; if (id < -MAXP) ps[jr] = Math.trunc((-1 - jr - id) / MAXP) - 1; }
        const hi = cfg === 0 ? 1 : pr[cfg === 1 ? i0 : i1]; const lo = cfg === nr ? 0 : pr[cfg === 0 ? i0 : i1];
        expect([cfg === 0 ? 1 : cfg === 1 ? r0 : r1, cfg === nr ? 0 : cfg === 0 ? r0 : r1]).toEqual([hi, lo]);
        for (let j = 0; j < np; j++) {
          let mem = pg[j] >= 0 && pr[j] >= 1;
          if (pg[j] >= 0 && pr[j] > 0 && pr[j] < 1) mem = (cfg >= 1 && i0 === j) || (cfg >= 2 && i1 === j);
          // a member carries its group; a non-member is a surface of its own (a negative id no other piece holds)
          if (mem) expect(ps[j]).toBe(pg[j]);
          else { expect(ps[j]).toBeLessThan(0); expect(ps.filter((v) => v === ps[j]).length).toBe(1); }
        }
      }
    }
  });

  it("so: sorting (sid, skey) in place is the sord order, ties and NaN included", () => {
    const KEYS = [-1e30, NaN, -1, 0, 0.5, 0.5, 2, Math.fround(0.1)];
    for (let it = 0; it < 20000; it++) {
      const ns = 1 + rnd(4);
      const sid = Array.from({ length: ns }, (_, i) => 10 + i); const skey = Array.from({ length: ns }, () => KEYS[rnd(KEYS.length)]);
      const sord = sid.map((_, i) => i);
      for (let i = 1; i < ns; i++) { const v = sord[i]; let m = i - 1; while (m >= 0 && skey[sord[m]] < skey[v]) { sord[m + 1] = sord[m]; m--; } sord[m + 1] = v; }
      const id2 = [...sid]; const k2 = [...skey];
      for (let i = 1; i < ns; i++) { const vid = id2[i]; const vk = k2[i]; let m = i - 1; while (m >= 0 && k2[m] < vk) { id2[m + 1] = id2[m]; k2[m + 1] = k2[m]; m--; } id2[m + 1] = vid; k2[m + 1] = vk; }
      expect(id2).toEqual(sord.map((e) => sid[e]));
      expect(k2).toEqual(sord.map((e) => skey[e]));
    }
  });

  it("lh and cs: the packed ints round-trip every value they accept (GLSL int ops are JS's int32 ops)", () => {
    const PLO = (v: number): number => (v & 0xffff) - 32768;
    for (let it = 0; it < 20000; it++) {
      const lo = rnd(65536) - 32768; const span = rnd(256); const ko = rnd(span + 1);
      const v = (lo + 32768) | (span << 16) | (ko << 24);
      expect([PLO(v), PLO(v) + ((v >> 16) & 0xff), PLO(v) + ((v >> 24) & 0xff)]).toEqual([lo, lo + span, lo + ko]);
      const c = rnd(65536); const surf = rnd(65536) - 32768; const surf2 = rnd(65536) - 32768;
      const set = (pc: number, sv: number): number => ((pc >>> 0) & 0xffff) | (((sv + 32768) >>> 0) << 16);
      const p1 = set(c, surf); const p2 = set(p1, surf2);
      expect([p1 & 0xffff, (p1 >>> 16) - 32768, p2 & 0xffff, (p2 >>> 16) - 32768]).toEqual([c, surf, c, surf2]);
    }
  });
});
