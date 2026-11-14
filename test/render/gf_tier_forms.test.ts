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
