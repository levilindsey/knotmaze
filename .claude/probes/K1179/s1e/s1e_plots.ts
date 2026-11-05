// K1179 S1e plots: SVG under s1e/out/, centred on the corner, 4h
// across, form B beside variants (i) K=32 and (ii) K=8 (three
// panels). Sites: Run H's sites (muse_default_tw j130, muse_hash
// j49, muse_flow R|18|2-0, the gate699 corner at its pop), and per
// variant the worst agreement corner, the worst visible 1v failure
// and the worst criterion 3 failure. No pngjs.
// Run: npx.cmd vite-node .claude/probes/K1179/s1e/s1e_plots.ts
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { edgeOutlinePoints, facingSide, linePts, loadScene } from "../outline";
import { sameScene } from "../seq13_lib";
import { evalRound, fillLoop } from "../s1d/lib_s1d";
import { s1eCorner } from "./lib_s1e";
import type { S1eCorner } from "./lib_s1e";

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
function panelOutlineVariant(c: S1eCorner): { x: number; y: number }[] {
  if (!c.live) return [{ x: c.Vx, y: c.Vy }];
  return fillLoop(c as any, 60);
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
function plot3(fb: any, master: any, v32: S1eCorner, v8: S1eCorner, file: string, caption: string): void {
  const cx = master.Vx, cy = master.Vy;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="400" viewBox="0 0 1080 400">`
    + `<rect width="1080" height="400" fill="white"/>`
    + `<text x="540" y="392" text-anchor="middle" font-family="monospace" font-size="11">${esc(caption)}</text>`
    + panel(fb, master.j, panelOutlineMaster(fb, master), master.Vx, master.Vy, { x: master.tax, y: master.tay }, { x: master.tbx, y: master.tby }, cx, cy, 0, "form B (master)")
    + panel(fb, master.j, panelOutlineVariant(v32), v32.Vx, v32.Vy, v32.Fa, v32.Fb, cx, cy, 360, "variant (i) K=32")
    + panel(fb, master.j, panelOutlineVariant(v8), v8.Vx, v8.Vy, v8.Fa, v8.Fb, cx, cy, 720, "variant (ii) K=8")
    + `</svg>`;
  writeFileSync(`${OUT}/${file}`, svg);
  console.log(`${file}: ${caption}`);
}
function findCorner(fb: any, sc: any, jid: string, eiA: number, eiB: number): any {
  return fb.corners.find((c: any) => sc.junctions[c.j]?.id === jid && fb.arms[c.a].ei === eiA && fb.arms[c.b].ei === eiB);
}
function variantsAt(fb: any, master: any): [S1eCorner, S1eCorner] {
  const src = { j: master.j, a: master.a, b: master.b, theta: master.theta, style: master.style, Vx: master.Vx, Vy: master.Vy, dVa: master.dVa, dVb: master.dVb };
  const winCache = new Map();
  return [s1eCorner(fb, src, 32, undefined, { winCache }), s1eCorner(fb, src, 8, undefined, { winCache })];
}
function plotSceneSite(sceneName: string, jid: string, eiA: number, eiB: number, tag: string, captionExtra: string): void {
  const sc = loadScene(sceneName);
  const fb: any = new FormB(sc);
  const master = findCorner(fb, sc, jid, eiA, eiB);
  if (!master) { console.log(`${tag}: corner not found in ${sceneName} ${jid} ${eiA}-${eiB}`); return; }
  const [v32, v8] = variantsAt(fb, master);
  plot3(fb, master, v32, v8, `plot_${tag}_${sceneName}_${jid}_${eiA}-${eiB}.svg`, `${tag}: ${sceneName} ${jid} arms ${eiA}-${eiB} ${captionExtra}`);
}

// Run H's sites 1-2 (scene sites)
plotSceneSite("muse_default_tw", "j130", 0, 1, "fixed-runH", "(Run H worst agreement in S1d, now gated)");
plotSceneSite("muse_hash", "j49", 2, 0, "fixed-runH", "(Run H worst visible 1v; S1e K=8 visible there)");

// Per-variant worst agreement + visible failures from the scenes record
const scenes = JSON.parse(readFileSync(`${OUT}/scenes_s1e.json`, "utf8"));
for (const tag of ["k32", "k8"] as const) {
  const worstAgree = (scenes.agreeList as any[]).filter((r) => r.variant === tag).sort((a, b) => b.devPx - a.devPx)[0];
  if (worstAgree) {
    const m = /^(\S+) arms (\d+)-(\d+)$/.exec(worstAgree.site);
    plotSceneSite(worstAgree.scene, m![1], Number(m![2]), Number(m![3]), `agree-worst-${tag}`, `(worst gated agreement ${tag}: ${worstAgree.devPx} dev px, theta ${worstAgree.theta}, limiting ${worstAgree.limitingFactor})`);
  }
  const visFails = (scenes.failList as any[]).filter((f) => f.col === tag && f.failVisible);
  let worstVis: any = null, worstJump = -1;
  for (const f of visFails) for (const mm of f.meets ?? []) if (mm.jumpDeg > worstJump) { worstJump = mm.jumpDeg; worstVis = f; }
  if (worstVis) {
    const m = /^(\S+) arms (\d+)-(\d+)$/.exec(worstVis.site);
    plotSceneSite(worstVis.scene, m![1], Number(m![2]), Number(m![3]), `crit1v-visible-worst-${tag}`, `(worst visible 1v ${tag}: jump ${worstJump.toFixed(1)}deg)`);
  } else console.log(`crit1v visible worst ${tag}: none (no visible failure)`);
}

// gate699 at its pop: the sweep's largest step for (i) at e=atK32, the
// theta=2.0 corner of that stand (sweeps record in the same out dir)
{
  const sweeps = JSON.parse(readFileSync(`${OUT}/sweeps_s1e.json`, "utf8"));
  const g = (sweeps as any[]).find((r) => String(r.name).startsWith("gate699"));
  const ePop = g ? g.atK32 : 0.39;
  const stand = (name: string, chains: { pts: number[]; closed?: boolean }[], junctions: FieldScene["junctions"]): FieldScene => ({
    version: 1, name, source: { kind: "synthetic", generator: "K1179 copied stand", params: {} },
    camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
    look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
    chains: chains.map((c, id) => ({ id, closed: !!c.closed, pts: c.pts, z: new Array(c.pts.length / 2).fill(0) })),
    crossings: [], junctions, deadEnds: [],
  } as FieldScene);
  const pb = 2.0, pc = -2.2;
  const sc = stand("gate699", [
    { pts: linePts(0, 0, 10, 0) },
    { pts: linePts(-ePop, 0, -ePop + 10 * Math.cos(pb), 10 * Math.sin(pb)) },
    { pts: linePts(0, 0, 10 * Math.cos(pc), 10 * Math.sin(pc)) },
  ], [{ id: "j0", c: [0, 0], arms: [0, 1, 2].map((chain) => ({ chain, s: 0, dir: 1 as const, kind: "end" as const })), corners: [0, 1, 2].map(() => ({ style: "round" as const, pinned: false })) }]);
  const fb: any = new FormB(sc);
  let master = fb.corners[0];
  let bestD = Infinity;
  for (const c of fb.corners as any[]) { const d = Math.abs(c.theta - 2.0); if (d < bestD) { bestD = d; master = c; } }
  const [v32, v8] = variantsAt(fb, master);
  plot3(fb, master, v32, v8, `plot_fixed-runH_gate699_e${ePop}.svg`, `fixed-runH gate699: gate699 corner (theta ${master.theta.toFixed(3)}) at its pop e=${ePop} (sweep step now at form B's rate)`);
}

// Criterion 3 sites from recordings: Run H's muse_flow R|18|2-0 and
// per-variant worst keys, each at the frame of its larger step.
async function plotRecordingSite(recName: string, jIdx: number, eiA: number, eiB: number, fiW: number, variantK: 32 | 8, tag: string): Promise<void> {
  const rl = createInterface({ input: createReadStream(`${SEQ_DIR}/${recName}.jsonl.gz`).pipe(createGunzip()), crlfDelay: Infinity });
  let first = true;
  let prevScene: FieldScene | null = null;
  let prev: { x: number; y: number; fax: number; fay: number; fbx: number; fby: number } | null = null;
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
    const vc = s1eCorner(fb, { j: c.j, a: c.a, b: c.b, theta: c.theta, style: c.style, Vx: c.Vx, Vy: c.Vy, dVa: c.dVa, dVb: c.dVb }, variantK, undefined, { winCache: new Map() });
    const pt = vc.live ? evalRound(vc as any, fiW / 20) : { x: vc.Vx, y: vc.Vy };
    const fa = pointAt(fb.polys[fb.arms[c.a].pi], vc.sFootA);
    const fbq = pointAt(fb.polys[fb.arms[c.b].pi], vc.sFootB);
    if (prev) {
      const disp = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      const skel = Math.max(Math.hypot(fa.x - prev.fax, fa.y - prev.fay), Math.hypot(fbq.x - prev.fbx, fbq.y - prev.fby));
      const excess = (disp - skel) * fb.ppuDev;
      if (excess > bestExcess) { bestExcess = excess; bestFb = fb; bestMaster = c; }
    }
    prev = { x: pt.x, y: pt.y, fax: fa.x, fay: fa.y, fbx: fbq.x, fby: fbq.y };
  }
  if (bestFb && bestMaster) {
    const [v32, v8] = variantsAt(bestFb, bestMaster);
    plot3(bestFb, bestMaster, v32, v8, `plot_${tag}_${recName}_j${jIdx}_${eiA}-${eiB}.svg`, `${tag}: ${recName} R|${jIdx}|${eiA}-${eiB}|${fiW}, excess ${bestExcess.toFixed(2)} dev px (frame of the larger step)`);
  } else console.log(`${tag}: site not located in ${recName}`);
}

await plotRecordingSite("muse_flow", 18, 2, 0, 12, 32, "fixed-runH-crit3");
const recsData = JSON.parse(readFileSync(`${OUT}/recordings_s1e.json`, "utf8"));
const recList = recsData.recordings ?? recsData;
for (const [tag, vk] of [["k32", "k32"], ["k8", "k8"]] as const) {
  let worstRec: any = null;
  for (const r of recList as any[]) if (!worstRec || r[vk].maxExcessDev > worstRec[vk].maxExcessDev) worstRec = r;
  const parts = String(worstRec[vk].worst).split("|");
  await plotRecordingSite(worstRec.recording, Number(parts[1]), ...parts[2].split("-").map(Number) as [number, number], Number(parts[3]), tag === "k32" ? 32 : 8, `crit3-worst-${tag}`);
}
console.log("plots done");
