// phone_pass summary (K156): <out>/summary.md, readable without the jsonl.
// Reads bench.jsonl (bench.mjs), looks_report.json (looks.mjs), the watchdog's
// state files and the noise floor (cfg.noise, else noise.json beside this
// script). One table per scenario: base and head are medians over the reps,
// delta = head - base, noise = the A/A pass's floor for that cell and metric
// (the larger of the medians' |difference|, the largest single-rep |head - base|
// and one unit of the printed digit), verdict = "within noise" when
// |delta| <= noise, else better or worse by the metric's direction. An A/A pass
// (cfg.aa) has no verdict: its deltas ARE the noise, written to
// <out>/noise.json (copy the first one you trust to
// scripts/phone_pass/noise.json, the tracked floor every later summary reads).
// A fabric cell sampled at the finish (fab.solved) is flagged in its title.
// Dry runs (cfg.dry) are labeled: they check plumbing, not timings.
// Usage: node summary.mjs <config.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CFG, median } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const text = (f) => (existsSync(f) ? readFileSync(f, "utf8") : null);
const json = (f) => { const t = text(f); try { return t ? JSON.parse(t) : null; } catch { return null; } };
const rows = (text(join(CFG.out, "bench.jsonl")) || "").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const noiseFile = CFG.noise || join(HERE, "noise.json");
const noise = json(noiseFile);

// [label, getter, direction (+1 higher is better, -1 lower is better), digits]
const FRAME = [
  ["fps", (r) => r.k10?.fps, 1, 1], ["p50 ms", (r) => r.k10?.p50, -1, 1], ["p95 ms", (r) => r.k10?.p95, -1, 1],
  ["longest frame ms", (r) => r.k10?.max, -1, 1], ["frames over 25 ms", (r) => r.k10?.over25, -1, 0],
  ["render ms", (r) => r.render?.median, -1, 2], ["asleep (share)", (r) => (r.asleep ? 1 : 0), 1, 2], ["slept after s", (r) => r.sleptAtS, -1, 1],
];
const LOAD = [
  ["fps", (r) => r.fps, 1, 1], ["frames", (r) => r.frames, 1, 0], ["frames over 50 ms", (r) => r.over50, -1, 0],
  ["longest frame ms", (r) => r.max, -1, 1], ["p95 ms", (r) => r.p95, -1, 1], ["time to first frame ms", (r) => r.ttff, -1, 0],
  ["first sleep s", (r) => r.firstSleepS, -1, 1], ["asleep at end (share)", (r) => (r.asleepAtEnd ? 1 : 0), 1, 2],
];
const cells = [
  ...(CFG.moves || [0, 7, 13]).map((m) =>({ id: `fabric@${m}`, moves: m, title: `Fabric mode, ${m} moves, at rest`, pick: (r) => r.cell === "fabric" && r.moves === m, metrics: FRAME })),
  { id: "knot", title: "Knot mode (mf=0), at rest", pick: (r) => r.cell === "knot", metrics: FRAME },
  { id: "load-default", title: "Load (K147), default link ?b.J: a fresh navigation, rAF for the first seconds", pick: (r) => r.cell === "load" && r.link === "default", metrics: LOAD },
  { id: "load-slow", title: "Load (K147), the slow case gs=18", pick: (r) => r.cell === "load" && r.link === "slow", metrics: LOAD },
];

const fmt = (v, d) => (v === null || v === undefined ? "-" : Number(v).toFixed(d));
const sgn = (v, d) => (v === null ? "-" : (v > 0 ? "+" : "") + v.toFixed(d));
const verdictOf = (delta, nz, dir) => {
  if (CFG.aa) return "A/A";
  if (delta === null) return "-";
  if (nz === undefined || nz === null) return delta === 0 ? "same" : "no noise floor";
  return Math.abs(delta) <= nz ? "within noise" : delta * dir > 0 ? "better" : "worse";
};

const L = [];
const vpRow = rows.find((r) => r.vp)?.vp ?? null;
const aaNoise = { from: `${new Date().toISOString().slice(0, 16)}Z, ${CFG.shaA}`, reps: CFG.reps, viewport: vpRow ? `${vpRow[0]}x${vpRow[1]}@${vpRow[2]}` : null, rule: "max(|median head - median base|, largest per-rep |head - base|, one unit of the printed digit)", cells: {} };
const verdicts = { better: 0, worse: 0, within: 0 };
for (const c of cells) {
  const rs = rows.filter(c.pick);
  if (!rs.length) { L.push(`### ${c.title}`, "", "No samples.", ""); continue; }
  const side = (k) => rs.filter((r) => r.build === k);
  const made = c.moves === undefined ? null : median(rs.map((r) => r.made));
  // A frame cell must not time the finish (K155's stars, K140's confetti): flag a fabric sample taken at it.
  const fin = c.moves === undefined ? 0 : rs.filter((r) => r.fab?.solved).length;
  L.push(`### ${c.title}${made !== null && made !== c.moves ? ` (the walk made only ${made} of ${c.moves} moves)` : ""}${fin ? ` (${fin} of ${rs.length} samples were taken at the FINISH: stars and confetti are in the timing; pick lower -Moves)` : ""}`, "", `Samples: base ${side("base").length}, head ${side("head").length}.`, "", "| metric | base | head | delta | noise | verdict |", "|---|---|---|---|---|---|");
  for (const [label, get, dir, d] of c.metrics) {
    const bv = median(side("base").map(get)), hv = median(side("head").map(get));
    const delta = bv === null || hv === null ? null : +(hv - bv).toFixed(4);
    let nz = noise?.cells?.[c.id]?.[label];
    if (delta !== null) {
      // The A/A floor: the larger of the medians' difference, the largest single-rep |head - base|, and one unit
      // of the printed digit (a vsync-locked 16.8 vs 16.8 would otherwise make every later 0.1 ms "worse").
      const perRep = [...new Set(rs.map((r) => r.rep))].map((k) => {
        const b = rs.find((r) => r.rep === k && r.build === "base"), h = rs.find((r) => r.rep === k && r.build === "head");
        const x = b ? get(b) : null, y = h ? get(h) : null;
        return typeof x === "number" && typeof y === "number" ? Math.abs(y - x) : 0;
      });
      const floor = +Math.max(Math.abs(delta), ...perRep, 10 ** -d).toFixed(4);
      (aaNoise.cells[c.id] ??= {})[label] = floor;
      if (CFG.aa) nz = floor; // an A/A pass shows the floor it writes
    }
    const v = verdictOf(delta, nz, dir);
    if (v === "better") verdicts.better++; else if (v === "worse") verdicts.worse++; else if (v === "within noise") verdicts.within++;
    L.push(`| ${label} | ${fmt(bv, d)} | ${fmt(hv, d)} | ${sgn(delta, d)} | ${nz === undefined ? "-" : "+-" + fmt(nz, d)} | ${v} |`);
  }
  L.push("");
}
if (CFG.aa && rows.length) writeFileSync(join(CFG.out, "noise.json"), JSON.stringify(aaNoise, null, 1));

