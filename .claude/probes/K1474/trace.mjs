// K1474 trace: dump the live look source (kd, kcv, chainSamples, uniforms) at a frozen gf state, plus the
// paint mirror's section colours at the sample nearest a CSS pixel. Node side (trace.ts) rebuilds
// GfLookTable from the dump and compares knotSection / kSectionAtArc / lookColour at that sample.
//   node .claude/probes/K1474/trace.mjs <base> <profileDir> <out.json> [cssX cssY] [Q]
import { writeFileSync } from "node:fs";
import { launch, load } from "../K1460/cap.mjs";
const [, , base, profileDir, outJson, xs = "866", ys = "138", Q = "3"] = process.argv;
const cssX = +xs, cssY = +ys;
const url = `${base}/?${Q}&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=0.5&rp=gf`;
const browser = await launch(profileDir);
try {
  const r = await load(browser, url, { tag: "trace", gf: true, simT: 20, dsf: 2 });
  console.log(`hash ${r.hash} ok=${r.ok}`);
  const dump = await r.page.evaluate((px) => {
    const view = window.__knotView();
    const w = [(px[0] - view.x) / view.s, (px[1] - view.y) / view.s];
    const R = window.__knotRenderer();
    const M = R.paintState.paintMirror();
    let best = null;
    const samples = R.chainSamples.map((s, c) => {
      if (!s) return null;
      const P = s.positions;
      for (let k = 0; k < s.count; k++) {
        const dx = P[2 * k] - w[0], dy = P[2 * k + 1] - w[1];
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) best = { c, k, d2, x: P[2 * k], y: P[2 * k + 1] };
      }
      return { count: s.count, positions: Array.from(P) };
    });
    const ch = M.chain(best.c);
    const arc = best.k * ch.arcPer;
    const out = {
      world: w, view, best: { ...best, d: Math.sqrt(best.d2) },
      uniforms: M.uniforms,
      stat: Array.from(M.data.stat), geom: Array.from(M.data.geom),
      chains: R.kcv.map((c) => ({ ch: c.ch, nCtrl: c.nCtrl, closed: c.closed, count: c.count, idx: c.idx, geom: c.geom, total: c.total, arcPer: c.arcPer })),
      samples,
      mirror: {
        chain: ch, arc,
        ctrl: M.ctrlOfArc(best.c, arc),
        sectionAt: M.sectionAt(best.c, arc),
        sectionExact: M.sectionExact(best.c, arc),
        sectionAtCtrlK: M.sectionAtCtrl(best.c, M.ctrlOfArc(best.c, arc)),
      },
    };
    return out;
  }, [cssX, cssY]);
  writeFileSync(outJson, JSON.stringify(dump));
  console.log(JSON.stringify({ world: dump.world, best: dump.best, mirror: dump.mirror, statLen: dump.stat.length, geomLen: dump.geom.length }, null, 1));
  await r.page.close();
} finally { await browser.close(); }
