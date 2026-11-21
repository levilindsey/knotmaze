// K1439: K1438's home membership in the shader (gf_glsl.ts homeForm), behind the `gfh=1` render flag (GfPass
// { home: true }). Without the flag, the programs, keys and packed tables are master's byte for byte: the digests
// below are cfb1f30b's (.claude/probes/K1439/k1439_pin.ts printed them on master's gf_glsl / gf_keys / gf_pass and on
// this stage's, equal). A change to the programs or the tables moves them on purpose: re-pin and say so.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { GF_VS, gfFs, homeForm } from "../../src/render/gpu_field/gf_glsl";
import { buildKeys } from "../../src/render/gpu_field/gf_keys";
import { GF_TW, packTables } from "../../src/render/gpu_field/gf_pack";
import { GfPass } from "../../src/render/gpu_field/gf_pass";
import { buildTables, type GfTables } from "../../src/render/gpu_field/tables";

// K1575: the GF_* switches are read once at module load (tables.ts), so this file pins its own environment
// before that import evaluates and restores the shell's values afterwards; no other file inherits the pin
// (vitest isolates files). The digests below stay master's: both home states are covered through GfOpts
// and the { ...T, homeOn } copies, never through the shell.
const savedGfEnv = vi.hoisted(() => {
  const keys = ["GF_HOME", "GF_KRETRY", "GF_KEXT", "GF_KCAP", "GF_KRMAX", "GF_KSAG", "GF_KRMIN", "GF_KXB", "GF_KXTOL", "GF_KXZ", "GF_NOCLIP", "GF_TANG", "GF_SELFBUR", "GF_S34", "GF_S32"];
  const saved: Record<string, string | undefined> = {};
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  return saved;
});
afterAll(() => {
  for (const [k, v] of Object.entries(savedGfEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const AA = 0.5 / 320;
const sha = (...b: (string | ArrayBufferView)[]): string => {
  const H = createHash("sha256");
  for (const x of b) H.update(typeof x === "string" ? x : new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
  return H.digest("hex");
};
/** A WebGL2 stand-in that records every shader source GfPass compiles. */
function fakeGl(srcs: string[]): WebGL2RenderingContext {
  return new Proxy({}, {
    get: (_t, p) => (p === "shaderSource" ? (_s: unknown, src: string) => { srcs.push(src); } : typeof p === "string" && /^[A-Z_0-9]+$/.test(p) ? 1 : () => ({})),
  }) as unknown as WebGL2RenderingContext;
}
function sources(probe: boolean, home?: boolean): { srcs: string[]; pass: GfPass } {
  const srcs: string[] = [];
  const pass = home === undefined ? new GfPass(fakeGl(srcs), probe) : new GfPass(fakeGl(srcs), probe, undefined, undefined, false, { home });
  // K1456: the app pass compiles async (nothing is issued at construction); flush it so the recorded
  // sources are the whole base set, as the synchronous constructor used to compile.
  (pass as unknown as { flushPrograms(): void }).flushPrograms();
  return { srcs, pass };
}
const keysDigest = (T: GfTables): string => {
  const K = buildKeys(T);
  return sha(K.kc, K.kb, K.ka);
};
const packDigest = (T: GfTables): string => {
  const P = packTables(T, undefined, buildKeys(T));
  return sha(P.data.subarray(0, P.rows * 4 * GF_TW));
};

describe("K1439 flag off: master's programs and tables", () => {
  it("GfPass compiles master's sources (app and probe)", () => {
    const app = sources(false); const probe = sources(true);
    expect(new Set(app.srcs).size).toBe(4); // three fragment programs on one shared vertex source
    // K1456: the app pass issues its full program first (the old constructor's plan order is gone);
    // the source SET is master's, pinned over the distinct sources, sorted (master's distinct
    // sources are the same four strings).
    expect(sha(...[...new Set(app.srcs)].sort())).toBe("c6f48c753a8aa5c1ac413238b19d9217eaba06ba8c52f06a82c91afe1ab82861");
    expect(probe.srcs.length).toBe(4);
    expect(sha(...probe.srcs)).toBe("9a4dfffdf30a0a4e703c690c7c5986f14e64bde8973093bdb679b0411b80c539");
    // { home: false } is the default
    expect(sha(...sources(false, false).srcs)).toBe(sha(...app.srcs));
    expect(app.pass.home).toBe(false);
    for (const s of app.srcs) expect(s).not.toContain("uHomeZ");
  });
  it("buildKeys and packTables give master's bytes", () => {
    const pins: Record<string, [string, string]> = {
      "j_cross.json": ["d183bca5542582429c071ecc4049b3d49d1d7baf88ef7ae0915517dca5b50a92", "1382781e4db799e00208e0bc9499fb01bf85262bbfb145bd9c81ac381ea91c7b"],
      "k42.json": ["f3e8f41e0def175a16341ac665b8d32858f0dc9cfe824911e22847a0de2e513a", "62e35208c8542e42721cfc48e74c8988d6fd6fb85217fa96879b5b6a30e6440c"],
      "y120.json": ["dc0e69a62c26a3ae399746e6c334056327b39137d31c080c9cc6dfc9ad758db1", "244107d2f531e486b59a95c7bdda909ad534f8cf954f3c07fbaa702ebe03ecb4"],
      "x4_throughs.json": ["c19722d95f5fbd7f7dfa2adebc0edbee04a22763065fdf88415ab3aee23489b4", "5b17a70aa18af7d48897168587f0c5330d11a640c433369e3b43db0ef3b6a776"],
    };
    for (const [n, [k, p]] of Object.entries(pins)) {
      const T = buildTables(load(n), { aa: AA });
      expect(T.homeOn, n).toBe(false);
      expect(keysDigest(T), n).toBe(k);
      expect(packDigest(T), n).toBe(p);
    }
  });
});

describe("K1439 flag on: homeForm on every program", () => {
  it("each fragment program is homeForm of master's, the vertex shader unchanged", () => {
    for (const probe of [false, true]) {
      const off = sources(probe).srcs; const on = sources(probe, true);
      expect(on.pass.home).toBe(true);
      expect(on.srcs.length).toBe(off.length);
      for (let i = 0; i < off.length; i++) {
        if (off[i] === GF_VS) { expect(on.srcs[i]).toBe(GF_VS); continue; }
        expect(on.srcs[i]).toBe(homeForm(off[i]));
        expect(on.srcs[i]).toContain("uniform float uHomeZ;");
        expect(on.srcs[i]).toContain("void member(int c, float s, vec4 KB, float z) {");
        expect(on.srcs[i]).not.toMatch(/member\(PC\(j\), [\w[\]]+, KB\)/);
      }
    }
  });
  it("the reveal and look forms compose over it", () => {
    const { srcs, pass } = sources(false, true);
    const n0 = srcs.length;
    const p = pass as unknown as { rplan: () => unknown; lplan: (reveal: boolean) => unknown; rprogs: unknown; lprogs: unknown[] };
    // K1456: the plans only build specs now; install them as draw() would, then flush.
    p.rprogs = p.rplan(); p.lprogs[0] = p.lplan(false); p.lprogs[1] = p.lplan(true);
    (pass as unknown as { flushPrograms(): void }).flushPrograms();
    expect(new Set(srcs).size).toBe(13); // four sets of three fragment programs on one vertex source
    for (const s of srcs.slice(n0)) if (s !== GF_VS) {
      expect(s).toContain("uniform float uHomeZ;");
      expect(s).toContain("void member(int c, float s, vec4 KB, float z) {");
    }
  });
  it("applies to every tier form the shader builds (three member() calls, each with the piece's membership depth mz, K1451 s2)", () => {
    for (const probe of [false, true]) for (const tier of [undefined, { p: 3, k: 2, ramps: true }, { p: 3, k: 2, ramps: false }]) {
      const src = homeForm(gfFs(probe, true, tier));
      expect(src.split("KB, mz);").length - 1).toBe(3);
    }
    expect(() => homeForm(GF_VS)).toThrow(/gfFs home/);
  });
});

describe("K1439 flag on: the tables", () => {
  it("home keys keep every off candidate, in order, and reach each arm's home interval", () => {
    for (const n of ["j_cross.json", "k42.json", "y120.json", "x4_throughs.json"]) {
      const T = buildTables(load(n), { aa: AA });
      const Th: GfTables = { ...T, homeOn: true };
      const K0 = buildKeys(T); const K1 = buildKeys(Th);
      expect(K1.nB, n).toBe(K0.nB);
      expect(Array.from(K1.kc), n).toEqual(Array.from(K0.kc));
      let grew = 0;
      for (let b = 0; b < K0.nB; b++) {
        expect(K1.kb[4 * b], n).toBe(K0.kb[4 * b]); expect(K1.kb[4 * b + 1], n).toBe(K0.kb[4 * b + 1]);
        const a0 = Array.from(K0.ka.subarray(K0.kb[4 * b + 2], K0.kb[4 * b + 2] + K0.kb[4 * b + 3]));
        const a1 = Array.from(K1.ka.subarray(K1.kb[4 * b + 2], K1.kb[4 * b + 2] + K1.kb[4 * b + 3]));
        expect(a1.filter((a) => a0.includes(a)), `${n} bin ${b}`).toEqual(a0);
        for (let i = 1; i < a1.length; i++) expect(a1[i] > a1[i - 1], `${n} bin ${b} order`).toBe(true);
        grew += a1.length - a0.length;
      }
      expect(grew, n).toBeGreaterThanOrEqual(0);
    }
  });
  it("pack writes aHome in the arm record's .y (ARM and KA copies) only with homeOn", () => {
    const T = buildTables(load("j_cross.json"), { aa: AA });
    const Th: GfTables = { ...T, homeOn: true };
    const P0 = packTables(T, undefined, buildKeys(T)); const P1 = packTables(Th, undefined, buildKeys(Th));
    const f = Math.fround;
    for (let a = 0; a < T.nA; a++) {
      expect(P0.data[4 * (P0.o.arm + 2 * a + 1) + 1]).toBe(0);
      expect(P1.data[4 * (P1.o.arm + 2 * a + 1) + 1]).toBe(f(Math.min(T.aHome[a], 1e30)));
    }
    const K1 = buildKeys(Th);
    for (let q = 0; q < K1.nKA; q++) expect(P1.data[4 * (P1.o.ka + 2 * q + 1) + 1]).toBe(f(Math.min(T.aHome[K1.ka[q]], 1e30)));
  });
});
