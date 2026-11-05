// K1186 run B: turn flips.mjs's raw per-rebuild dumps + step PNGs into
// the summary tables.   node table.mjs <dir> <stand> [stand2 ...]
// Flip = change vs the previous rebuild on the same stand+script.
// Kinds: armVote (an arm's (top,dives) pair), wedge (a wedge's layer),
// disc (the junction disc layer), cover (a cover strip's layer),
// reachBound (which armReach term binds: domain/gap/floor).
// Geometric ink (device px): wedge flip -> triangle (centre, tipA, tipB)
// area; disc -> pi*(0.92*fillHalf)^2; cover/reach -> |strip| * tw.
// A bare armVote flip that flips no piece has geometric ink 0.
// Drawn ink: changed px in the target junction's 260px crop between
// consecutive drag steps, corrected by the median non-flip-step change
// of the same drag and by the control drag's median (both reported).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decodePNG } from "./png.mjs";

const dir = process.argv[2];
const stands = process.argv.slice(3);
const KINDS = ["armVote", "wedge", "disc", "cover", "reachBound"];
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const worst = (a) => (a.length ? Math.max(...a) : 0);

function flipsBetween(p, q, scaleDev, fh) {
  // returns [{ji, kind, geo}] for one rebuild transition
  const out = [];
  if (!p || !q) return out;
  for (let ji = 0; ji < q.J.length; ji++) {
    const a = p.J[ji], b = q.J[ji];
    if (!a || !b) continue;
    const n = Math.min(a.A.length, b.A.length);
    let vote = false;
    const tips = b.A.map((arm, k) => [b.c[0] + arm[4] * arm[3], b.c[1] + arm[5] * arm[3]]);
    for (let k = 0; k < n; k++) {
      if (a.A[k][0] !== b.A[k][0] || a.A[k][1] !== b.A[k][1]) { vote = true; }
      if (a.A[k][2] !== b.A[k][2]) {
        out.push({ ji, kind: "reachBound", geo: Math.abs(b.A[k][3] - a.A[k][3]) * (2 * fh) * scaleDev * scaleDev });
      }
      if (a.cov[k] !== b.cov[k]) out.push({ ji, kind: "cover", geo: b.A[k][3] * (2 * fh) * scaleDev * scaleDev });
    }
    if (vote) out.push({ ji, kind: "armVote", geo: 0 });
    for (let k = 0; k < n; k++) {
      if (a.W[k] !== b.W[k]) {
        const A = tips[k], B = tips[(k + 1) % n];
        const geo = 0.5 * Math.abs((A[0] - b.c[0]) * (B[1] - b.c[1]) - (A[1] - b.c[1]) * (B[0] - b.c[0])) * scaleDev * scaleDev;
        out.push({ ji, kind: "wedge", geo });
      }
    }
    if (a.disc !== b.disc) out.push({ ji, kind: "disc", geo: Math.PI * (0.92 * fh * scaleDev) ** 2 });
  }
  return out;
}

function diffPx(pa, pb) {
  const a = decodePNG(pa), b = decodePNG(pb);
  if (a.W !== b.W || a.H !== b.H) return -1;
  let n = 0;
  for (let i = 0; i < a.data.length; i += a.ch) {
    if (Math.abs(a.data[i] - b.data[i]) > 8 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) n++;
  }
  return n;
}

