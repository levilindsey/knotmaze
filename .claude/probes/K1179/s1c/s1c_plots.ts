// K1179 S1c plots (task 6): SVG plots under s1c/out/, drawn as Run K's
// task 7: each centred on its corner, 4h across, bare tube edges in
// grey, the drawn outline in black, the ball's circle dashed, V, q and
// the feet marked; master's form B beside the closed-form solve. Sites:
// the class-b and class-d worst sites on the exact outline, and the
// worst remaining failure of each criterion (1v: the largest tangent
// jump; 3: the largest round-point excess, found in its recording;
// criterion 2 has no failure to plot). No pngjs.
// Run: npx.cmd vite-node .claude/probes/K1179/s1c/s1c_plots.ts
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { edgeOutlinePoints, facingSide, loadScene } from "../outline";
import { sameScene } from "../seq13_lib";
import { closedCorners } from "./closed";
import { keyOf } from "./lib_s1c";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function panel(fb: any, c: any, cx: number, cy: number, ox: number, title: string): string {
  const h: number = fb.h;
  const S = 360 / (4 * h);
  const X = (x: number): number => ox + 180 + (x - cx) * S;
  const Y = (y: number): number => 200 + (y - cy) * S;
  const pts = (ps: { x: number; y: number }[]): string => ps.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  let s = `<text x="${ox + 180}" y="24" text-anchor="middle" font-family="monospace" font-size="13">${esc(title)}</text>`;
  // Bare tube edges (grey): every arm at the junction, both sides.
  for (let ai = 0; ai < fb.arms.length; ai++) {
    if (fb.arms[ai].j !== c.j) continue;
    for (const side of [1, -1]) {
      const ep = edgeOutlinePoints(fb, ai, side, 0, fb.arms[ai].L);
      if (ep.length > 1) s += `<polyline points="${pts(ep)}" fill="none" stroke="#999" stroke-width="1"/>`;
    }
  }
  // The drawn outline (black): facing edges to the feet, then the arc.
  const sideA = facingSide(fb, c.a, c.dA, c.tax, c.tay);
  const sideB = facingSide(fb, c.b, c.dB, c.tbx, c.tby);
  const eA = edgeOutlinePoints(fb, c.a, sideA, c.dA, Math.min(fb.arms[c.a].L, c.dA + 1.5 * h)).reverse();
  const eB = edgeOutlinePoints(fb, c.b, sideB, c.dB, Math.min(fb.arms[c.b].L, c.dB + 1.5 * h));
  const arc: { x: number; y: number }[] = [];
  if (c.r > 1e-12 && c.omega > 0) {
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(c.Vy - c.qy, c.Vx - c.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    for (let i = 0; i <= 60; i++) {
      const an = a0 + ((a1 - a0) * i) / 60;
      arc.push({ x: c.qx + c.r * Math.cos(an), y: c.qy + c.r * Math.sin(an) });
    }
  } else {
    arc.push({ x: c.Vx, y: c.Vy });
  }
  const outlinePts = [...eA, ...arc, ...eB];
  s += `<polyline points="${pts(outlinePts)}" fill="none" stroke="#000" stroke-width="1.6"/>`;
  if (c.r > 1e-12) s += `<circle cx="${X(c.qx).toFixed(1)}" cy="${Y(c.qy).toFixed(1)}" r="${(c.r * S).toFixed(1)}" fill="none" stroke="#c00" stroke-width="0.8" stroke-dasharray="4 3"/>`;
  const mark = (x: number, y: number, fill: string, label: string) =>
    `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="3" fill="${fill}"/><text x="${(X(x) + 5).toFixed(1)}" y="${(Y(y) - 4).toFixed(1)}" font-family="monospace" font-size="11" fill="${fill}">${label}</text>`;
  s += mark(c.Vx, c.Vy, "#06c", "V");
  s += mark(c.qx, c.qy, "#c00", "q");
  s += mark(c.tax, c.tay, "#080", "ta");
  s += mark(c.tbx, c.tby, "#080", "tb");
  return s;
}

function plotPair(fb: any, master: any, closed: any, file: string, caption: string): void {
  const cx = (master.Vx + master.qx) / 2;
  const cy = (master.Vy + master.qy) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="400" viewBox="0 0 720 400">`
    + `<rect width="720" height="400" fill="white"/>`
    + `<text x="360" y="392" text-anchor="middle" font-family="monospace" font-size="11">${esc(caption)}</text>`
    + panel(fb, master, cx, cy, 0, "form B (master)")
    + panel(fb, closed, cx, cy, 360, "closed-form")
    + `</svg>`;
  writeFileSync(`${OUT}/${file}`, svg);
  console.log(`${file}: ${caption}`);
}

function findCorner(fb: any, sc: any, jid: string, eiA: number, eiB: number): any {
  return fb.corners.find((c: any) => sc.junctions[c.j]?.id === jid && fb.arms[c.a].ei === eiA && fb.arms[c.b].ei === eiB);
}
function closedAt(fb: any, master: any): any {
  const { corners } = closedCorners(fb);
  return corners.find((c: any) => keyOf(c) === keyOf(master));
}

// Class-b and class-d worst sites (Run K's record, on the exact outline).
for (const [sceneName, jid, eiA, eiB, tag] of [
  ["user_tw42.lightpaper", "j12", 0, 1, "class-b-worst"],
  ["muse_hash", "j43", 0, 1, "class-d-worst"],
] as const) {
  const sc = loadScene(sceneName);
  const fb: any = new FormB(sc);
  const master = findCorner(fb, sc, jid, eiA, eiB);
  if (!master) { console.log(`${tag}: corner not found in ${sceneName}`); continue; }
  plotPair(fb, master, closedAt(fb, master), `plot_${tag}_${sceneName}_${jid}_${eiA}-${eiB}.svg`,
    `${tag}: ${sceneName} ${jid} arms ${eiA}-${eiB} (Run K worst of its class), exact outline`);
}

// Criterion 1v's worst remaining failure (largest tangent jump, master).
const scenes = JSON.parse(readFileSync(`${OUT}/scenes_s1c.json`, "utf8"));
const fails1v = (scenes.failList as any[]).filter((f) => f.col === "master-exact" && f.criterion === "1v(a)").sort((a, b) => b.worstJumpDeg - a.worstJumpDeg);
if (fails1v.length) {
  const w = fails1v[0];
  const m = /^(\S+) arms (\d+)-(\d+)$/.exec(w.site);
  const sc = loadScene(w.scene);
  const fb: any = new FormB(sc);
  const master = findCorner(fb, sc, m![1], Number(m![2]), Number(m![3]));
  plotPair(fb, master, closedAt(fb, master), `plot_crit1v-worst_${w.scene}_${m![1]}_${m![2]}-${m![3]}.svg`,
    `criterion 1v worst (master): ${w.scene} ${w.site}, jump ${w.worstJumpDeg}deg, class ${w.cls}`);
}

// Criterion 3's worst remaining failure: the largest round-point excess
// in the recordings (master-exact), found in its recording's frames.
const recs = JSON.parse(readFileSync(`${OUT}/recordings_s1c.json`, "utf8"));
let worstRec: any = null;
for (const r of recs as any[]) {
  if (!worstRec || r.masterExact.maxExcessDev > worstRec.masterExact.maxExcessDev) worstRec = r;
}
{
  const name: string = worstRec.recording;
  const wkey: string = worstRec.masterExact.worst; // R|<jIdx>|<eiA>-<eiB>|<fi>
  const parts = wkey.split("|");
  const jIdx = Number(parts[1]);
  const [eiA, eiB] = parts[2].split("-").map(Number);
  const fiW = Number(parts[3]);
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${name}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let bestExcess = -Infinity;
  let bestFb: any = null;
  let bestCorner: any = null;
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    const fr = JSON.parse(line) as { i: number; scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    prevScene = fr.scene;
    const fb: any = new FormB(fr.scene);
    const c: any = fb.corners.find((cc: any) => cc.j === jIdx && fb.arms[cc.a].ei === eiA && fb.arms[cc.b].ei === eiB);
    if (!c) { (plotPair as any).__prev = null; continue; }
    const live = c.r > 1e-12 && c.omega > 0;
    const a0 = Math.atan2(c.tay - c.qy, c.tax - c.qx);
    let a1 = Math.atan2(c.tby - c.qy, c.tbx - c.qx);
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
    let aV = Math.atan2(c.Vy - c.qy, c.Vx - c.qx);
    while (aV - a0 > Math.PI) aV -= 2 * Math.PI;
    while (aV - a0 < -Math.PI) aV += 2 * Math.PI;
    if ((aV - a0) * (a1 - a0) < 0) a1 += a1 > a0 ? -2 * Math.PI : 2 * Math.PI;
    const f = fiW / 20;
    const pt = live ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * f), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * f) } : { x: c.Vx, y: c.Vy };
    const fa = pointAt(fb.polys[fb.arms[c.a].pi], c.sA);
    const fbq = pointAt(fb.polys[fb.arms[c.b].pi], c.sB);
    const pp: any = (plotPair as any).__prev;
    if (pp && pp.cornerKey === `${jIdx}|${eiA}-${eiB}`) {
      const disp = Math.hypot(pt.x - pp.x, pt.y - pp.y);
      const skel = Math.max(Math.hypot(fa.x - pp.fa.x, fa.y - pp.fa.y), Math.hypot(fbq.x - pp.fbq.x, fbq.y - pp.fbq.y));
      const excess = (disp - skel) * fb.ppuDev;
      if (excess > bestExcess) { bestExcess = excess; bestFb = fb; bestCorner = c; }
    }
    (plotPair as any).__prev = { x: pt.x, y: pt.y, fa: { x: fa.x, y: fa.y }, fbq: { x: fbq.x, y: fbq.y }, cornerKey: `${jIdx}|${eiA}-${eiB}` };
  }
  if (bestFb && bestCorner) {
    plotPair(bestFb, bestCorner, closedAt(bestFb, bestCorner), `plot_crit3-worst_${name}_j${jIdx}_${eiA}-${eiB}.svg`,
      `criterion 3 worst (master): ${name} ${wkey}, excess ${bestExcess.toFixed(2)} dev px (frame of the larger step)`);
  } else {
    console.log(`crit3 worst: site not located in ${name}`);
  }
}
console.log("plots done");
