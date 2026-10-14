// K90 fold census: the job list and the report (scripts/fold_census.ts).
//   node scripts/fold_census.mjs jobs <jobs.json>     the stage-1a job list
//   node scripts/fold_census.mjs report <out.jsonl>   markdown tables
// Jobs: 8 seeds x 4 maze sets and the same 4 in knot mode, 3 shapes x 4
// seeds, and three standing links. HEAVY jobs (2 seeds per set, 1 per
// shape, the links) also run the gesture battery and the violent drags.
import { readFileSync, writeFileSync } from "node:fs";

const [, , mode, path] = process.argv;
const SEEDS = ["1471kin", "2b5fq1", "1q2w3e", "3zz2a1", "k88dtb", "9xk2m0", "7h7h7h", "5kinky"];
const TAIL = "&am=instant&snd=none";
const FAT = "&rep=.4&bd=1.75&sm=.7&tw=.52";
const SETS = {
  def: "",
  fat: FAT,
  thin: "&tw=.3",
  t64: "&tw=.64",
  kdef: "&mf=0",
  kfat: `&mf=0${FAT}`,
  kthin: "&mf=0&tw=.3",
  kt64: "&mf=0&tw=.64",
};
const SHAPES = { star24: "&shp=star&gs=24", tree22: "&shp=tree&gs=22", ring20: "&shp=ring&gs=20" };
// The KINK EYES / K41 / K63 standing links (legacy links read the frozen v1
// defaults). The P3.31-34 "user link" is not spelled out anywhere; these
// stand in for it.
const LINKS = {
  link_user_rect:
    "?s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=2.4&fl=0&fw=.25&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1",
  link_user_k88dtb: "?k88dtb.oHFEfg",
  link_fat_knot: `?s=p9ar6&mf=0${FAT}`,
};

if (mode === "jobs") {
  const jobs = [];
  for (const [set, extra] of Object.entries(SETS)) {
    SEEDS.forEach((s, i) => jobs.push({ id: `${set}_${s}`, set, query: `?${s}.J${extra}${TAIL}`, heavy: i < 2 }));
  }
  for (const [set, extra] of Object.entries(SHAPES)) {
    SEEDS.slice(0, 4).forEach((s, i) =>
      jobs.push({ id: `${set}_${s}`, set, query: `?${s}.J${extra}${TAIL}`, heavy: i < 1 })
    );
  }
  for (const [id, q] of Object.entries(LINKS)) jobs.push({ id, set: "links", query: q + TAIL, heavy: true });
  // Heavy jobs first: they take longest, so the pool drains evenly.
  jobs.sort((a, b) => Number(b.heavy) - Number(a.heavy));
  writeFileSync(path, JSON.stringify(jobs, null, 1));
  console.log(`${jobs.length} jobs (${jobs.filter((j) => j.heavy).length} heavy) -> ${path}`);
  process.exit(0);
}
if (mode !== "report") {
  console.error("usage: fold_census.mjs jobs <jobs.json> | report <out.jsonl>");
  process.exit(1);
}

