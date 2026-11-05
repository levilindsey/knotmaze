// K1179 S1d plots: SVG under s1d/out/, centred on the corner, 4h
// across, bare tube edges grey, drawn outline black, V and feet
// marked; form B beside variant (i) and variant (ii). Sites: Run L's
// four, and per variant the worst agreement corner, the worst visible
// 1v failure and the worst criterion 3 failure. No pngjs.
// Run: npx.cmd vite-node .claude/probes/K1179/s1d/s1d_plots.ts
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
import { evalRound, fillLoop, keyOf, s1dCorner, sampleRound } from "./lib_s1d";
import type { S1dCorner } from "./lib_s1d";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });
const SEQ_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/S3a/seq13";
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function panelOutlineMaster(fb: any, c: any): { x: number; y: number }[] {
  const sideA = facingSide(fb, c.a, c.dA, c.tax, c.tay);
  const sideB = facingSide(fb, c.b, c.dB, c.tbx, c.tby);
  const eA = edgeOutlinePoints(fb, c.a, sideA, c.dA, Math.min(fb.arms[c.a].L, c.dA + 1.5 * fb.h)).reverse();
  const eB = edgeOutlinePoints(fb, c.b, sideB, c.dB, Math.min(fb.arms[c.b].L, c.dB + 1.5 * fb.h));
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
    for (let i = 0; i <= 60; i++) { const an = a0 + ((a1 - a0) * i) / 60; arc.push({ x: c.qx + c.r * Math.cos(an), y: c.qy + c.r * Math.sin(an) }); }
  } else arc.push({ x: c.Vx, y: c.Vy });
  return [...eA, ...arc, ...eB];
}
function panelOutlineVariant(c: S1dCorner): { x: number; y: number }[] {
  if (!c.live) return [{ x: c.Vx, y: c.Vy }];
  const loop = fillLoop(c, 60);
  // fillLoop runs V->Fa->round->Fb->V; the drawn outline near the
  // corner is Fa->round->Fb plus stubs: return round + feet stubs.
  return loop;
}
function panel(fb: any, jIdx: number, outline: { x: number; y: number }[], Vx: number, Vy: number, Fa: { x: number; y: number }, Fb: { x: number; y: number }, cx: number, cy: number, ox: number, title: string): string {
  const h: number = fb.h;
  const S = 360 / (4 * h);
  const X = (x: number): number => ox + 180 + (x - cx) * S;
  const Y = (y: number): number => 200 + (y - cy) * S;
  const pts = (ps: { x: number; y: number }[]): string => ps.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  let s = `<text x="${ox + 180}" y="24" text-anchor="middle" font-family="monospace" font-size="13">${esc(title)}</text>`;
  for (let ai = 0; ai < fb.arms.length; ai++) {
    if (fb.arms[ai].j !== jIdx) continue;
    for (const side of [1, -1]) {
      const ep = edgeOutlinePoints(fb, ai, side, 0, fb.arms[ai].L);
      if (ep.length > 1) s += `<polyline points="${pts(ep)}" fill="none" stroke="#999" stroke-width="1"/>`;
    }
  }
  s += `<polyline points="${pts(outline)}" fill="none" stroke="#000" stroke-width="1.6"/>`;
  const mark = (x: number, y: number, fill: string, label: string) =>
    `<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="3" fill="${fill}"/><text x="${(X(x) + 5).toFixed(1)}" y="${(Y(y) - 4).toFixed(1)}" font-family="monospace" font-size="11" fill="${fill}">${label}</text>`;
  s += mark(Vx, Vy, "#06c", "V");
  s += mark(Fa.x, Fa.y, "#080", "ta");
  s += mark(Fb.x, Fb.y, "#080", "tb");
  return s;
}
function plot3(fb: any, master: any, v1: S1dCorner, v2: S1dCorner, file: string, caption: string): void {
  const cx = master.Vx, cy = master.Vy;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="400" viewBox="0 0 1080 400">`
    + `<rect width="1080" height="400" fill="white"/>`
    + `<text x="540" y="392" text-anchor="middle" font-family="monospace" font-size="11">${esc(caption)}</text>`
    + panel(fb, master.j, panelOutlineMaster(fb, master), master.Vx, master.Vy, { x: master.tax, y: master.tay }, { x: master.tbx, y: master.tby }, cx, cy, 0, "form B (master)")
    + panel(fb, master.j, panelOutlineVariant(v1), v1.Vx, v1.Vy, v1.Fa, v1.Fb, cx, cy, 360, "variant (i)")
    + panel(fb, master.j, panelOutlineVariant(v2), v2.Vx, v2.Vy, v2.Fa, v2.Fb, cx, cy, 720, "variant (ii)")
    + `</svg>`;
  writeFileSync(`${OUT}/${file}`, svg);
  console.log(`${file}: ${caption}`);
}
function findCorner(fb: any, sc: any, jid: string, eiA: number, eiB: number): any {
  return fb.corners.find((c: any) => sc.junctions[c.j]?.id === jid && fb.arms[c.a].ei === eiA && fb.arms[c.b].ei === eiB);
}
function variantsAt(fb: any, master: any): [S1dCorner, S1dCorner] {
  const src = { j: master.j, a: master.a, b: master.b, theta: master.theta, style: master.style, Vx: master.Vx, Vy: master.Vy, dVa: master.dVa, dVb: master.dVb };
  return [s1dCorner(fb, src, 1), s1dCorner(fb, src, 2)];
}
function plotSceneSite(sceneName: string, jid: string, eiA: number, eiB: number, tag: string, captionExtra: string): void {
  const sc = loadScene(sceneName);
  const fb: any = new FormB(sc);
  const master = findCorner(fb, sc, jid, eiA, eiB);
  if (!master) { console.log(`${tag}: corner not found in ${sceneName}`); return; }
  const [v1, v2] = variantsAt(fb, master);
  plot3(fb, master, v1, v2, `plot_${tag}_${sceneName}_${jid}_${eiA}-${eiB}.svg`, `${tag}: ${sceneName} ${jid} arms ${eiA}-${eiB} ${captionExtra}`);
}

// Run L's four sites.
plotSceneSite("user_tw42.lightpaper", "j12", 0, 1, "class-b-worst", "(Run L class-b worst, exact outline)");
plotSceneSite("muse_hash", "j43", 0, 1, "class-d-worst", "(Run L class-d worst, exact outline)");
plotSceneSite("muse_hash", "j63", 0, 1, "crit1v-worst-runL", "(Run L criterion 1v worst, master jump 73.4deg)");

// Per-variant worsts from the scenes record.
const scenes = JSON.parse(readFileSync(`${OUT}/scenes_s1d.json`, "utf8"));
for (const tag of ["v1", "v2"] as const) {
  const worstAgree = (scenes.agreeList as any[]).filter((r) => r.variant === tag).sort((a, b) => b.devPx - a.devPx)[0];
  if (worstAgree) {
    const m = /^(\S+) arms (\d+)-(\d+)$/.exec(worstAgree.site);
    plotSceneSite(worstAgree.scene, m![1], Number(m![2]), Number(m![3]), `agree-worst-${tag}`, `(worst agreement ${tag}: ${worstAgree.devPx} dev px, theta ${worstAgree.theta}, g ${worstAgree.g})`);
  }
  const visFails = (scenes.failList as any[]).filter((f) => f.col === tag && f.failVisible);
  let worstVis: any = null, worstJump = -1;
  for (const f of visFails) for (const mm of f.meets ?? []) if (mm.jumpDeg > worstJump) { worstJump = mm.jumpDeg; worstVis = f; }
  if (worstVis) {
    const m = /^(\S+) arms (\d+)-(\d+)$/.exec(worstVis.site);
    plotSceneSite(worstVis.scene, m![1], Number(m![2]), Number(m![3]), `crit1v-visible-worst-${tag}`, `(worst visible 1v ${tag}: jump ${worstJump.toFixed(1)}deg)`);
  } else console.log(`crit1v visible worst ${tag}: none`);
}

// Criterion 3 worsts: Run L's site (master) and per-variant worst keys,
// each at the frame of its larger step in its recording.
async function plotRecordingSite(recName: string, jIdx: number, eiA: number, eiB: number, fiW: number, variant: 0 | 1 | 2, tag: string): Promise<void> {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${recName}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prev: { x: number; y: number; fax: number; fay: number; fbx: number; fby: number; key: string } | null = null;
  let bestExcess = -Infinity, bestFb: any = null, bestMaster: any = null;
  for await (const line of rl) {
    if (!line) continue;
    if (first) { first = false; continue; }
    const fr = JSON.parse(line) as { i: number; scene: FieldScene };
    fr.scene.look.ctrlArc ??= 0.47;
    if (prevScene && sameScene(prevScene, fr.scene)) continue;
    prevScene = fr.scene;
    const fb: any = new FormB(fr.scene);
    const c: any = fb.corners.find((cc: any) => cc.j === jIdx && fb.arms[cc.a].ei === eiA && fb.arms[cc.b].ei === eiB);
    if (!c) { prev = null; continue; }
    let pt: { x: number; y: number }, fax: number, fay: number, fbx: number, fby: number;
    if (variant === 0) {
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
      pt = live ? { x: c.qx + c.r * Math.cos(a0 + (a1 - a0) * f), y: c.qy + c.r * Math.sin(a0 + (a1 - a0) * f) } : { x: c.Vx, y: c.Vy };
      const fa = pointAt(fb.polys[fb.arms[c.a].pi], c.sA);
      const fbq = pointAt(fb.polys[fb.arms[c.b].pi], c.sB);
      fax = fa.x; fay = fa.y; fbx = fbq.x; fby = fbq.y;
    } else {
      const vc = s1dCorner(fb, { j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb }, variant);
      pt = vc.live ? evalRound(vc, fiW / 20) : { x: vc.Vx, y: vc.Vy };
      const fa = pointAt(fb.polys[fb.arms[c.a].pi], vc.sFootA);
      const fbq = pointAt(fb.polys[fb.arms[c.b].pi], vc.sFootB);
      fax = fa.x; fay = fa.y; fbx = fbq.x; fby = fbq.y;
    }
    const key = `${jIdx}|${eiA}-${eiB}`;
    if (prev && prev.key === key) {
      const disp = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      const skel = Math.max(Math.hypot(fax - prev.fax, fay - prev.fay), Math.hypot(fbx - prev.fbx, fby - prev.fby));
      const excess = (disp - skel) * fb.ppuDev;
      if (excess > bestExcess) { bestExcess = excess; bestFb = fb; bestMaster = c; }
    }
    prev = { x: pt.x, y: pt.y, fax, fay, fbx, fby, key };
  }
  if (bestFb && bestMaster) {
    const [v1, v2] = variantsAt(bestFb, bestMaster);
    plot3(bestFb, bestMaster, v1, v2, `plot_${tag}_${recName}_j${jIdx}_${eiA}-${eiB}.svg`, `${tag}: ${recName} R|${jIdx}|${eiA}-${eiB}|${fiW}, excess ${bestExcess.toFixed(2)} dev px (frame of the larger step)`);
  } else console.log(`${tag}: site not located in ${recName}`);
}

const recs = JSON.parse(readFileSync(`${OUT}/recordings_s1d.json`, "utf8"));
let worstMasterRec: any = null;
for (const r of recs as any[]) if (!worstMasterRec || r.master.maxExcessDev > worstMasterRec.master.maxExcessDev) worstMasterRec = r;
{
  const parts = String(worstMasterRec.master.worst).split("|");
  await plotRecordingSite(worstMasterRec.recording, Number(parts[1]), ...parts[2].split("-").map(Number) as [number, number], Number(parts[3]), 0, "crit3-worst-runL");
}
for (const [tag, vk] of [["v1", "v1"], ["v2", "v2"]] as const) {
  let worstRec: any = null;
  for (const r of recs as any[]) if (!worstRec || r[vk].maxExcessDev > worstRec[vk].maxExcessDev) worstRec = r;
  const parts = String(worstRec[vk].worst).split("|");
  await plotRecordingSite(worstRec.recording, Number(parts[1]), ...parts[2].split("-").map(Number) as [number, number], Number(parts[3]), tag === "v1" ? 1 : 2, `crit3-worst-${tag}`);
}
console.log("plots done");
void sampleRound;