// Looks.
const rep = json(join(CFG.out, "looks_report.json"));
const look = [];
if (rep) {
  look.push("| look | base | head | pairs | sheet | pixel diff (single shots) |", "|---|---|---|---|---|---|");
  for (const l of rep.looks) {
    const st = (k) => { const r = l.runs[k]; return r ? (r.status === "ok" ? "ok" : `${r.status}: ${r.reason}`) : "not run"; };
    const diffs = Object.entries(l.diffs || {}).map(([n, d]) => `${n}: ${d.sizeDiffers ? "size differs" : d.differingPx + " px"}`).join("; ") || "-";
    look.push(`| ${l.name} | ${st("base")} | ${st("head")} | ${(l.order || []).length} | ${l.sheet ?? "-"} | ${diffs} |`);
  }
  look.push("", "Sheets: base on the left (blue bar), head on the right (orange bar); pairs run left to right, then down, in the order the report lists (`looks_report.json`, field `order`).");
  const evals = [];
  for (const l of rep.looks) for (const k of ["base", "head"]) for (const s of l.runs[k]?.steps ?? []) {
    if (s.op === "eval" && s.result !== null && s.result !== undefined) evals.push(`- ${l.name} (${k}) ${s.name ?? "eval"}: \`${JSON.stringify(s.result)}\``);
  }
  if (evals.length) look.push("", "Eval results (page-side measurements the looks kept):", ...evals);
  if (rep.errors?.length) look.push("", `Page errors: ${rep.errors.slice(0, 3).join(" | ")}`);
} else look.push("No looks report (the looks phase has not run).");

// Watchdog and thermals.
const trip = text(join(CFG.out, "state", "watchdog.trip"));
const wlog = (text(join(CFG.out, "state", "watchdog.log")) || "").trim().split("\n").filter(Boolean);
const wd = CFG.dry ? "dry run: no phone, no watchdog" : trip ? `TRIPPED: ${trip.trim()}` : existsSync(join(CFG.out, "tripped")) ? "no trip now; an earlier attempt tripped (see `tripped/`)" : wlog.length ? `no trip (log: ${wlog.length} lines, last: ${wlog.at(-1)})` : "no trip, no watchdog log";
// The page's viewport (CSS px x CSS px @ dpr): from the bench rows, else the looks report. A noise floor is for one viewport.
const vpArr = rows.find((r) => r.vp)?.vp ?? rep?.viewport ?? null;
const vpText = vpArr ? `${vpArr[0]}x${vpArr[1]} @${vpArr[2]}${vpArr[0] > vpArr[1] ? " (landscape)" : " (portrait)"}` : "unknown";
const vpNote = noise?.viewport && vpArr && noise.viewport !== `${vpArr[0]}x${vpArr[1]}@${vpArr[2]}` ? ` **The noise floor was taken at ${noise.viewport}: it may not apply here.**` : "";
const th = rows.map((r) => r.thermal).filter((t) => t && !t.error);
const thLine = (t) => (t ? `status ${t.status}, ${t.temps.join(", ")}` : "-");

const head = [
  `# Phone pass: ${CFG.refA} (${CFG.shaA}) vs ${CFG.refB} (${CFG.shaB})`,
  "",
  CFG.dry ? "**DRY RUN on the desktop: this checks the plumbing, not timings. Do not read these numbers as measurements.**" : null,
  CFG.aa ? `**A/A pass** (one build, both ports): the deltas below are the noise floor, ${CFG.reps} rep(s) (a single rep is one |difference| per cell, a weak floor). Written to \`noise.json\` in this folder.` : `Noise floor: \`${noise ? noiseFile : "none found"}\`${noise ? ` (${noise.from}, ${noise.reps} rep(s) of A/A)` : ""}.`,
  `Reps: ${CFG.reps}. Medians over the reps. Verdicts: ${verdicts.better} better, ${verdicts.worse} worse, ${verdicts.within} within noise.`,
  `Watchdog: ${wd}`,
  `Viewport: ${vpText}.${vpNote}`,
  `Thermal at start / end: ${thLine(th[0])} / ${thLine(th.at(-1))}`,
  "",
  "## Frames and load",
  "",
].filter((x) => x !== null);
writeFileSync(join(CFG.out, "summary.md"), [...head, ...L, "## Looks", "", ...look, ""].join("\n"));
console.log(`summary: ${join(CFG.out, "summary.md")} (${rows.length} bench rows, ${rep ? rep.looks.length : 0} looks)`);
