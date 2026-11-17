// K1439: the flag-off digests (GfPass's program sources, app and probe; buildKeys and packTables on fixtures), as
// gf_home_glsl.test.ts pins them. Run on master's gf_glsl / gf_keys / gf_pass and on the stage's, compare:
//   node scripts/run_node.mjs .claude/probes/K1439/k1439_pin.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GfPass } from "../../../src/render/gpu_field/gf_pass";
import { buildKeys } from "../../../src/render/gpu_field/gf_keys";
import { GF_TW, packTables } from "../../../src/render/gpu_field/gf_pack";
import { buildTables } from "../../../src/render/gpu_field/tables";

export function fakeGl(srcs: string[]): WebGL2RenderingContext {
  return new Proxy({}, {
    get: (_t, p) => (p === "shaderSource" ? (_s: unknown, src: string) => { srcs.push(src); } : typeof p === "string" && /^[A-Z_0-9]+$/.test(p) ? 1 : () => ({})),
  }) as unknown as WebGL2RenderingContext;
}
const h = (...b: (string | ArrayBufferView)[]): string => {
  const H = createHash("sha256");
  for (const x of b) H.update(typeof x === "string" ? x : new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
  return H.digest("hex");
};
for (const probe of [false, true]) {
  const s: string[] = []; new GfPass(fakeGl(s), probe);
  console.log(`pass probe=${probe}: ${s.length} sources ${h(...s)}`);
}
const dir = "test/render/field/scenes";
for (const n of ["j_cross.json", "k42.json", "y120.json", "x4_throughs.json"]) {
  const sc = JSON.parse(readFileSync(join(dir, n), "utf8")); sc.look.ctrlArc ??= 0.47;
  const T = buildTables(sc, { aa: 0.5 / 320 });
  const K = buildKeys(T); const P = packTables(T, undefined, K);
  console.log(`${n}: keys ${h(...Object.values(K).filter((v) => ArrayBuffer.isView(v)) as ArrayBufferView[])} pack ${h(P.data.subarray(0, P.rows * 4 * GF_TW))} rows ${P.rows}`);
}
