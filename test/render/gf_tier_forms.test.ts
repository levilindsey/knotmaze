// K1362 s8: the tier's source forms `one` (the configuration loop's body under a constant trip count when nr == 0)
// and `bx` (the burial loops stop once a face cannot beat the surface's best value). Exactness on the GPU is the cmp
// bench's (0 px against full on 12 scenes: `one` on both GPUs; `bx` on the desktop only, 8-97 px on the Pixel); here
// the text: each form only adds what it says, the copy is the loop's own body, and the rounding fact bx rests on.
import { describe, expect, it } from "vitest";
import { gfFs, type GfTier } from "../../src/render/gpu_field/gf_glsl";
import { cornerPlan, GF_TIERS } from "../../src/render/gpu_field/gf_pass";

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

// K1362 s11: the layering's per-pixel state. Each form lets one slot hold two values whose lifetimes do not overlap
// (sv in sid, sa in skey, the sector in krho's sign) or packs the sort order into one int; the models replay the GLSL.
describe("gf tier forms, s11 layering state", () => {
  const L: GfTier = { ...T, s: 3, lab: true, grp: true, ks: true };
  const FLAGS: [Partial<GfTier>, string[]][] = [
    [{ vs: true }, ["SVSID"]], [{ ga: true }, ["SGAP"]], [{ sc: true }, ["SCODE"]], [{ kc: true }, ["KLEAN", "KRHO", "KSGN"]],
    [{ vs: true, ga: true, sc: true, kc: true }, ["KLEAN", "KRHO", "KSGN", "SVSID", "SGAP", "SCODE"]],
  ];
  let s = 0x51ed2711;
  const rnd = (n: number): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };

  it("each flag adds only its defines; the probe is untouched; reg refuses them; the caps hold", () => {
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
    expect(() => gfFs(false, true, { ...L, s: 4, ga: true })).toThrow(/ga keeps two gaps/);
    expect(() => gfFs(false, true, { ...L, s: undefined, ga: true })).toThrow(/ga keeps two gaps/);
    expect(() => gfFs(false, true, { ...L, s: 4, sc: true })).not.toThrow();
    expect(() => gfFs(false, true, { ...L, so: true, sc: true })).toThrow(/sc packs the order/);
    expect(() => gfFs(false, true, { ...L, kc: true, kr: true })).toThrow(/kc is its own corner form/);
  });

  it("sc: the insertion sort on the order packed 2 bits an entry is sord's, ties and NaN included", () => {
    const KEYS = [-1e30, NaN, -1, 0, 0.5, 0.5, 2, Math.fround(0.1)];
    for (let it = 0; it < 20000; it++) {
      const ns = 1 + rnd(4); const skey = Array.from({ length: ns }, () => KEYS[rnd(KEYS.length)]);
      const sord = skey.map((_, i) => i);
      for (let i = 1; i < ns; i++) { const v = sord[i]; let m = i - 1; while (m >= 0 && skey[sord[m]] < skey[v]) { sord[m + 1] = sord[m]; m--; } sord[m + 1] = v; }
      let sordc = 228;
      const SORD = (i: number): number => (sordc >> (2 * i)) & 3;
      const SCSET = (i: number, v: number): void => { sordc = (sordc & ~(3 << (2 * i))) | (v << (2 * i)); };
      for (let i = 1; i < ns; i++) { const v = SORD(i); let m = i - 1; while (m >= 0 && skey[SORD(m)] < skey[v]) { SCSET(m + 1, SORD(m)); m--; } SCSET(m + 1, v); }
      expect(sord.map((_, i) => SORD(i))).toEqual(sord);
    }
  });

  it("vs, ga: the face loop reads each slot's old value before it writes the new one; composite gets the same gaps", () => {
    const buf = new ArrayBuffer(4); const fv = new Float32Array(buf); const iv = new Int32Array(buf);
    const bits = (x: number): number => { fv[0] = x; return iv[0]; }; const flt = (i: number): number => { iv[0] = i; return fv[0]; };
    const VALS = [0, -0, 1, 0.5, Math.fround(0.1), 1e-40, -3.5, Infinity];
    for (let it = 0; it < 20000; it++) {
      const ns = 1 + rnd(3);
      const sid = Array.from({ length: ns }, (_, i) => 7 * i - 5 + rnd(3)); const skey = Array.from({ length: ns }, () => Math.fround((rnd(9) - 4) * 0.25));
      const fV = sid.map(() => VALS[rnd(VALS.length)]); const fA = sid.map(() => VALS[rnd(VALS.length)]);
      const face = (S: number): [number, number] => [fV[sid.indexOf(S)], fA[sid.indexOf(S)]]; // v and D's ramp come from S alone
      // the arrays: sv and sa beside sid and skey; composite takes its gaps from skey
      const sv: number[] = []; const sa: number[] = [];
      for (let e = 0; e < ns; e++) { const [v, a] = face(sid[e]); sv[e] = v; sa[e] = a; }
      const gaps = Array.from({ length: ns - 1 }, (_, i) => skey[i] - skey[i + 1]);
      // SVSID + SGAP: the gaps first, then sid[e] takes v's bits and skey[e] takes sa
      const id2 = [...sid]; const k2 = [...skey];
      const gp0 = ns > 1 ? k2[0] - k2[1] : 0; const gp1 = ns > 2 ? k2[1] - k2[2] : 0;
      for (let e = 0; e < ns; e++) { const S = id2[e]; const [v, a] = face(S); id2[e] = bits(v); k2[e] = a; }
      expect(id2.map(flt)).toEqual(sv.map((v) => flt(bits(v))));
      expect(k2).toEqual(sa);
      expect(gaps.map((_, i) => (i === 0 ? gp0 : gp1))).toEqual(gaps);
    }
  });

  it("kc: the scan's rho, or -1 outside the sector, gives back the sector, the ring class and rho where it is read", () => {
    const aa = Math.fround(0.75);
    for (let it = 0; it < 20000; it++) {
      const z = Math.fround(rnd(40) * 0.25); const w = Math.fround(z + rnd(12) * 0.25);
      const RH = [0, z, w, Math.fround(z - aa), Math.fround(w + 0.25), Math.fround(rnd(80) * 0.125), Math.sqrt(rnd(1000))];
      const rho = RH[rnd(RH.length)]; const sec = rnd(2) === 0;
      // the scan
      const inR = rho <= w && sec; const kin = !inR ? 0 : rho > z - aa ? 2 : 1;
      // KSV, then kSG
      const kr = sec ? rho : -1.0;
      const sec2 = kr >= 0; const inR2 = kr <= w && sec2; const kin2 = !inR2 ? 0 : kr > z - aa ? 2 : 1;
      expect([sec2, kin2]).toEqual([sec, kin]);
      if (sec2 || kin2 === 2) expect(kr).toBe(rho); // rho is read only past `if (!ksJ) continue` or `kiI != 2`
    }
  });
});

