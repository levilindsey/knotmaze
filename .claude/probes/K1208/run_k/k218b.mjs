// K1208 Run K - K218 v2: find a cap that actually draws (paint_state.ts
// drops caps at routed junctions), then profile p across its edge on the
// GPU (debug view 5, R = p) along its arm, plus the mirror at the centre.
//   node k218b.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, PIN, setState, frames, sleep, stampText, moveEdge } from "./lib.mjs";
import { decode, upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "k111&am=instant&fw=0&snd=none&phw=0&pv=trail&trl=5";
const MOVES = [0, 246, 82, 83, 199, 150, 151, 38, 155, 211];
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of MOVES) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await waitAsleep(page);
  await page.evaluate(PIN);
  await sleep(200);
  const scan = await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData(), U = MD.knotUniformValues();
    const r = window.__knotRenderer();
    const S = r.paintState;
    const out = { p: 0, band: false, v: 0, rim: 0, tele: 0 };
    const rows = [];
    for (const cap of S.paintCaps) {
      const c = PM.kChain(D, cap.chain);
      if (!c) continue;
      const a0 = PM.kArcOfCtrl(D, c, cap.ctrl);
      const at = (d) => { PM.kPaintAt(D, U, c, PM.kCtrlOfArc(D, c, a0 + d), a0 + d, 0.01, out, true); return +out.p.toFixed(4); };
      rows.push({
        chain: cap.chain, ctrl: cap.ctrl, radius: cap.radius, p: +cap.p.toFixed(4),
        inP: at(0.15), inN: at(-0.15), outP: at(0.45), outN: at(-0.45), ctr: at(0),
      });
    }
    return { caps: rows, routed: S.routedArms ? S.routedArms.size : -1 };
  });
  console.log(`declared caps ${scan.caps.length} routedArms ${scan.routed}`);
  for (const c of scan.caps) console.log(`  chain${c.chain} ctrl${c.ctrl} p=${c.p} r=${c.radius.toFixed(3)} ctr=${c.ctr} in ${c.inP}/${c.inN} out ${c.outP}/${c.outN}`);
  // A cap draws where inside p approaches its own p while outside differs.
  const drawing = scan.caps.filter((c) => Math.abs(c.ctr - c.p) < 0.2 || Math.abs(c.inP - c.p) < 0.25 || Math.abs(c.inN - c.p) < 0.25);
  console.log(`drawing caps: ${drawing.length}`);
  writeFileSync(join(OUT, "k218b.json"), JSON.stringify({ q: Q, moves: MOVES, scan }, null, 1));
  await page.close();
} finally { await browser.close(); }
console.log("wrote k218b.json");
