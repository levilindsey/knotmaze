import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildKeys } from "../../../src/render/gpu_field/gf_keys";
import { GF_TW, packTables } from "../../../src/render/gpu_field/gf_pack";
import { GfPass } from "../../../src/render/gpu_field/gf_pass";
import { buildTables } from "../../../src/render/gpu_field/tables";
const dir = "test/render/field/scenes";
const sha = (...b: any[]): string => { const H = createHash("sha256"); for (const x of b) H.update(typeof x === "string" ? x : new Uint8Array(x.buffer, x.byteOffset, x.byteLength)); return H.digest("hex"); };
const fakeGl = (srcs: string[]): any => new Proxy({}, { get: (_t, p) => (p === "shaderSource" ? (_s: unknown, src: string) => { srcs.push(src); } : typeof p === "string" && /^[A-Z_0-9]+$/.test(p) ? 1 : () => ({})) });
for (const probe of [false, true]) { const srcs: string[] = []; new GfPass(fakeGl(srcs), probe); console.log(probe ? "probe" : "app", srcs.length, sha(...srcs)); }
for (const n of ["j_cross.json", "k42.json", "y120.json", "x4_throughs.json"]) {
  const sc: any = JSON.parse(readFileSync(join(dir, n), "utf8")); sc.look.ctrlArc ??= 0.47;
  const T = buildTables(sc, { aa: 0.5 / 320 }); const K = buildKeys(T); const P = packTables(T, undefined, buildKeys(T));
  console.log(n, sha(K.kc, K.kb, K.ka), sha(P.data.subarray(0, P.rows * 4 * GF_TW)));
}
