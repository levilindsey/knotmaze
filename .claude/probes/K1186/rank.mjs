// K1186 run D (batch 20, 20D) task 1: name the five worst drawn flips
// from 19B's own data. Probe only; no src change, 19B's files untouched.
//   node rank.mjs [outDir]        (default out20d)
// Inputs (19B, tracked, read-only): out/summary.json, out/summary.md,
// out/raw_seed3.json, out/raw_fat11.json. The step PNGs 19B tabulated
// from were deleted after tabulation, so the drawn side is rebuilt from
// summary.md's preserved per-drag step diffs + non-flip medians and
// summary.json's control medians, with table.mjs's flip detection
// (flipsBetween below, copied from table.mjs) rerun on the raw dumps.
// Validation: the replicated non-flip bases, per-script flip counts and
// drawn worst must equal 19B's tables or this script throws.
//
// Ranking rule (stated, per the brief): measured drags only (drag1..3;
// sweeps have no per-flip drawn ink, only a full-frame upper bound).
// (a) Drawn ranking: every individual in-crop drag flip (table.mjs's
// in-crop rule: the junction's centre inside the drag target's 260 px
// crop) with corrected drawn ink = max(0, step diff - the drag's
// non-flip median - the stand's control median), worst first. Only one
// flip reads above the control noise (drawn > 0); it is row 1.
// (b) The remaining four rows fill from the geometric-ink ranking
// (19B's other measure), one row per (stand, script, transition,
// junction), headline kind = that transition's largest-geometric piece,
// worst first; ties keep stand/script/transition order. Each row lists
// every piece that flipped at its transition.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT19 = join(HERE, "out");
const OUT = join(HERE, process.argv[2] || "out20d");
mkdirSync(OUT, { recursive: true });
const summary = JSON.parse(readFileSync(join(OUT19, "summary.json"), "utf8"));
const md19 = readFileSync(join(OUT19, "summary.md"), "utf8");

