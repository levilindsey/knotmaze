import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, debugCache, type SceneIn } from "./outline";
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (process.argv[4] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +(process.argv[2] ?? 23); const JID = process.argv[3] ?? "j67";
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]); const S = sc[0].camera.pxPerUnit * 2;
const ji = sc[0].junctions.findIndex((j) => j.id === JID);
const keys = ["cOk", "cWhy", "cMeet", "cR", "cTheta", "cQx", "cQy", "cVx", "cVy", "cTax", "cTay", "cTbx", "cTby", "cSA", "cSB", "cDA", "cDB"];
const rows: Record<string, number[]>[] = []; const arm: Record<string, number[]>[] = [];
let C: any;
for (let f = 0; f <= F; f++) { frame(st, sc[f]); if (f >= F - 1) { C = debugCache(st); const list = C.armsOfJSorted[ji]; const r: Record<string, number[]> = {}; for (const ai of list) { const ci = C.cornerByAArm[ai]; if (ci < 0) continue; r[ci] = keys.map((k) => (C[k] ? +C[k][ci] : NaN)); } rows.push(r); const a: Record<string, number[]> = {}; for (const ai of list) a[ai] = [C.armL[ai], C.armLcut[ai], C.armSR[ai], C.armDir[ai], C.armAng[ai]]; arm.push(a); } }
console.log("FCache keys starting with c:", Object.keys(C).filter((k) => /^c[A-Z]/.test(k)).join(" "));
for (const ci of Object.keys(rows[0])) { console.log(`corner ${ci}:`); keys.forEach((k, i) => { const a = rows[0][ci][i], b = rows[1][ci][i]; console.log(`  ${k}: ${a} -> ${b}  (${((b - a) * S).toFixed(3)} px)`); }); }

for (const ai of Object.keys(arm[0])) console.log(`arm ${ai}: L ${arm[0][ai][0].toFixed(5)} -> ${arm[1][ai][0].toFixed(5)} (${((arm[1][ai][0]-arm[0][ai][0])*S).toFixed(3)} px) Lcut ${arm[0][ai][1].toFixed(5)} -> ${arm[1][ai][1].toFixed(5)} sR ${arm[0][ai][2].toFixed(4)} dir ${arm[0][ai][3]} ang ${arm[0][ai][4].toFixed(4)}`);