const rows = readFileSync(path, "utf-8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l.replace(/^﻿/, "")));
const order = [...Object.keys(SETS), ...Object.keys(SHAPES), "links"];
const bySet = new Map(order.map((s) => [s, rows.filter((r) => r.set === s)]));
const HOLDERS = ["grab", "jhost", "jtip", "tip", "kink", "crossing", "collision", "free"];
const sum = (a) => a.reduce((x, y) => x + y, 0);
const med = (a) => {
  const s = a.filter((v) => v !== null && v !== undefined).sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};
const minOf = (a) => {
  const s = a.filter((v) => v !== null && v !== undefined);
  return s.length ? Math.min(...s) : null;
};
const f2 = (v) => (v === null || v === undefined ? "-" : typeof v === "number" ? +v.toFixed(2) : v);
const out = [];
const line = (s = "") => out.push(s);
const table = (head, body) => {
  line(`| ${head.join(" | ")} |`);
  line(`|${head.map(() => "---").join("|")}|`);
  for (const b of body) line(`| ${b.map(f2).join(" | ")} |`);
  line();
};

line(`# K90 fold census (${rows.length} jobs)`);
line();
line("w1 / w115 = windows of consecutive ribbon samples whose turn radius is below 1.0 / 1.15 half-widths;");
line("n1 = samples below 1.0; min = the tightest sample in half-widths. Sums over the set's jobs.");
line();

// 1. Fresh settles.
line("## Fresh settle");
line();
const cpKeys = ["0.5", "1", "2", "3", "5", "8"];
table(
  ["set", "jobs", "sleep s med/max (never)", "rest w1 (jobs)", "rest w115", "rest n1", "rest min", "worst w1 (max) @ t med", ...cpKeys.map((k) => `w1 @${k}s`)],
  order
    .filter((s) => bySet.get(s).length)
    .map((s) => {
      const R = bySet.get(s);
      const sl = R.map((r) => r.fresh.sleepT);
      return [
        s,
        R.length,
        `${f2(med(sl))}/${f2(Math.max(...sl.filter((v) => v !== null), 0))} (${sl.filter((v) => v === null).length})`,
        `${sum(R.map((r) => r.fresh.rest.w1))} (${R.filter((r) => r.fresh.rest.w1 > 0).length})`,
        sum(R.map((r) => r.fresh.rest.w115)),
        sum(R.map((r) => r.fresh.rest.n1)),
        minOf(R.map((r) => r.fresh.rest.min)),
        `${sum(R.map((r) => r.fresh.worst?.w1 ?? 0))} (${Math.max(...R.map((r) => r.fresh.worst?.w1 ?? 0))}) @ ${f2(med(R.map((r) => r.fresh.worst?.t ?? null)))}`,
        ...cpKeys.map((k) => sum(R.map((r) => r.fresh.cps?.[k]?.w1 ?? 0))),
      ];
    })
);

// 2. Who holds the folds: class x holder over the attributed windows.
const states = {
  "fresh rest": (r) => [r.fresh.rest],
  "fresh worst": (r) => [r.fresh.worst],
  "gesture held (worst)": (r) => (r.gestures ?? []).map((g) => g.held),
  "gesture end of hold": (r) => (r.gestures ?? []).map((g) => g.end),
  "gesture re-slept": (r) => (r.gestures ?? []).map((g) => g.rest),
  "violent held (worst)": (r) => (r.violent ?? []).map((v) => v.held),
  "violent re-slept": (r) => (r.violent ?? []).map((v) => v.rest),
};
line("## Class x holder");
line();
line("Class: **floor** = the particle polyline within 1.5 ctrl is itself under 1.15 half-widths");
line("(applyTurnRadiusFloor lost); **spline** = the particles honor the floor and the Catmull-Rom");
line("still turns tighter. Holder priority: grab > jhost/jtip (a fused junction: host thread / bridge tip)");
line("> tip (unfused open end) > kink > crossing > collision > free.");
line("Counts cover the worst 300 windows per census (`feat` vs `w115` shows any truncation).");
line();
for (const key of ["agg1", "agg115"]) {
  line(`### Windows reaching below ${key === "agg1" ? "1.0" : "1.15"}`);
  line();
  const body = [];
  for (const [name, pick] of Object.entries(states)) {
    const sums = order.map(() => 0);
    const acc = { floor: Object.fromEntries(HOLDERS.map((h) => [h, 0])), spline: Object.fromEntries(HOLDERS.map((h) => [h, 0])) };
    let censuses = 0;
    let feat = 0;
    let w115 = 0;
    const wq = [0, 0, 0, 0];
    for (const r of rows) {
      for (const c of pick(r)) {
        if (!c) continue;
        censuses++;
        feat += c.featured;
        w115 += c.w115;
        c.wq.forEach((v, i) => (wq[i] += v));
        for (const cls of ["floor", "spline"]) for (const h of HOLDERS) acc[cls][h] += c[key][cls][h];
      }
    }
    void sums;
    if (!censuses) continue;
    const fl = sum(HOLDERS.map((h) => acc.floor[h]));
    const sp = sum(HOLDERS.map((h) => acc.spline[h]));
    body.push([
      name,
      censuses,
      `${feat}/${w115}`,
      key === "agg115" ? wq.join("/") : "",
      `${fl}/${sp}`,
      ...HOLDERS.map((h) => `${acc.floor[h]}/${acc.spline[h]}`),
    ]);
  }
  table(["state", "censuses", "feat/w115", "depth <.5/<.75/<1/<1.15", "floor/spline", ...HOLDERS], body);
}

// 2b. The same split by mode (knot mode has no junctions), with the in-situ
// spline overshoot: r / poly over the spline-class windows among the 40
// tightest of each fresh rest.
const isKnot = (r) => r.set.startsWith("k") || /_knot$/.test(r.id);
const quant = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))] : null);
line("### Below 1.0 by mode");
line();
line("r/poly = the ribbon's radius over the particle polyline's (spline class, the 40 tightest windows per fresh rest).");
line();
const modeBody = [];
for (const [mode, pickRows] of [["knot", isKnot], ["maze", (r) => !isKnot(r)]]) {
  for (const name of ["fresh rest", "gesture re-slept", "violent re-slept"]) {
    const acc = { floor: {}, spline: {} };
    let n = 0;
    for (const r of rows.filter(pickRows))
      for (const c of states[name](r)) {
        if (!c) continue;
        n++;
        for (const cls of ["floor", "spline"]) for (const h of HOLDERS) acc[cls][h] = (acc[cls][h] ?? 0) + c.agg1[cls][h];
      }
    if (!n) continue;
    const tot = sum(HOLDERS.map((h) => acc.floor[h] + acc.spline[h]));
    const top =
      name === "fresh rest"
        ? rows.filter(pickRows).flatMap((r) => r.fresh.rest.top ?? []).filter((w) => w.r < 1 && w.cls === "spline")
        : [];
    const ratio = top.map((w) => w.r / w.poly);
    const poly = top.map((w) => w.poly);
    const q3 = (a) => (a.length ? [0.1, 0.5, 0.9].map((p) => f2(quant(a, p))).join("/") : "");
    modeBody.push([
      mode,
      name,
      n,
      tot,
      (tot / n).toFixed(1),
      `${sum(HOLDERS.map((h) => acc.floor[h]))}/${sum(HOLDERS.map((h) => acc.spline[h]))}`,
      HOLDERS.filter((h) => acc.floor[h] + acc.spline[h])
        .map((h) => `${h} ${Math.round((100 * (acc.floor[h] + acc.spline[h])) / tot)}%`)
        .join(", "),
      q3(ratio),
      q3(poly),
    ]);
  }
}
table(["mode", "state", "censuses", "w<1", "per census", "floor/spline", "holders", "r/poly p10/p50/p90", "poly p10/p50/p90"], modeBody);