// K1362 s12 kz: the corner-free cell programs (gf_glsl.ts cornerRoute, gf_pass.ts cornerPlan). Exactness on the GPU
// is the cmp bench's (0 px against full on 12 scenes); here the text: free differs from the tier only by the corner
// scan (whose loops make no trip in a cell listing no corner), nk's constant and its guard; corner only by its guard.
describe("gf tier forms, s12 corner-free cells", () => {
  const L: GfTier = { ...T, s: 3, lab: true, grp: true, ks: true };
  const CELL = "    vec4 CE = F(uOCell + cell);\n";
  const SCAN = "    // corners near p\n    int k0 = int(CE.z); int kn = int(CE.w);\n";
  const END = "#ifdef TIER\n    if (ovf) { discard; return; } // never past the arrays: D3D runs on past a discard\n#endif\n";
  const guardLine = (src: string, op: string): string => { const i = src.indexOf(CELL) + CELL.length; const line = src.slice(i, src.indexOf("\n", i) + 1); expect(line.startsWith(`    if (int(CE.w) ${op} 0) { discard; return; }`)).toBe(true); return line; };

  it("corner is the tier plus one guard after the cell fetch", () => {
    for (const t of [L, { ...L, kc: true }, T]) {
      const plain = gfFs(false, true, t); const src = gfFs(false, true, { ...t, kz: "corner" });
      expect(src.replace(guardLine(src, "=="), "")).toBe(plain);
    }
  });

  it("free drops only the corner scan, whose loops run k0 .. k0 + kn: none when the cell lists no corner", () => {
    for (const t of [L, { ...L, kc: true }, T]) {
      const plain = gfFs(false, true, t); const src = gfFs(false, true, { ...t, kz: "free" });
      const i0 = plain.indexOf(SCAN); const i1 = plain.indexOf(END, i0);
      const scan = plain.slice(i0, i1);
      // every corner loop in the scan is bounded by kn, and the only state it leaves is thruK, thruQ, yielded, nk
      // (and nk's arrays, nK, tj): with kn == 0 those keep the values the declaration line gives them
      expect(count(scan, "for (int q = k0; q < k0 + kn")).toBe(4); // thru, yielded, keep (TIER and full forms)
      expect(count(scan, "for (")).toBe(5); // the fifth is the tj check inside the yielded loop
      expect(scan).toContain("    int thruK = -1; float thruQ = 0.0; bool yielded = false; int nTj = 0; int tj[8];\n");
      const back = src.replace(guardLine(src, ">"), "").split(" const int nk = 0;").join(" int nk;").replace("np = 0; ns = 0;", "np = 0; nk = 0; ns = 0;");
      const thru = "    int thruK = -1; float thruQ = 0.0; bool yielded = false; // K1362 s12 kz: no corner in this cell\n";
      expect(back.split(thru).join(scan)).toBe(plain);
      // nothing writes nk but split pass 2 (under #ifdef SPLIT2, which a kz tier refuses)
      const writes = [...src.split(" const int nk = 0;").join("").matchAll(/\bnk\s*(\+\+|=[^=])/g)].map((m) => src.split(" const int nk = 0;").join("").slice(m.index, m.index + 28));
      expect(writes).toEqual(["nk = int((S3.y >> 17) & 3u);"]);
      const sp = src.indexOf("#ifdef SPLIT2\n"); expect(sp).toBeGreaterThan(0); expect(src.indexOf("nk = int((S3.y >> 17)")).toBeGreaterThan(sp);
      expect(count(src, " const int nk = 0;")).toBe(2);
    }
  });

  it("only plain-form tiers, the probe untouched; route and frame are GfPass's to expand", () => {
    for (const f of [{ reg: true }, { pack: true as const }, { unroll: true }, { split: 1 as const }]) expect(() => gfFs(false, true, { ...T, kz: "free" }, f)).toThrow(/kz is a plain-form tier|split needs/);
    for (const kz of ["route", "frame", "free", "corner"] as const) expect(gfFs(true, true, { ...L, kz })).toBe(gfFs(true, true, L));
    // the app's default is the per-frame choice (stage 12): the gf_app counts probe builds GF_TIERS too
    expect(GF_TIERS).toEqual([{ p: 3, k: 2, ramps: true, s: 3, lab: true, grp: true, ks: true, kz: "frame" }]);
    for (const kz of ["route", "frame"] as const) expect(() => gfFs(false, true, { ...L, kz })).toThrow(/GfPass's to expand/);
    expect(cornerPlan({ ...L, kz: "route" })).toEqual([{ tier: { ...L, kz: "free" } }, { tier: { ...L, kz: "corner" }, when: "corners" }]);
    expect(cornerPlan({ ...L, kz: "frame" })).toEqual([{ tier: { ...L, kz: "free" }, when: "none" }, { tier: { ...L, kz: undefined }, when: "corners" }]);
    expect(cornerPlan(L)).toEqual([{ tier: L }]);
    // fj under "frame" is the corner-free program's alone; the frames with corners draw the plain tier
    for (const fj of [true, "s"] as const) {
      const [free, corners] = cornerPlan({ ...L, kz: "frame", fj });
      expect(free).toEqual({ tier: { ...L, kz: "free", fj }, when: "none" }); expect(corners.tier.fj).toBeUndefined();
      expect(gfFs(false, true, corners.tier)).toBe(gfFs(false, true, L));
    }
  });
});

// K1362 s12 fj: the one-pass face loop (gf_glsl.ts faceJoin). Exactness on the GPU is the cmp bench's (0 px against
// full on 12 scenes); here the text (only layers() changes, each face kind once, each face on its own surface's slot)
// and the order fact it rests on: one pass visits each surface's faces in the order the per-surface pass did.
describe("gf tier forms, s12 face loop", () => {
  const L: GfTier = { ...T, s: 3, lab: true, grp: true, ks: true };
  const HEAD = "void layers(vec2 p) {\n"; const NEXT = "void layers1() {";
  const SLOT = "int slotOf(int id) { for (int i = 0; i < ns; i++) if (sid[i] == id) return i; return -1; }\n";
  const parts = (src: string): string[] => {
    const a = src.indexOf(HEAD); const b = src.indexOf(NEXT, a);
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a);
    return [src.slice(0, a), src.slice(a, b), src.slice(b)];
  };

  it("fj rewrites only layers() (and adds slotOf before it), alone and with kz free", () => {
    for (const t of [L, { ...L, kz: "free" as const }, T]) for (const fj of [true, "s"] as const) {
      const [p0, plain, p2] = parts(gfFs(false, true, t)); const [f0, body, f2] = parts(gfFs(false, true, { ...t, fj }));
      expect(f0).toBe(p0 + SLOT); expect(f2).toBe(p2);
      expect(count(plain, "    int S = sid[e];")).toBe(1); expect(body).not.toContain("int S = sid[e];"); // no pass per surface
      expect(count(body, "int e = slotOf(S); if (e < 0) continue;")).toBe(3); // pieces, corners, tangent points: each once
      if (fj === true) { expect(count(body, "if (val > sv[e]) { sv[e] = val;")).toBe(3); expect(count(body, "if (val > v) {")).toBe(0); }
      // "s": v loaded from the slot as each face starts, written back wherever it rises, so v == sv[e] throughout
      else { expect(count(body, " float v = sv[e];")).toBe(3); expect(count(body, "if (val > v) { v = val; sv[e] = val;")).toBe(3); expect(count(body, "if (val > v) {")).toBe(3); }
      // D finished (pieces and corners) before the tangent points read it, smoothed once at the end
      const iT = body.indexOf("if (K1.x > 0.5) continue; int S = int(K1.z);"); const iK = body.indexOf("if (!kSec[i]) continue; int S = int(K1.z);");
      expect(body.indexOf("if (h - X > sa[e]) sa[e] = h - X;")).toBeLessThan(iK); expect(iK).toBeLessThan(iT);
      expect(body.indexOf("  for (int e = 0; e < ns; e++) sa[e] = ss(-aa, aa, sa[e]);\n")).toBeGreaterThan(iT);
    }
  });

  it("the probe is untouched; fj is a plain-form tier", () => {
    for (const fj of [true, "s"] as const) expect(gfFs(true, true, { ...L, fj })).toBe(gfFs(true, true, L));
    for (const f of [{ kq: true }, { kl: true }, { kr: true }, { kc: true }, { vs: true }, { ga: true }, { one: true }, { bx: true }]) expect(() => gfFs(false, true, { ...L, ...f, fj: true })).toThrow(/fj is a plain-form tier/);
    for (const f of [{ reg: true }, { pack: true as const }, { unroll: true }, { split: 1 as const }]) expect(() => gfFs(false, true, { ...L, fj: true }, f)).toThrow();
  });

  it("one pass keeps each surface's faces in order, so a strict running max picks the same face, ties included", () => {
    let seed = 7; const rnd = (n: number): number => { seed = (seed * 1103515245 + 12345) >>> 0; return seed % n; };
    for (let trial = 0; trial < 200; trial++) {
      const ns = 1 + rnd(3); const sid = [5, 2, 9].slice(0, ns);
      const faces = Array.from({ length: rnd(12) }, (_, i) => ({ i, S: [5, 2, 9, 4][rnd(4)], val: rnd(4) / 4 })); // 4: a surface not in sid
      const per = sid.map((S) => { let v = 0, at = -1; for (const f of faces) { if (f.S !== S) continue; if (f.val > v) { v = f.val; at = f.i; } } return [v, at]; });
      const one = sid.map(() => [0, -1]);
      for (const f of faces) { const e = sid.indexOf(f.S); if (e < 0) continue; if (f.val > one[e][0]) one[e] = [f.val, f.i]; }
      expect(one).toEqual(per);
    }
  });
});

