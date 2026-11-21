// K1375: the keys the build worker returns (gf_build.ts gfKeysFor, which gfBuild and every
// gf_worker reply path use) equal buildKeys of the same tables on main, every array bit for bit,
// and the transfer list holds each key buffer once. Scenes: gf_keys.test.ts's field scenes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldScene } from "../../src/render/field/scene";
import { builtTransfer, gfKeysFor, tablesTransfer } from "../../src/render/gpu_field/gf_build";
import { buildKeys, keysTransfer, type GfKeys } from "../../src/render/gpu_field/gf_keys";
import { packTables } from "../../src/render/gpu_field/gf_pack";
import { buildTables, withHome, type GfTables } from "../../src/render/gpu_field/tables";

const dir = join(__dirname, "field", "scenes");
const load = (n: string): FieldScene => {
  const s = JSON.parse(readFileSync(join(dir, n), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  return s;
};
const AA = 0.5 / 320;

const bytes = (v: ArrayBufferView): Uint8Array => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
function expectKeysEqual(got: GfKeys, want: GfKeys): void {
  expect(got.nB).toBe(want.nB);
  expect(got.nKA).toBe(want.nKA);
  for (const k of ["kc", "kb"] as const) expect(bytes(got[k])).toEqual(bytes(want[k]));
  // ka may carry spare capacity past nKA; the used run and the whole array must both match.
  expect(bytes(got.ka.subarray(0, got.nKA))).toEqual(bytes(want.ka.subarray(0, want.nKA)));
  expect(bytes(got.ka)).toEqual(bytes(want.ka));
}

describe("gf worker keys (K1375)", () => {
  const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  it("has test scenes", () => expect(names.length).toBeGreaterThan(3));
  for (const name of names) {
    it(`${name}: worker keys equal main's, bit for bit`, () => {
      const T = buildTables(load(name), { aa: AA });
      // The worker's finish on the tables it built (home off and the home variant).
      const off = gfKeysFor(T);
      expect(off.T).toBe(T);
      expectKeysEqual(off.K, buildKeys(T));
      const on = gfKeysFor(T, true);
      expect(on.T.homeOn).toBe(true);
      expectKeysEqual(on.K, buildKeys(withHome(T, true)));
      // Packing with the worker's keys gives the same bytes as packing with main's.
      const a = packTables(off.T, undefined, off.K);
      const b = packTables(T, undefined, buildKeys(T));
      expect(a.rows).toBe(b.rows);
      expect(bytes(a.data.subarray(0, a.rows * 4 * 2048))).toEqual(bytes(b.data.subarray(0, b.rows * 4 * 2048)));
    });
    it(`${name}: each key buffer once in the transfer list`, () => {
      const T: GfTables = buildTables(load(name), { aa: AA });
      const { K } = gfKeysFor(T);
      const list = keysTransfer(K);
      expect(list).toHaveLength(3);
      expect(new Set(list).size).toBe(3);
      expect(list).toContain(K.kc.buffer);
      expect(list).toContain(K.kb.buffer);
      expect(list).toContain(K.ka.buffer);
      const all = builtTransfer(T, K);
      expect(new Set(all).size).toBe(all.length);
      for (const buf of list) expect(all).toContain(buf);
      for (const buf of tablesTransfer(T)) expect(all).toContain(buf);
    });
  }
});