// Per-drag step diffs + non-flip medians, parsed from summary.md.
const dragInfo = {};
let curStand = null;
for (const line of md19.split("\n")) {
  const sm = line.match(/^## Stand (\S+)/);
  if (sm) { curStand = sm[1]; dragInfo[curStand] = {}; continue; }
  const dm = line.match(/^Drawn ink (drag\d) \(ji(\d+) crop\): median non-flip step change (\d+) px; steps: (.+)\./);
  if (dm && curStand) dragInfo[curStand][dm[1]] = { ji: +dm[2], base: +dm[3], diffs: dm[4].split(",").map((x) => +x.trim()) };
}

// table.mjs's flip detection, copied verbatim in substance.
function flipsBetween(p, q, scaleDev, fh) {
  const out = [];
  if (!p || !q) return out;
  for (let ji = 0; ji < q.J.length; ji++) {
    const a = p.J[ji], b = q.J[ji];
    if (!a || !b) continue;
    const n = Math.min(a.A.length, b.A.length);
    let vote = false, voteArm = -1;
    const tips = b.A.map((arm) => [b.c[0] + arm[4] * arm[3], b.c[1] + arm[5] * arm[3]]);
    for (let k = 0; k < n; k++) {
      if (a.A[k][0] !== b.A[k][0] || a.A[k][1] !== b.A[k][1]) { vote = true; voteArm = k; }
      if (a.A[k][2] !== b.A[k][2]) out.push({ ji, kind: "reachBound", idx: k, geo: Math.abs(b.A[k][3] - a.A[k][3]) * (2 * fh) * scaleDev * scaleDev, before: a.A[k], after: b.A[k] });
      if (a.cov[k] !== b.cov[k]) out.push({ ji, kind: "cover", idx: k, geo: b.A[k][3] * (2 * fh) * scaleDev * scaleDev, before: a.cov[k], after: b.cov[k] });
    }
    if (vote) out.push({ ji, kind: "armVote", idx: voteArm, geo: 0, before: null, after: null });
    for (let k = 0; k < n; k++) {
      if (a.W[k] !== b.W[k]) {
        const A = tips[k], B = tips[(k + 1) % n];
        out.push({ ji, kind: "wedge", idx: k, geo: 0.5 * Math.abs((A[0] - b.c[0]) * (B[1] - b.c[1]) - (A[1] - b.c[1]) * (B[0] - b.c[0])) * scaleDev * scaleDev, before: a.W[k], after: b.W[k] });
      }
    }
    if (a.disc !== b.disc) out.push({ ji, kind: "disc", idx: -1, geo: Math.PI * (0.92 * fh * scaleDev) ** 2, before: a.disc, after: b.disc });
  }
  return out;
}
const med = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const eq = (a, b, what) => { if (a !== b) throw new Error(`validation failed: ${what}: ${a} !== ${b}`) };

const dumps = {}, drawnFlips = [], groups = new Map(), controlSteps = [];
for (const stand of ["seed3", "fat11"]) {
  const dump = JSON.parse(readFileSync(join(OUT19, `raw_${stand}.json`), "utf8"));
  dumps[stand] = dump;
  const ctrlMedian = summary[stand].ctrlMedian;
  const centreOf = (ji) => { for (const s of dump.scripts) for (const sm of s.samples) { const j = sm.J[ji]; if (j) return j; } return null; };
  for (const sc of dump.scripts) {
    const per = summary[stand].perScript.find((p) => p.script === sc.script);
    // validate 19B's per-script counts against this replication
    const counts = { armVote: 0, wedge: 0, disc: 0, cover: 0, reachBound: 0 };
    for (let i = 1; i < sc.samples.length; i++) for (const f of flipsBetween(sc.samples[i - 1], sc.samples[i], dump.scaleDev, sc.samples[i].fh)) counts[f.kind]++;
    for (const k of Object.keys(counts)) eq(counts[k], per.counts[k], `${stand} ${sc.script} ${k}`);
    if (!/^drag\d$/.test(sc.script) && sc.script !== "control-drag1") continue;
    const dm = dump.dragMeta.find((d) => d.script === sc.script);
    const v = dump.view;
    const wx0 = (dm.clip.x - v.x) / v.s, wy0 = (dm.clip.y - v.y) / v.s;
    const wx1 = (dm.clip.x + dm.clip.width - v.x) / v.s, wy1 = (dm.clip.y + dm.clip.height - v.y) / v.s;
    const inCrop = (ji) => { const c = centreOf(ji)?.c; return !!(c && c[0] >= wx0 && c[0] <= wx1 && c[1] >= wy0 && c[1] <= wy1); };
    const info = dragInfo[stand]?.[sc.script.replace("control-", "")] || dragInfo[stand]?.[sc.script];
    // control-drag1 shares drag1's diff geometry only via its own run;
    // its drawn side is the control itself, so only measured drags rank.
    const stepHasFlipInCrop = new Set();
    const rows = [];
    for (let i = 1; i < sc.samples.length; i++) {
      const fl = flipsBetween(sc.samples[i - 1], sc.samples[i], dump.scaleDev, sc.samples[i].fh);
      const mark = sc.samples[i].mark || "", stepKey = mark.split(":").pop();
      for (const f of fl) {
        const cj = sc.samples[i].J[f.ji];
        const row = { stand, script: sc.script, trans: i, sampleN: sc.samples[i].n, mark, stepKey, ji: f.ji, kind: f.kind, idx: f.idx, geo: f.geo, centre: cj?.c ?? null, rec: cj?.rec ?? null, inCrop: inCrop(f.ji), before: f.before, after: f.after };
        rows.push(row);
        if (row.inCrop) stepHasFlipInCrop.add(stepKey);
        const key = `${stand}|${sc.script}|${i}|${f.ji}`;
        if (!groups.has(key)) groups.set(key, { stand, script: sc.script, trans: i, sampleN: sc.samples[i].n, mark, stepKey, ji: f.ji, centre: row.centre, rec: row.rec, pieces: [] });
        groups.get(key).pieces.push(row);
      }
    }
    if (sc.script === "control-drag1") {
      // steps where the control's own target junction (ji0) does not flip
      const byStep = new Map();
      for (const r of rows) if (r.ji === dm.ji) { if (!byStep.has(r.stepKey)) byStep.set(r.stepKey, []); byStep.get(r.stepKey).push(r); }
      for (let s = 1; s <= 16; s++) controlSteps.push({ stand, step: s, flipsAtTarget: (byStep.get(`step${s}`) || []).length });
      continue;
    }
    // validate the drag's non-flip median against summary.md
    const nonFlip = info.diffs.filter((d, i) => d !== null && d >= 0 && !stepHasFlipInCrop.has(`step${i + 1}`));
    eq(med(nonFlip), info.base, `${stand} ${sc.script} non-flip median`);
    for (const r of rows) {
      let drawn = null;
      if (r.inCrop) { const sm = /^step(\d+)$/.exec(r.stepKey); drawn = sm ? Math.max(0, info.diffs[+sm[1] - 1] - info.base - ctrlMedian) : 0; }
      r.drawn = drawn;
      if (drawn !== null) drawnFlips.push(r);
      const g = groups.get(`${r.stand}|${r.script}|${r.trans}|${r.ji}`);
      const gr = g.pieces.find((p) => p.kind === r.kind && p.idx === r.idx && p.trans === r.trans);
      if (gr) gr.drawn = drawn;
    }
  }
}

const drawnSorted = drawnFlips.filter((r) => r.drawn > 0).sort((a, b) => b.drawn - a.drawn || b.geo - a.geo);
eq(drawnSorted.length, 1, "drawn flips above control noise");
eq(drawnSorted[0].drawn, summary.seed3.drawnByKind.reachBound.worst, "drawn worst vs summary.json");
const geoGroups = [...groups.values()].filter((g) => /^drag\d$/.test(g.script))
  .map((g) => ({ ...g, maxGeo: Math.max(...g.pieces.map((p) => p.geo)) }))
  .sort((a, b) => b.maxGeo - a.maxGeo || a.stand.localeCompare(b.stand) || a.script.localeCompare(b.script) || a.trans - b.trans);
const headline = (g) => g.pieces.reduce((m, p) => (p.geo > m.geo ? p : m), g.pieces[0]);
const mkRow = (rowId, source, g, drawn) => {
  const h = headline(g);
  const dump = dumps[g.stand];
  const dm = dump.dragMeta.find((d) => d.script === g.script);
  const step = +(/^step(\d+)$/.exec(g.stepKey)?.[1] ?? NaN);
  return { rowId, source, stand: g.stand, link: dump.link, script: g.script, dragTargetJi: dm.ji, dragTargetCentre: dm.center, pathWorld: dm.pathWorld, ji: g.ji, centre: g.centre, rec: g.rec, trans: g.trans, sampleN: g.sampleN, mark: g.mark, step, headline: { kind: h.kind, idx: h.idx, geo: h.geo, before: h.before, after: h.after }, pieces: g.pieces.map((p) => ({ kind: p.kind, idx: p.idx, geo: p.geo, before: p.before, after: p.after })), geoMax: Math.max(...g.pieces.map((p) => p.geo)), drawn19B: drawn };
};
const d0 = drawnSorted[0];
const dGroup = groups.get(`${d0.stand}|${d0.script}|${d0.trans}|${d0.ji}`);
const rows = [mkRow("flip1", "drawn", dGroup, d0.drawn)];
let gi = 0;
for (const g of geoGroups) {
  if (rows.length >= 5) break;
  if (g.stand === dGroup.stand && g.script === dGroup.script && g.trans === dGroup.trans && g.ji === dGroup.ji) continue;
  rows.push(mkRow(`flip${rows.length + 1}`, "geometric", g, Math.max(...g.pieces.map((p) => p.drawn ?? 0))));
  gi++;
}
// Control: seed3 control-drag1 at its target ji0; first mid-drag step
// (5..12) with no flip at ji0, from controlSteps above.
const ctrlStep = controlSteps.filter((c) => c.stand === "seed3" && c.step >= 5 && c.step <= 12 && c.flipsAtTarget === 0).sort((a, b) => a.step - b.step)[0];
if (!ctrlStep) throw new Error("no clean control step found");
const cdump = dumps.seed3, cdm = cdump.dragMeta.find((d) => d.script === "control-drag1");
const control = { rowId: "control", stand: "seed3", link: cdump.link, script: "control-drag1", dragTargetJi: cdm.ji, pathWorld: cdm.pathWorld, ji: cdm.ji, centre: cdm.center, rec: cdm.record, step: ctrlStep.step, flipsAtTargetThatStep: 0, note: "same-build control drag (19B ran it first); chosen step has no flip at ji0" };
const ranking = { brief: "K1186 run D (20D) task 1 ranking from 19B data (f657ac15)", rule: "drawn first (corrected crop diff; only flips above control noise), then geometric fill, one row per junction-transition, headline = largest-geometric piece; drags only", ctrlMedians: { seed3: summary.seed3.ctrlMedian, fat11: summary.fat11.ctrlMedian }, drawnAboveNoise: drawnSorted, geoTop: geoGroups.slice(0, 10).map((g) => ({ stand: g.stand, script: g.script, ji: g.ji, centre: g.centre, rec: g.rec, trans: g.trans, mark: g.mark, maxGeo: g.maxGeo, headline: headline(g).kind + "[" + headline(g).idx + "]" })), controlStepsSeed3: controlSteps.filter((c) => c.stand === "seed3"), control, rows };
writeFileSync(join(OUT, "ranking.json"), JSON.stringify(ranking, null, 1));
let md = "# K1186 run D (20D): the five worst drawn flips, named from 19B\n\n";
md += "Ranking rule: measured drags only. Drawn first (crop diff minus the drag's non-flip median minus the stand's control median, as flips.mjs/table.mjs compute it); only **one** flip reads above the control noise, so rows 2-5 fill from the geometric-ink ranking, one row per (stand, script, transition, junction), headline = its largest-geometric piece. Control medians: seed3 4484 px, fat11 8641 px.\n\n";
md += `Control row: seed3 control-drag1 ji${control.ji} centre (${control.centre.map((x) => x.toFixed(2)).join(", ")}) record ${control.rec}, step ${control.step} (no flip at ji0 that step).\n\n`;
md += "| row | source | stand / script | junction | headline piece | geo (dev px) | drawn 19B (px) | transition |\n|---|---|---|---|---|---|---|---|\n";
for (const r of rows) md += `| ${r.rowId} | ${r.source} | ${r.stand} ${r.script} | ji${r.ji} (${r.centre.map((x) => x.toFixed(2)).join(", ")}) rec ${r.rec} | ${r.headline.kind}[${r.headline.idx}] | ${r.geoMax.toFixed(1)} | ${r.drawn19B} | trans ${r.trans}, ${r.mark}, sample ${r.sampleN} |\n`;
md += "\nAll pieces flipping at each row's transition are in ranking.json (`pieces`, with before/after values). Drag paths (`pathWorld`, verbatim from 19B's dumps) are in ranking.json per row for crops.mjs.\n";
writeFileSync(join(OUT, "ranking.md"), md);
console.log(md);
console.log(`rows: ${rows.map((r) => `${r.rowId}=${r.stand}/${r.script}/ji${r.ji}/${r.headline.kind}[${r.headline.idx}]`).join(" ")}; control step ${control.step}`);
