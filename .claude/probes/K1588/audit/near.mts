// audit: per crossing border side of the stage 4 count, the distance along the UNDER thread from the crossing to the
// nearest junction arm root on that thread (each direction), against the side's gap class.
//   GF_SRC=<tree> npx tsx near.mts <capDir> <cnt.json>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC!;
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, cntPath] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T: any = withHome(buildTables(scene, { aa, kRetry: true }), true);
const cnt = JSON.parse(readFileSync(cntPath, "utf8"));
const h = T.h;
const posAt = (c: number, s: number): [number, number] => {
  const v0 = T.cV0[c]; const n = T.cNV[c];
  for (let i = 0; i < n - 1; i++) { const a = T.vs[v0 + i]; const b = T.vs[v0 + i + 1]; if (s >= a - 1e-9 && s <= b + 1e-9) { const u = b > a ? (s - a) / (b - a) : 0; return [T.vx[v0 + i] + u * (T.vx[v0 + i + 1] - T.vx[v0 + i]), T.vy[v0 + i] + u * (T.vy[v0 + i + 1] - T.vy[v0 + i])]; } }
  return [T.vx[v0], T.vy[v0]];
};
type Row = { x: number; dir: number; lat: number; path: string; same: number; other: number };
const rows: Row[] = [];
for (const X of cnt.crossings) {
  const c = X.under; let best = -1; let bd = Infinity;
  for (let q = T.cPin0[c]; q < T.cPin0[c] + T.cPinN[c]; q++) {
    const [px, py] = posAt(c, T.pinS[q]); const d = Math.hypot(px - X.wx, py - X.wy);
    if (d < bd) { bd = d; best = q; }
  }
  if (best < 0 || bd > 0.3) { console.log("no pin for x" + X.i, bd.toFixed(3)); continue; }
  const sx = T.pinS[best]; const closed = T.cClosed[c] === 1; const len = T.cLen[c];
  let dP = Infinity; let dM = Infinity;
  for (let i = T.cArm0[c]; i < T.cArm0[c] + T.cArmN[c]; i++) {
    let d = T.aSR[i] - sx; if (closed) { d = ((d % len) + len) % len; const e = len - d; if (d < dP) dP = d; if (e < dM) dM = e; }
    else if (d >= 0) { if (d < dP) dP = d; } else if (-d < dM) dM = -d;
  }
  for (const b of X.borders) rows.push({ x: X.i, dir: b.dir, lat: b.lat, path: b.path, same: b.dir > 0 ? dP : dM, other: b.dir > 0 ? dM : dP });
}
const cls = [...new Set(rows.map((r) => r.path))];
const bins = [0.8, 1.2, 1.6, 2.4, Infinity]; const names = ["under 2h (0.8)", "2h-3h", "3h-4h", "4h-6h", "over 6h / none"];
for (const key of ["same", "other", "min"] as const) {
  console.log(`\nby distance (world, h = ${h}) to the nearest junction root on the under thread, ${key} side of the crossing:`);
  console.log("bin".padEnd(18) + cls.map((c) => c.padStart(10)).join("") + "     total");
  for (let b = 0; b < bins.length; b++) {
    const lo = b ? bins[b - 1] : 0; const R = rows.filter((r) => { const d = key === "min" ? Math.min(r.same, r.other) : r[key]; return d >= lo && d < bins[b]; });
    console.log(names[b].padEnd(18) + cls.map((c) => String(R.filter((r) => r.path === c).length).padStart(10)).join("") + String(R.length).padStart(10));
  }
}
console.log("\nclosed sides:");
for (const r of rows.filter((q) => q.path === "closed")) console.log(`x${r.x} dir ${r.dir} lat ${r.lat}  same-side root ${r.same.toFixed(2)}  other-side root ${r.other.toFixed(2)}`);
const LIST = (process.env.LIST ?? "").split("_").filter(Boolean).map(Number);
if (LIST.length) { console.log("\nlisted crossings (class, same-side root distance per side):"); for (const x of LIST) console.log("x" + x + "  " + rows.filter((r) => r.x === x).map((r) => `${r.path} ${r.same === Infinity ? "none" : r.same.toFixed(2)}`).join(" | ")); }
