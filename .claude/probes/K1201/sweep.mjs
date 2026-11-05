// K1201 (20E task 1): the head-position sweep for S4b's joint step.
// Copies of the K1139 kit stand verbatim (stands_cyc.mjs): cyc (k111,
// head node_221, two-ended e210) and loop (seed 1 &pr=8, head node_635,
// self-loop e102). Candidate heads are EVERY non-end vertex where the
// target arm is two-ended, first enumerated in the page with pulse_path's
// pulseTree (no gate, so the set is an upper bound; the renderer's gate
// can only remove heads), then each candidate is reached physically:
// stand moves verbatim plus the fewest-edges walk route from the stand
// head to the candidate (named per head in the output), and the declared
// items are dumped there (__knotPulses + lib.mjs dumpPulses, on a dev
// server started after the last source edit, per dump_cyc's gotcha).
// Per two-ended arm: xR at each end = (dA+dB+W)/2 - dEnd, joint ridge
// factor min(1,|xR|/0.5); predicted step interpolated from ridge_joint.ts.
//   node sweep.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const TARGET = { cyc: 210, loop: 102 };
// ridge_joint.ts (dA 5, W 2.5, spacing 2.5): xR -> max joint step.
const PRED = [[0, 0.90], [0.03, 0.846], [0.1, 0.72], [0.2, 0.54], [0.3, 0.36], [0.4, 0.18], [0.5, 0]];
const predStep = (xr) => {
  const a = Math.abs(xr);
  if (xr < 0) return a <= 0.5 ? 0.90 : 0.63; // ridge_joint item 4 rows
  for (let i = 0; i < PRED.length - 1; i++) {
    const [x0, y0] = PRED[i], [x1, y1] = PRED[i + 1];
    if (a >= x0 && a <= x1) return y0 + ((y1 - y0) * (a - x0)) / (x1 - x0);
  }
  return 0;
};