// 3. Per heavy job: the gestures and the violent drags.
const heavy = rows.filter((r) => r.gestures);
if (heavy.length) {
  line("## Gestures (per job: worst held, after re-sleep)");
  line();
  table(
    ["job", "gestures", "held w1 max", "held min", "end-of-hold w1 sum", "re-slept w1 sum", "re-slept min", "re-sleep s max (never)", "holes before -> after (min/p50/<0.8)"],
    heavy.map((r) => {
      const G = r.gestures.filter((g) => g.grabbed);
      const rs = G.map((g) => g.resleep);
      const h0 = r.fresh.holes;
      const h1 = r.afterGestures.holes;
      return [
        r.id,
        `${G.length}/${r.gestures.length}`,
        Math.max(0, ...G.map((g) => g.held?.w1 ?? 0)),
        minOf(G.map((g) => g.held?.min ?? null)),
        sum(G.map((g) => g.end.w1)),
        sum(G.map((g) => g.rest.w1)),
        minOf(G.map((g) => g.rest.min)),
        `${f2(Math.max(0, ...rs.filter((v) => v !== null)))} (${rs.filter((v) => v === null).length})`,
        `${h0 ? `${h0.min}/${h0.p50}/${h0.below08}` : "-"} -> ${h1 ? `${h1.min}/${h1.p50}/${h1.below08}` : "-"}`,
      ];
    })
  );
  line("By gesture kind (sums over heavy jobs):");
  line();
  const kinds = ["hold", "pull", "cinch", "mid_pull"];
  table(
    ["kind", "n", "held w1", "held min", "end w1", "re-slept w1", "never re-slept"],
    kinds.map((k) => {
      const G = heavy.flatMap((r) => r.gestures.filter((g) => g.grabbed && (k === "mid_pull" ? g.label === k : g.label.endsWith(`_${k}`))));
      return [
        k,
        G.length,
        sum(G.map((g) => g.held?.w1 ?? 0)),
        minOf(G.map((g) => g.held?.min ?? null)),
        sum(G.map((g) => g.end.w1)),
        sum(G.map((g) => g.rest.w1)),
        G.filter((g) => g.resleep === null).length,
      ];
    })
  );
  line("## Violent drags (quiescence dragSession, after the gestures)");
  line();
  table(
    ["job", "radius", "held w1", "held min", "re-slept w1", "re-slept w115", "re-slept min", "sleep s", "holes (min/p50/<0.8)"],
    heavy.flatMap((r) =>
      r.violent.map((v) => [
        r.id,
        v.radius,
        v.held?.w1 ?? 0,
        v.held?.min ?? null,
        v.rest.w1,
        v.rest.w115,
        v.rest.min,
        v.sleepT === null ? "never" : v.sleepT,
        v.holes ? `${v.holes.min}/${v.holes.p50}/${v.holes.below08}` : "-",
      ])
    )
  );
}

// 4. The tightest windows at rest.
line("## Tightest windows at rest (fresh, after gestures, after violent drags)");
line();
const tops = [];
for (const r of rows) {
  for (const w of r.fresh.rest.top) tops.push({ job: r.id, state: "fresh", ...w });
  for (const w of r.afterGestures?.rest.top ?? []) tops.push({ job: r.id, state: "gestured", ...w });
  for (const v of r.violent ?? []) for (const w of v.rest.top) tops.push({ job: r.id, state: `violent${v.radius}`, ...w });
}
tops.sort((a, b) => a.r - b.r);
table(
  ["job", "state", "chain", "r", "samples", "arc", "poly", "class", "holder", "kink", "xd", "self", "fd", "jd", "td"],
  tops.slice(0, 30).map((w) => [w.job, w.state, w.c, w.r, w.n, w.arc, w.poly, w.cls, w.holder, w.kink, w.xd, w.xSelf ? "y" : "", w.fd, w.jd, w.td])
);
line(`Wall: ${f2(sum(rows.map((r) => r.wallS)))} s of job time.`);
console.log(out.join("\n"));
