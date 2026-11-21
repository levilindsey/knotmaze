// K1482 s23: stage 22's gated second corner try (the "retry", C1 = a294f3271). The page turns it on with `gfh=1`
// unless `gfk=0` (K1524). Off, a Node build's default: the tables carry no retry field, as a build forced off, field for
// field (gf_home_glsl.test.ts keeps master's key and pack digests, untouched), and no program changes. On: retry
// corners exist and every one passes both gates (GF_KRMIN, GF_KSAG); the programs are retryForm of the home ones.
// The default is read with env GF_KRETRY removed: a guard script that set it for the bar and left it set once
// failed three tests here (K1543).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { tablesDiff } from "../../src/render/gpu_field/gf_build";
import { GF_VS, homeForm, retryForm } from "../../src/render/gpu_field/gf_glsl";
import { GfPass } from "../../src/render/gpu_field/gf_pass";
import { buildTables, GF_KRETRY, GF_KRMIN, GF_KSAG, withHome, type GfTables } from "../../src/render/gpu_field/tables";

// K1575: every GF_* switch is read once at module load (tables.ts, eval.ts), so this file pins its own
// environment before those imports evaluate and restores the shell's values afterwards; no other file
// inherits the pin (vitest isolates files). The retry's two states are covered through GfOpts below.
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
const SCENES = [
  "acute20.json", "acute30.json", "curved.json", "dead_end.json", "j_cross.json", "j_hook_cross.json", "j_pair_cross.json",
  "k42.json", "kink.json", "oblique30.json", "t90.json", "tight_curve.json", "x4_ends.json", "x4_throughs.json", "y120.json",
];
const RETRY_KEYS = ["kExt", "nKAlt", "cellK0Alt", "cellKNAlt", "cellKListAlt", "cellKPListAlt"] as const;

function fakeGl(srcs: string[]): WebGL2RenderingContext {
  return new Proxy({}, {
    get: (_t, p) => (p === "shaderSource" ? (_s: unknown, src: string) => { srcs.push(src); } : typeof p === "string" && /^[A-Z_0-9]+$/.test(p) ? 1 : () => ({})),
  }) as unknown as WebGL2RenderingContext;
}
function sources(probe: boolean, opts: { home?: boolean; kRetry?: boolean }): { srcs: string[]; pass: GfPass } {
  const srcs: string[] = [];
  const pass = new GfPass(fakeGl(srcs), probe, undefined, undefined, false, opts);
  (pass as unknown as { flushPrograms(): void }).flushPrograms();
  return { srcs, pass };
}

describe("K1482 s23 switch off (the default): master's tables and programs", () => {
  it("the default is off", () => {
    expect(GF_KRETRY).toBe(false);
  });
  it("a default build carries no retry field and equals a build forced off, home off and on", () => {
    for (const n of SCENES) for (const home of [false, true]) {
      const T = buildTables(load(n), { aa: AA, home });
      for (const k of RETRY_KEYS) expect(k in T, `${n} home ${home} ${k}`).toBe(false);
      const F = buildTables(load(n), { aa: AA, home, kRetry: false });
      expect(Object.keys(T).sort(), n).toEqual(Object.keys(F).sort());
      expect(tablesDiff(T, F), `${n} home ${home}`).toEqual([]);
    }
  });
  it("withHome flips homeOn alone (K1439's upload), every other field the same object", () => {
    for (const n of ["j_cross.json", "k42.json", "y120.json"]) {
      const T = buildTables(load(n), { aa: AA });
      const Th = withHome(T, true);
      expect(Th.homeOn).toBe(true);
      expect(Object.keys(Th).sort()).toEqual(Object.keys(T).sort());
      for (const k of Object.keys(T) as (keyof GfTables)[]) if (k !== "homeOn") expect(Th[k], `${n} ${k}`).toBe(T[k]);
    }
  });
  it("GfPass compiles the same programs with kRetry absent or false, and kRetry without home is off", () => {
    for (const probe of [false, true]) for (const home of [false, true]) {
      const a = sources(probe, { home }); const b = sources(probe, { home, kRetry: false });
      expect(b.pass.kRetry).toBe(false);
      expect(b.srcs).toEqual(a.srcs);
      for (const s of a.srcs) expect(s).not.toContain("KXT(");
    }
    for (const probe of [false, true]) {
      const c = sources(probe, { home: false, kRetry: true });
      expect(c.pass.kRetry).toBe(false);
      expect(c.srcs).toEqual(sources(probe, {}).srcs);
    }
  });
});

describe("K1482 s23 switch on: C1's retry corners, gated", () => {
  it("retry corners exist and each passes GF_KRMIN and GF_KSAG", () => {
    let nRetry = 0;
    for (const n of SCENES) {
      const T = buildTables(load(n), { aa: AA, home: true, kRetry: true });
      for (const k of RETRY_KEYS) expect(k in T, `${n} ${k}`).toBe(true);
      const ext = T.kExt!;
      for (let k = 0; k < ext.length; k++) {
        if (ext[k] !== 1) continue;
        nRetry++;
        const r = T.kR[k]; const th = T.kTheta[k];
        expect(r, `${n} corner ${k} radius`).toBeGreaterThanOrEqual(GF_KRMIN * T.h);
        expect(r * (1 / Math.max(1e-6, Math.sin(th / 2)) - 1), `${n} corner ${k} sag`).toBeLessThanOrEqual(GF_KSAG * T.h);
      }
    }
    expect(nRetry).toBeGreaterThan(0);
  });
  it("the home-off view of an on build is the off build: the same corners first and the same cell lists", () => {
    for (const n of SCENES) {
      const off = buildTables(load(n), { aa: AA });
      const on = withHome(buildTables(load(n), { aa: AA, home: true, kRetry: true }), false);
      expect(on.homeOn, n).toBe(false);
      expect(on.nK, n).toBe(off.nK);
      for (const k of ["kCx", "kCy", "kR", "kTheta", "kJ", "kA", "kB"] as const) {
        expect(Array.from(on[k].subarray(0, off.nK)), `${n} ${k}`).toEqual(Array.from(off[k].subarray(0, off.nK)));
      }
      for (const k of ["cellK0", "cellKN", "cellKList", "cellKPList"] as const) expect(Array.from(on[k]), `${n} ${k}`).toEqual(Array.from(off[k]));
    }
  });
  it("GfPass with home and kRetry compiles retryForm(homeForm(master)) on every fragment program", () => {
    for (const probe of [false, true]) {
      const off = sources(probe, {}).srcs; const on = sources(probe, { home: true, kRetry: true });
      expect(on.pass.kRetry).toBe(true);
      expect(on.srcs.length).toBe(off.length);
      for (let i = 0; i < off.length; i++) {
        if (off[i] === GF_VS) { expect(on.srcs[i]).toBe(GF_VS); continue; }
        expect(on.srcs[i]).toBe(retryForm(homeForm(off[i])));
        expect(on.srcs[i]).toContain("#define KXT(k)");
      }
    }
    expect(() => retryForm(GF_VS)).toThrow(/homeForm first/);
  });
});
