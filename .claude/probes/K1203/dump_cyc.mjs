// K1139 S4: a stand's declared pulses (lib.mjs dumpPulses, plus the raw
// PulseArm records so S4's two-ended fields show) and its pulse bands
// (__knotPulseBands), after the stand's moves (stands_cyc.mjs).
// S4b: plus `ext`, each band's record as the fans read it (uJData): the
// tau range of its centerline (tauLo on the A arm, tauHi on the B arm,
// the band's reach), R2.w (the signed ridge, 0 on S4) and fillHalf, so
// table_cyc.mjs can compare the band with the ribbon over its extent. It
// reads junction_field.ts's recordData() (no texture readback).
//   node dump_cyc.mjs <outDir> <stand>...      (K1139_HOST picks the server)
// PROBE GOTCHA (S4, corrected in S4b): dumpPulses import()s
// /src/render/paint_math.ts and paint_model.ts inside the page, so it
// needs a Vite DEV server whose module instances are the app's. After a
// source edit under a running dev server, the HMR reload re-serves those
// files with a `?t=` stamp; the probe's plain-URL import then gets a
// second, empty instance and every arm reads world 0 (S4's db/ dumps).
// Dump from a dev server started AFTER the last edit (and edit nothing
// while it runs). A `vite preview` build cannot run it at all: it has no
// /src modules, so the first import() fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const [, , OUTARG, ...NAMES] = process.argv;
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
try {
  for (const name of NAMES) {
    const st = STANDS[name];
    if (!st) throw new Error(`stand ${name}?`);
    const log = [];
    const page = await openPage(browser, linkOf(st), log);
    await waitAsleep(page);
    await viewStill(page);
    for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`${name}: move e${eid} refused`);
    await sleep(300);
    const decl = await dumpPulses(page);
    const extra = await page.evaluate(() => ({
      raw: window.__knotRenderer().paintState.paintPulses.map((p) => ({ ...p })),
      bands: window.__knotPulseBands(),
      head: window.__knotFabric().head,
    }));
    // S4b: each band's record (joinery.ts PULSE BLOCKS): find the joint
    // whose arms hold the band's two arms (chain, slot = ctrl, dir), walk
    // its route blocks to the pulse count texel, then match the band by
    // its arm indices and distJ.
    // The records' CPU copy is junction_field.ts's module-level
    // recordData() (the uJData texture's mirror), so this import needs the
    // same fresh dev server as dumpPulses (the gotcha above).
    extra.ext = await page.evaluate(async () => {
      const r = window.__knotRenderer(), fp = r.fieldProbe;
      const fillHalf = r.style.threadWidth / 2;
      let D = null;
      try {
        D = (await import("/src/render/junction_field.ts")).recordData().data;
      } catch (e) {
        return { fillHalf, err: `recordData import: ${e.message}`, bands: [] };
      }
      if (!D || !(D.length > 0)) return { fillHalf, err: "recordData() is empty", bands: [] };
      const recs = [];
      for (let ji = 0; ji < 8192; ji++) {
        const rb = fp.record(ji);
        if (rb >= 0) recs.push({ ji, rb, arms: fp.arms(ji) });
      }
      const armIx = (arms, x) => arms.findIndex((a) => a.chain === x.chain && a.slot === x.ctrl && a.dir === x.dir);
      const bands = window.__knotPulseBands().map((b) => {
        for (const rc of recs) {
          const iA = armIx(rc.arms, b.a), iB = armIx(rc.arms, b.b);
          if (iA < 0 || iB < 0) continue;
          let cur = D[rc.rb * 4 + 3];
          const nr = D[rc.rb * 4 + 7];
          for (let k = 0; k < nr; k++) cur += 1 + D[cur * 4];
          const np = D[cur * 4];
          cur += 1;
          for (let k = 0; k < np; k++) {
            const o = cur * 4, nv = D[o];
            if (D[o + 2] === iA && D[o + 3] === iB && Math.abs(D[o + 4] - b.distJ) < 1e-3) {
              let lo = Infinity, hi = -Infinity;
              for (let v = 0; v < nv; v++) { const t = D[o + 18 + v * 4]; lo = Math.min(lo, t); hi = Math.max(hi, t); }
              return { ji: rc.ji, iA, iB, nv, m: D[o + 1], flags: D[o + 5], tauLo: lo, tauHi: hi, r2w: D[o + 11], r3w: D[o + 15] };
            }
            cur += 4 + nv;
          }
        }
        return null;
      });
      return { fillHalf, bands };
    });
    writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ stand: name, decl, ...extra }, null, 1));
    console.log(`${name}: head ${extra.head}, ${extra.raw.length} pulse(s), ${extra.bands.length} band(s)`);
    for (const p of decl.pulses) {
      const r = extra.raw.find((q) => q.chain === p.chain && q.cJunction === p.cJ && q.cFar === p.cF) || {};
      const two = r.two ? ` TWO dB ${(+r.dB).toFixed(3)} inwB ${!!r.inwardB}` : "";
      console.log(`  e${p.edge} ${p.near}->${p.far} dist0 ${p.dist0.toFixed(3)} world ${p.world.toFixed(3)} lat ${p.lattice.toFixed(3)} ${p.inward ? "in" : "out"}${p.cont ? " cont" : ""}${two}`);
    }
    extra.bands.forEach((b, i) => {
      const x = extra.ext.bands[i];
      const rec = x ? ` tau ${x.tauLo.toFixed(3)}..${x.tauHi.toFixed(3)} R2.w ${x.r2w.toFixed(3)}` : " (no record)";
      console.log(`  band ${b.vertex}: e${b.aEdge} -> e${b.bEdge} distJ ${b.distJ.toFixed(3)} ${b.inward ? "in" : "out"} slot ${b.slot}${b.fallback ? " FALLBACK" : ""}${rec}`);
    });
    if (extra.ext.err) console.log(`  ext: ${extra.ext.err}`);
    const errs = log.filter((l) => l.includes("pageerror"));
    if (errs.length) console.log("  pageerrors:", errs.join(" | "));
    await page.close();
  }
} finally {
  await browser.close();
}