// K1362 s13 `lz`: the face loop runs in sorted order and stops after the first opaque place (plus the next on a
// near tie). Here the text (only the loop's head and the stop differ) and the argument: composite() reads no place
// the stop left uncomputed, run on float32 values with exact ties, the 2 zt edge and D at the 2 aa edge.
describe("gf tier forms, s13 lazy faces", () => {
  const L: GfTier = { ...T, s: 3, lab: true, grp: true, ks: true };
  const HEAD = "  for (int e = 0; e < ns; e++) {\n    int S = sid[e];";
  const LZ_HEAD = "  bool lzX = false; // K1362 s13 lz: the faces in sorted order, up to the first opaque place (plus the next on a near tie)\n" +
    "  for (int lzI = 0; lzI < ns; lzI++) {\n    int e = SORD(lzI);\n    int S = sid[e];";
  const LZ_STOP = "    if (lzX) break;\n    if (D > 2.0 * aa) { if (!(lzI + 1 < ns) || skey[SORD(lzI)] - skey[SORD(lzI + 1)] >= 2.0 * uZt) break; lzX = true; }\n";

  it("lz: only the loop's head and its stop differ; the probe is untouched; fj and ga refuse it", () => {
    const BASES: GfTier[] = [L, { ...L, kz: "free" }, { ...L, kz: "corner" }, { ...L, sc: true }, { ...L, so: true }, { ...L, vs: true }, { ...L, one: true }];
    for (const tangent of [true, false]) for (const base of BASES) {
      const plain = gfFs(false, tangent, base); const lz = gfFs(false, tangent, { ...base, lz: true });
      expect(count(plain, HEAD)).toBe(1); expect(count(lz, LZ_HEAD)).toBe(1); expect(count(lz, LZ_STOP)).toBe(1);
      expect(lz.replace(LZ_HEAD, HEAD).replace(LZ_STOP, "")).toBe(plain);
      expect(gfFs(true, tangent, { ...base, lz: true })).toBe(gfFs(true, tangent, base));
    }
    for (const f of [{ fj: true }, { ga: true }]) expect(() => gfFs(false, true, { ...L, ...f, lz: true })).toThrow(/lz is a plain-form/);
    expect(cornerPlan({ ...GF_TIERS[0], lz: true }).every((p) => p.tier?.lz)).toBe(true);
  });

  it("lz: composite() reads no surface the stop left uncomputed", () => {
    const f = Math.fround; const aa = f(0.02518); const zt = f(0.06032);
    const ss = (e0: number, e1: number, x: number): number => { const t = Math.min(1, Math.max(0, f(f(x - e0) / f(e1 - e0)))); return f(f(t * t) * f(3 - 2 * t)); };
    const DS = [-1e30, -1, -aa, 0, aa, f(2 * aa), f(2 * aa * (1 + 2 ** -22)), f(3 * aa), 0.5, NaN];
    const KS = [0, zt, f(2 * zt), f(0.03), f(0.1), f(0.2), f(1)];
    const VS = [0, 0.25, 0.5, 1];
    let s = 0x13a2b5;
    const rnd = (n: number): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };
    let reads = 0; let stops = 0;
    for (let n = 0; n < 40000; n++) {
      const ns = 1 + rnd(3);
      const key = Array.from({ length: ns }, () => KS[rnd(KS.length)]);
      const D = Array.from({ length: ns }, () => DS[rnd(DS.length)]);
      const v = Array.from({ length: ns }, () => VS[rnd(VS.length)]);
      const ord = key.map((_, i) => i);
      for (let i = 1; i < ns; i++) { const x = ord[i]; let m = i - 1; while (m >= 0 && key[ord[m]] < key[x]) { ord[m + 1] = ord[m]; m--; } ord[m + 1] = x; }
      const done = new Set<number>(); let lzX = false;
      for (let i = 0; i < ns; i++) {
        done.add(ord[i]);
        if (lzX) break;
        if (D[ord[i]] > f(2 * aa)) { if (!(i + 1 < ns) || f(key[ord[i]] - key[ord[i + 1]]) >= f(2 * zt)) break; lzX = true; }
      }
      if (done.size < ns) stops++;
      const rd = (e: number): void => { if (!done.has(e)) reads++; };
      const comp = (sw: number): number => {
        let Tt = 1; let ink = 0;
        for (let i = 0; i < ns; i++) {
          let e = ord[i]; if (sw >= 0 && i === sw) e = ord[i + 1]; else if (sw >= 0 && i === sw + 1) e = ord[i - 1];
          rd(e); const c = f(Tt * v[e]); if (c > 0) ink = f(ink + c);
          Tt = f(Tt * f(1 - ss(-aa, aa, D[e]))); if (!(Tt > 0)) break;
        }
        return Math.min(1, ink);
      };
      let r = comp(-1);
      for (let i = 0; i + 1 < ns; i++) {
        const gap = f(key[ord[i]] - key[ord[i + 1]]);
        if (!(gap < zt)) continue;
        const r2 = comp(i); if (r2 === r) continue;
        const t = ss(-zt, zt, gap); r = f(f(t * r) + f(f(1 - t) * r2)); break;
      }
    }
    expect(reads).toBe(0);
    expect(stops).toBeGreaterThan(5000);
  });
});