async function loadStand(browser, name) {
  const st = STANDS[name], log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${name}: stand move e${eid} refused`);
  await sleep(300);
  return { page, log };
}

// In page: candidate heads (pulseTree, no gate) + fewest-edges routes.
async function candidates(page, target) {
  return page.evaluate(async (target) => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const PP = await import("/src/render/pulse_path.ts");
    const D = MD.kData();
    const fb = window.__knotFabricRenderer(), W = fb.walk, k = window.__knotFabric(), r = window.__knotRenderer();
    const spanOf = (eid) => { const e = W.edges[eid]; const c = PM.kChain(D, e.chain); return c.closed ? Math.abs(PM.kArcU(D, c, e.ctrlB) - PM.kArcU(D, c, e.ctrlA)) : Math.abs(PM.kArcOfCtrl(D, c, e.ctrlB) - PM.kArcOfCtrl(D, c, e.ctrlA)); };
    const heads = [];
    let standable = 0;
    for (const v of W.vertices.keys()) {
      if (W.vertices.get(v).isEnd) continue;
      standable++;
      const { items } = PP.pulseTree(W, v, -1, r.pulseReach, spanOf);
      const t = items.find((i) => i.edge === target && i.two);
      if (t) heads.push(v);
    }
    const route = (to) => {
      const prev = new Map([[k.head, null]]), q = [k.head];
      while (q.length) { const v = q.shift(); if (v === to) break; for (const eid of W.vertices.get(v).edges) { const e = W.edges[eid]; if (e.chain < 0) continue; const w = e.va === v ? e.vb : e.va; if (!prev.has(w)) { prev.set(w, [v, eid]); q.push(w); } } }
      const out = []; let v = to; while (prev.get(v)) { const [u, eid] = prev.get(v); out.unshift(eid); v = u; } return out;
    };
    return { standHead: k.head, reach: r.pulseReach, standable, heads: heads.map((h) => ({ head: h, ext: route(h) })) };
  }, target);
}

const browser = await openBrowser();
const summary = {};
try {
  for (const name of ["cyc", "loop"]) {
    const target = TARGET[name];
    // First load: enumerate candidates from the stand head.
    const first = await loadStand(browser, name);
    const cand = await candidates(first.page, target);
    await first.page.close();
    console.log(`${name}: stand head ${cand.standHead}, reach ${cand.reach}, ${cand.standable} standable vertices, ${cand.heads.length} candidate head(s) for e${target}: ${cand.heads.map((c) => `${c.head} via [${cand && ""}${c.ext.join(",")}]`).join("; ")}`);
    const rows = [];
    for (const c of cand.heads) {
      const { page, log } = await loadStand(browser, name);
      for (const eid of c.ext) if (!(await moveEdge(page, eid))) throw new Error(`${name}->${c.head}: move e${eid} refused`);
      await sleep(300);
      const items = await page.evaluate(() => window.__knotPulses());
      const decl = await dumpPulses(page);
      const headNow = await page.evaluate(() => window.__knotFabric().head);
      const twos = items.filter((i) => i.two).map((i) => {
        const gR = (i.dist0 + i.dB + i.span) / 2;
        const xRa = gR - i.dist0, xRb = gR - i.dB;
        return { edge: i.edge, near: i.near, far: i.far, W: +i.span.toFixed(3), dA: i.dist0, dB: i.dB, gR: +gR.toFixed(3),
          xRa: +xRa.toFixed(3), xRb: +xRb.toFixed(3), facA: +Math.min(1, Math.abs(xRa) / 0.5).toFixed(3), facB: +Math.min(1, Math.abs(xRb) / 0.5).toFixed(3),
          predA: +predStep(xRa).toFixed(3), predB: +predStep(xRb).toFixed(3) };
      });
      const tgt = twos.find((t) => t.edge === target) || null;
      rows.push({ stand: name, head: headNow, wanted: c.head, moves: [...STANDS[name].moves, ...c.ext], ext: c.ext, twos, target: tgt,
        dumpHead: decl.head, dumpTwos: decl.pulses.length, ctxLost: await page.evaluate(() => window.__ctxLost), pageErrors: log.filter((l) => l.includes("pageerror")) });
      console.log(`${name} head ${headNow} (moves stand+[${c.ext.join(",")}]): two-ended ${twos.map((t) => `e${t.edge} xR ${t.xRa}/${t.xRb}`).join(", ") || "none"}`);
      await page.close();
    }
    const ends = rows.flatMap((r) => r.twos.flatMap((t) => [{ head: r.head, edge: t.edge, end: "A", xR: t.xRa }, { head: r.head, edge: t.edge, end: "B", xR: t.xRb }]));
    const tgtEnds = rows.flatMap((r) => (r.target ? [{ head: r.head, xR: r.target.xRa }, { head: r.head, xR: r.target.xRb }] : []));
    const minAbs = (a) => (a.length ? Math.min(...a.map((e) => Math.abs(e.xR))) : null);
    summary[name] = { target, standHead: cand.standHead, reach: cand.reach, standable: cand.standable, headsTried: rows.length,
      headsItem3: rows.filter((r) => r.twos.some((t) => (t.xRa >= 0 && t.xRa < 0.5) || (t.xRb >= 0 && t.xRb < 0.5))).length,
      headsItem4: rows.filter((r) => r.twos.some((t) => t.xRa < 0 || t.xRb < 0)).length,
      minAbsXR: minAbs(ends), minAbsTargetXR: minAbs(tgtEnds),
      predAtMin: minAbs(ends) === null ? null : +predStep(ends.reduce((m, e) => (Math.abs(e.xR) < Math.abs(m.xR) ? e : m)).xR).toFixed(3), rows };
  }
} finally { await browser.close(); }
writeFileSync(join(OUT, "sweep.json"), JSON.stringify(summary, null, 1));
const lines = [];
for (const name of ["cyc", "loop"]) {
  const s = summary[name];
  lines.push(`${name} (target e${s.target}, stand head ${s.standHead}, reach ${s.reach}, ${s.standable} standable vertices enumerated): heads tried ${s.headsTried}, item3 heads (0<=xR<0.5) ${s.headsItem3}, item4 heads (xR<0) ${s.headsItem4}, smallest |xR| ${s.minAbsXR} (target ${s.minAbsTargetXR}), predicted step at it ${s.predAtMin}`);
  for (const r of s.rows) lines.push(`  head ${r.head} moves [${r.moves.join(",")}]: ${r.twos.map((t) => `e${t.edge} ${t.near}->${t.far} W ${t.W} dA ${t.dA} dB ${t.dB} gR ${t.gR} xR A ${t.xRa} (fac ${t.facA}, pred ${t.predA}) B ${t.xRb} (fac ${t.facB}, pred ${t.predB})`).join("; ") || "no two-ended arm"}`);
}
writeFileSync(join(OUT, "sweep.txt"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