let md = "# K1186 run B (19B): junction choice flips and the ink each moves\n\n";
const summary = {};
for (const stand of stands) {
  const dump = JSON.parse(readFileSync(join(dir, `raw_${stand}.json`), "utf8"));
  const { scaleDev } = dump;
  md += `## Stand ${stand}\n\nLink: \`?${dump.link}\` at ${dump.base}; ${dump.nj} junctions; scale ${scaleDev.toFixed(1)} device px/world; ctxLost=${dump.ctxLost}.\n\n`;
  md += "Targets: " + dump.targets.map((t) => `ji${t.ji} centre (${t.c[0].toFixed(2)}, ${t.c[1].toFixed(2)}) record ${t.rec}`).join("; ") + ".\n\n";
  // per-script flip tables
  const geoByKind = {}; for (const k of KINDS) geoByKind[k] = [];
  const perScript = [];
  const flipByJunction = new Map();
  const drawnSteps = {}; // script -> [{step, kinds:Set, changed}]
  for (const sc of dump.scripts) {
    const counts = {}; for (const k of KINDS) counts[k] = 0;
    let transitions = 0;
    const stepKinds = new Map();
    for (let i = 1; i < sc.samples.length; i++) {
      const fl = flipsBetween(sc.samples[i - 1], sc.samples[i], scaleDev, sc.samples[i].fh);
      transitions++;
      for (const f of fl) {
        counts[f.kind]++;
        geoByKind[f.kind].push(f.geo);
        const key = `${f.ji}`;
        flipByJunction.set(key, (flipByJunction.get(key) || 0) + 1);
        const mk = (sc.samples[i].mark || "").split(":").pop();
        if (!stepKinds.has(mk)) stepKinds.set(mk, new Set());
        stepKinds.get(mk).add(f.kind + "@" + f.ji);
      }
    }
    const meta = dump.dragMeta.find((d) => d.script === sc.script);
    perScript.push({ script: sc.script, rebuilds: sc.samples.length, transitions, counts, seconds: meta?.seconds ?? null });
    drawnSteps[sc.script] = stepKinds;
  }
  md += "| script | rebuilds | armVote | wedge | disc | cover | reachBound | flips/rebuild |\n|---|---|---|---|---|---|---|---|\n";
  for (const p of perScript) {
    const tot = KINDS.reduce((s, k) => s + p.counts[k], 0);
    md += `| ${p.script} | ${p.rebuilds} | ${p.counts.armVote} | ${p.counts.wedge} | ${p.counts.disc} | ${p.counts.cover} | ${p.counts.reachBound} | ${(tot / Math.max(1, p.transitions)).toFixed(3)} |\n`;
  }
  const drags = perScript.filter((p) => p.script.startsWith("drag"));
  const dragSecs = drags.reduce((s, p) => s + (p.seconds || 0), 0);
  const dragFlips = drags.reduce((s, p) => s + KINDS.reduce((a, k) => a + p.counts[k], 0), 0);
  md += `\nDrag rate (3 measured drags): ${dragFlips} flips over ${drags.reduce((s, p) => s + p.rebuilds, 0)} rebuilds (${dragSecs.toFixed(1)}s of dragging) = ${(dragFlips / Math.max(1, dragSecs)).toFixed(2)} flips/s.\n\n`;
  const topJ = [...flipByJunction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  md += "Junctions that flip most (all scripts): " + topJ.map(([ji, n]) => {
    const sc0 = dump.scripts[0].samples[0]?.J[+ji];
    const c = dump.scripts.flatMap((s) => s.samples).find((s) => s.J[+ji])?.J[+ji];
    return `ji${ji} (${n} flips, centre ${c ? `(${c.c[0].toFixed(2)}, ${c.c[1].toFixed(2)})` : "?"} record ${c ? c.rec : "?"})`;
  }).join("; ") + ".\n\n";
  md += "Geometric ink per flip (device px):\n\n| kind | flips | median | worst |\n|---|---|---|---|\n";
  for (const k of KINDS) md += `| ${k} | ${geoByKind[k].length} | ${med(geoByKind[k]).toFixed(1)} | ${worst(geoByKind[k]).toFixed(1)} |\n`;
  md += "\n";
  // drawn ink from step PNGs
  const drawnByKind = {}; for (const k of KINDS) drawnByKind[k] = [];
  const ctrl = dump.dragMeta.find((d) => d.script === "control-drag1");
  let ctrlMedian = 0, ctrlWorst = 0;
  const stepDiff = (script, ji, i) => {
    const f = (n) => join(dir, `${stand}_${script}_ji${ji}_step${String(n).padStart(2, "0")}.png`);
    if (!existsSync(f(i)) || !existsSync(f(i + 1))) return null;
    return diffPx(readFileSync(f(i)), readFileSync(f(i + 1)));
  };
  if (ctrl) {
    const ds = [];
    for (let i = 0; i < 16; i++) { const d = stepDiff("control-drag1", ctrl.ji, i); if (d !== null && d >= 0) ds.push(d); }
    ctrlMedian = med(ds); ctrlWorst = worst(ds);
  }
  for (const dm of dump.dragMeta.filter((d) => d.script.startsWith("drag"))) {
    const diffs = [];
    for (let i = 0; i < 16; i++) diffs.push(stepDiff(dm.script, dm.ji, i));
    const kindsAll = drawnSteps[dm.script] || new Map();
    // only flips at junctions whose centre lies in this drag's crop count
    const v = dump.view;
    const wx0 = (dm.clip.x - v.x) / v.s, wy0 = (dm.clip.y - v.y) / v.s;
    const wx1 = (dm.clip.x + dm.clip.width - v.x) / v.s, wy1 = (dm.clip.y + dm.clip.height - v.y) / v.s;
    const inCrop = (ji) => {
      const c = dump.scripts.flatMap((s) => s.samples).find((s) => s.J[ji])?.J[ji]?.c;
      return c && c[0] >= wx0 && c[0] <= wx1 && c[1] >= wy0 && c[1] <= wy1;
    };
    const kinds = new Map();
    for (const [mk, set] of kindsAll) kinds.set(mk, new Set([...set].filter((e) => inCrop(+e.split("@")[1])).map((e) => e.split("@")[0])));
    const nonFlip = diffs.filter((d, i) => d !== null && d >= 0 && !(kinds.get(`step${i + 1}`)?.size));
    const base = med(nonFlip);
    for (let i = 0; i < diffs.length; i++) {
      const ks = kinds.get(`step${i + 1}`);
      if (diffs[i] === null || diffs[i] < 0 || !ks?.size) continue;
      const corr = Math.max(0, diffs[i] - base - ctrlMedian);
      for (const k of ks) drawnByKind[k].push(corr);
    }
    md += `Drawn ink ${dm.script} (ji${dm.ji} crop): median non-flip step change ${base} px; steps: ${diffs.map((d) => d ?? "x").join(", ")}.\n\n`;
  }
  md += `Control (control-drag1 replayed first, same build): median step change ${ctrlMedian} px, worst ${ctrlWorst} px.\n\n`;
  md += "| kind (drawn, corrected) | flips with shots | median | worst |\n|---|---|---|---|\n";
  for (const k of KINDS) md += `| ${k} | ${drawnByKind[k].length} | ${med(drawnByKind[k]).toFixed(0)} | ${worst(drawnByKind[k]).toFixed(0)} |\n`;
  md += "\n";
  // sweep drawn ink: full-frame changed px per step, kinds from the
  // sweep's own marks; corrected by the median non-flip step.
  for (const sw of ["sweep-cr", "sweep-tw"]) {
    const f = (n) => join(dir, `${stand}_${sw}_step${String(n).padStart(2, "0")}.png`);
    const kinds = drawnSteps[sw] || new Map();
    const vals = [...kinds.keys()].map((k) => +k.split(":").pop()).filter((x) => !Number.isNaN(x));
    const diffs = [];
    for (let i = 0; i <= 24; i++) {
      if (!existsSync(f(i)) || !existsSync(f(i + 1))) { diffs.push(null); continue; }
      diffs.push(diffPx(readFileSync(f(i)), readFileSync(f(i + 1))));
    }
    const stepKind = (i) => {
      // step index i in values -> mark value; find kinds by any mark ending in that value
      return null;
    };
    md += `Drawn ink ${sw}: full-frame step changes: ${diffs.map((d) => d ?? "x").join(", ")} (per-step flip kinds in summary.json's perScript counts; the parameter move itself redraws the whole knot, so these are upper bounds, not flip-attributed).\n\n`;
  }
  summary[stand] = { perScript, geoByKind: Object.fromEntries(KINDS.map((k) => [k, { n: geoByKind[k].length, median: med(geoByKind[k]), worst: worst(geoByKind[k]) }])), drawnByKind: Object.fromEntries(KINDS.map((k) => [k, { n: drawnByKind[k].length, median: med(drawnByKind[k]), worst: worst(drawnByKind[k]) }])), ctrlMedian, ctrlWorst, topJ };
}
writeFileSync(join(dir, "summary.md"), md);
writeFileSync(join(dir, "summary.json"), JSON.stringify(summary, null, 1));
console.log(md);