// K1362 s13 `fs`: stage 8's face skip made exact (one band2 per face into fb, skipped when !(fb > v), no break in
// the burial loops). The text: only the fb lines differ and each value multiplies that fb; the rounding fact is
// "bx rests on" above.
describe("gf tier forms, s13 exact face skip", () => {
  const L: GfTier = { ...T, s: 3, lab: true, grp: true, ks: true };
  const FB = /\n *float fb = band2\(([^;]*)\); if \(!\(fb > v\)\) continue; \/\/ K1362 s13 fs/g;

  it("fs: one skip per face kind, each value on its fb, nothing else; the probe is untouched; fj and bx refuse it", () => {
    const BASES: GfTier[] = [L, { ...L, kz: "free" }, { ...L, kz: "corner" }, { ...L, lz: true }, { ...L, kc: true }, { ...L, one: true }];
    for (const tangent of [true, false]) for (const base of BASES) {
      const plain = gfFs(false, tangent, base); const fs = gfFs(false, tangent, { ...base, fs: true });
      const args = [...fs.matchAll(FB)].map((m) => m[1]);
      expect(args).toEqual(plain.includes("#ifdef TANGENT\n    for (int i = 0; i < nk; i++) {") ? ["h - X", "Dk", "dT"] : ["h - X", "Dk"]);
      expect(count(fs, "(1.0 - bur) * fb")).toBe(args.length);
      let back = fs.replace(FB, "");
      for (const a of args) back = back.replace("(1.0 - bur) * fb", `(1.0 - bur) * band2(${a})`);
      expect(back).toBe(plain);
      expect(gfFs(true, tangent, { ...base, fs: true })).toBe(gfFs(true, tangent, base));
    }
    for (const f of [{ fj: true }, { bx: true }]) expect(() => gfFs(false, true, { ...L, ...f, fs: true })).toThrow(/fs is a plain-form/);
  });
});
