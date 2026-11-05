// K1179 S1b task 7: SVG plots of Run I's six worst cusp sites and the
// worst site of each S1b class, before (Run I's form B) and after
// (task 2's reference; the lean solve's corners are identical). Each
// plot: two panels centred on the corner, 4h across, bare tube edges
// in grey, the drawn outline in black, the ball's circle dashed, and
// V (red), q (blue) and the feet (green) marked. No pngjs.
// Run: npx.cmd vite-node .claude/probes/K1179/s1b/s1b_plots.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../../src/render/field/form_b";
import { cornerSequence, edgeOutlinePoints, facingSide, loadScene } from "../outline";
import { FormB as FormBRef } from "./form_b_ref";
import { fmt } from "./lib_s1b";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

interface Site { scene: string; junction: string; arms: string; label: string }
const sites: Site[] = [];
const runI = JSON.parse(readFileSync(`${HERE}/../out/scenes.json`, "utf8"));
for (const r of runI.cusps.slice(0, 6)) sites.push({ scene: r.scene, junction: r.junction, arms: r.arms, label: `runI-worst-${sites.length + 1}` });
const s1b = JSON.parse(readFileSync(`${OUT}/scenes_s1b.json`, "utf8"));
for (const w of s1b.summary.cuspWorstPerClass) {
  if (!w.worst) continue;
  const s = { scene: w.worst.scene, junction: w.worst.junction, arms: w.worst.arms, label: `class-${w.cls}-worst` };
  if (!sites.some((x) => x.scene === s.scene && x.junction === s.junction && x.arms === s.arms)) sites.push(s);
}

function findCorner(fb: any, sc: any, site: Site): any {
  const [ea, eb] = site.arms.split("-").map(Number);
  return fb.corners.find((c: any) => String(sc.junctions[c.j]?.id) === site.junction && fb.arms[c.a].ei === ea && fb.arms[c.b].ei === eb);
}

function panel(fb: any, c: any, ox: number, title: string): string {
  const h = fb.h;
  const cx = c.Vx;
  const cy = c.Vy;
  const S = 300 / (4 * h);
  const X = (x: number) => (ox + 10 + (x - (cx - 2 * h)) * S).toFixed(1);
  const Y = (y: number) => (10 + (y - (cy - 2 * h)) * S).toFixed(1);
  const seq = cornerSequence(fb, c);
  void seq;
  const sideA = facingSide(fb, c.a, c.dA, c.tax, c.tay);
  const sideB = facingSide(fb, c.b, c.dB, c.tbx, c.tby);
  const drawn: { x: number; y: number }[] = [];
  for (const p of edgeOutlinePoints(fb, c.a, sideA, c.dA, Math.min(fb.arms[c.a].L, c.dA + 1.6 * h)).reverse()) drawn.push(p);
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
      drawn.push({ x: c.qx + c.r * Math.cos(an), y: c.qy + c.r * Math.sin(an) });
    }
  } else drawn.push({ x: c.Vx, y: c.Vy });
  for (const p of edgeOutlinePoints(fb, c.b, sideB, c.dB, Math.min(fb.arms[c.b].L, c.dB + 1.6 * h))) drawn.push(p);
  const grey: string[] = [];
  for (const [ai, dF] of [[c.a, c.dA], [c.b, c.dB]] as [number, number][]) {
    for (const side of [1, -1]) {
      const pts = edgeOutlinePoints(fb, ai, side, Math.max(0, dF - 0.2 * h), Math.min(fb.arms[ai].L, dF + 1.6 * h));
      if (pts.length > 1) grey.push(`<polyline points="${pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")}" fill="none" stroke="#999" stroke-width="1"/>`);
    }
  }
  const outline = `<polyline points="${drawn.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ")}" fill="none" stroke="black" stroke-width="2"/>`;
  const ball = c.r > 1e-12 ? `<circle cx="${X(c.qx)}" cy="${Y(c.qy)}" r="${(c.r * S).toFixed(1)}" fill="none" stroke="blue" stroke-width="1" stroke-dasharray="4 3"/>` : "";
  return `<rect x="${ox}" y="0" width="320" height="320" fill="white" stroke="#ccc"/>
${grey.join("\n")}
${outline}
${ball}
<circle cx="${X(c.Vx)}" cy="${Y(c.Vy)}" r="4" fill="red"><title>V</title></circle>
<circle cx="${X(c.qx)}" cy="${Y(c.qy)}" r="4" fill="blue"><title>q</title></circle>
<circle cx="${X(c.tax)}" cy="${Y(c.tay)}" r="3" fill="green"><title>tA</title></circle>
<circle cx="${X(c.tbx)}" cy="${Y(c.tby)}" r="3" fill="green"><title>tB</title></circle>
<text x="${ox + 10}" y="335" font-family="monospace" font-size="12">${title} r=${fmt(c.r / h, 3)}h theta=${fmt((c.theta * 180) / Math.PI, 1)}deg</text>`;
}

for (const site of sites) {
  const sc = loadScene(site.scene);
  const before: any = new FormB(sc);
  const ref: any = new FormBRef(sc);
  const cB = findCorner(before, sc, site);
  const cR = findCorner(ref, sc, site);
  if (!cB || !cR) { console.log(`missing ${site.scene} ${site.junction} ${site.arms}`); continue; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="360" viewBox="0 0 660 360">
<title>${site.scene} ${site.junction} arms ${site.arms} (${site.label}): before | after (margin band [0, 0.05h])</title>
${panel(before, cB, 0, "before")}
${panel(ref, cR, 330, "after")}
<text x="10" y="355" font-family="monospace" font-size="12">${site.scene} ${site.junction} arms ${site.arms} (${site.label})</text>
</svg>
`;
  const fn = `${OUT}/plot_${site.label}_${site.scene}_${site.junction}_${site.arms}.svg`;
  writeFileSync(fn, svg);
  console.log(`svg ${fn}`);
}
