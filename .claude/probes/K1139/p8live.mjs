// K1139 P8 (the real pipeline): debug view 5's G channel at points along
// each declared arm's DRAWN centerline against the CPU mirror's kPulseV
// at the same drawn arc and pinned clock (K299's recipe: two phases,
// t=100 and t=100.45, so a run with no crest at one phase still reads at
// the other). Points are placed by arc (kCtrlOfArc back to a ctrl, then
// the fabric's runPoint for its screen point), at 0.35/0.5/0.65 of each
// arm's span - clear of the fans and the end window - and skipped when
// within 0.35 world of a crossing on that chain (the over thread's
// fragment, not this arm's, is what a pixel there would show).
// Pass: max |G - v*255| <= 2.   node p8live.mjs <stand> [extraLinkKeys]
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep, frames } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const STANDS = {
  fork: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0] },
  cross: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199] },
  src: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 246, 82, 83, 199, 150] },
  four: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176] },
  x4: { q: "k111&am=instant&fw=0&snd=none&phw=0", moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};
const [, , STAND, EXTRA = ""] = process.argv;
const st = STANDS[STAND];
if (!st) throw new Error(`stand ${STAND}?`);
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q + (st.extra || "") + EXTRA, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  // Zoom to the strips' 60 px/world at the head (ctrl+wheel: the pinch
  // path), so a pixel is ~0.01 world and registration is sub-crest.
  {
    const fpt = await page.evaluate(() => window.__knotFabric().vertexScreen(window.__knotFabric().head));
    const pxPerWorld = () => page.evaluate((p) => {
      const k = window.__knotFabric();
      const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
      return 100 / Math.hypot(b.x - a.x, b.y - a.y);
    }, fpt);
    const wheel = async (dy) => {
      await page.mouse.move(fpt.x, fpt.y);
      await page.keyboard.down("Control");
      await page.mouse.wheel({ deltaY: dy });
      await page.keyboard.up("Control");
      await sleep(250);
      await viewStill(page);
    };
    let s0 = await pxPerWorld();
    if (s0 < 60 * 0.97) {
      await wheel(-30);
      const s1 = await pxPerWorld();
      const kEff = Math.log(s1 / s0) / 30;
      if (kEff > 0 && s1 < 60 * 0.97) await wheel(-Math.log(60 / s1) / kEff);
    }
    await page.mouse.move(2, 2);
    await sleep(300);
    await viewStill(page);
  }
  await page.evaluate(PIN);
  let worst = 0, worstAt = "", worstN = 0, worstNAt = "", n = 0, over = 0, skipped = 0;
  for (const t of [100, 100.45]) {
    // Pin the clock first: the uniforms the mirror reads must be t's.
    await setState(page, { t, dbg: 5, webs: true });
    const pts = await page.evaluate(async () => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      const D = MD.kData();
      const r = window.__knotRenderer(), k = window.__knotFabric(), fb = window.__knotFabricRenderer(), W = fb.walk;
      const U = MD.knotUniformValues();
      const phys = window.__knotPhys();
      const emergent = phys.emergentList || [];
      const crossArc = new Map(); // chain -> [arc,...] of its crossings
      for (const c of phys.crossings) {
        for (const s of [c.over, c.under]) {
          const [ch, ct] = s.split(":").map(Number);
          const cc = PM.kChain(D, ch);
          const a = PM.kArcOfCtrl(D, cc, ct);
          if (!crossArc.has(ch)) crossArc.set(ch, []);
          crossArc.get(ch).push(a);
        }
      }
      const out = [];
      let skip = 0;
      const view = window.__knotView();
      const paint = {};
      for (const p of r.paintState.paintPulses) {
        const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
        if (!e) continue;
        const c = PM.kChain(D, p.chain);
        const samples = r.chainSamples[p.chain];
        if (!samples) continue;
        const arcJ = c.closed ? PM.kArcU(D, c, p.cJunction) : PM.kArcOfCtrl(D, c, p.cJunction);
        const arcF = c.closed ? PM.kArcU(D, c, p.cFar) : PM.kArcOfCtrl(D, c, p.cFar);
        const span = Math.abs(arcF - arcJ);
        if (span < 1.3) continue; // inside the fans at both ends (S3's P8 ground)
        const dir = Math.sign(arcF - arcJ) || 1;
        const xs = crossArc.get(p.chain) || [];
        // Sample at crest centers and troughs (phase extrema, where
        // dv/dd = 0): raster interpolation across the mesh moves a
        // slope sample by several 255ths but leaves an extremum's
        // value standing, which is what P8 reads.
        const [tIn, tOut, sp] = U.uKPulse;
        const d0 = p.dist0 ?? 0;
        const ds = [];
        for (let m = -1; m * sp - d0 < span + sp; m++) {
          for (const half of [0, sp / 2]) {
            const d = (p.inward ? m * sp - tIn : tOut + m * sp) + half - d0;
            if (d > 1.05 && d < span - 1.05) ds.push({ d, peak: half === 0 });
          }
        }
        ds.sort((a, b) => Math.abs(a.d - span / 2) - Math.abs(b.d - span / 2));
        for (const { d, peak } of ds.slice(0, 3)) {
          const target = arcJ + dir * d;
          const wrapped = c.closed ? ((target % c.total) + c.total) % c.total : target;
          if (xs.some((a) => Math.abs(a - wrapped) < 0.35)) { skip++; continue; }
          const ctrl = PM.kCtrlOfArc(D, c, wrapped);
          const sArc = r.arcAt(samples, ctrl);
          const si = Math.max(0, Math.min(samples.count - 1, Math.round((sArc / samples.totalLength) * (samples.closed ? samples.count : samples.count - 1))));
          const wx = samples.positions[si * 2], wy = samples.positions[si * 2 + 1];
          if (emergent.some((em) => Math.hypot(em.x - wx, em.y - wy) < 0.35)) { skip++; continue; }
          // A crest inside the reach fade is no extremum of the total
          // field (the fade tilts it): only flat-field crests are read.
          if (peak && PM.kReachWin(U, d0 + d) < 0.999) { skip++; continue; }
          const v = PM.kPaintAt(D, U, c, ctrl, wrapped, 0, paint).v;
          // The centerline trail around the extremum (for the peak /
          // floor read on the node side).
          const trail = [];
          const wp2 = new Float32Array(2);
          for (let dd = -0.12; dd <= 0.1201; dd += 0.008) {
            const t2 = arcJ + dir * (d + dd);
            const w2 = c.closed ? ((t2 % c.total) + c.total) % c.total : t2;
            const c2 = PM.kCtrlOfArc(D, c, w2);
            r.sampleAt(samples, r.arcAt(samples, c2), wp2, 0);
            trail.push([+(wp2[0] * view.s + view.x).toFixed(1), +(wp2[1] * view.s + view.y).toFixed(1)]);
          }
          out.push({ edge: e.id, peak, x: wx * view.s + view.x, y: wy * view.s + view.y, v, trail });
        }
      }
      return { out, skip };
    });
    skipped += pts.skip;
    await frames(page, 2);
    const shot = await page.screenshot({ type: "png" });
    const img = toRGB(decodePNG(Buffer.from(shot)));
    const dsf = 1.5; // lib.mjs openPage viewport
    for (const p of pts.out) {
      // The extremum's read: a crest by the peak of G along the
      // centerline trail around its arc; a trough (a smooth floor)
      // by the trail's center pixel.
      let g, ok = false;
      if (p.peak) {
        g = 0;
        for (const [tx, ty] of p.trail) {
          const x = Math.round(tx * dsf), y = Math.round(ty * dsf);
          if (x < 1 || y < 1 || x >= img.W - 1 || y >= img.H - 1) continue;
          ok = true;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            g = Math.max(g, img.data[((y + dy) * img.W + x + dx) * 3 + 1]);
          }
        }
      } else {
        const x = Math.round(p.x * dsf), y = Math.round(p.y * dsf);
        if (x >= 0 && y >= 0 && x < img.W && y < img.H) {
          ok = true;
          g = img.data[(y * img.W + x) * 3 + 1];
        }
      }
      if (!ok) continue;
      const dv = Math.abs(g - p.v * 255);
      n++;
      if (dv > 2) over++;
      if (dv > worst) { worst = dv; worstAt = `e${p.edge}@t${t} v=${p.v.toFixed(3)} G=${g}`; }
    }
  }
  console.log(`${STAND}: P8 extrema ${n} (skipped ${skipped}), over 2/255: ${over}, max |dv| ${worst.toFixed(1)}/255 (${worstAt}) -> ${worst <= 2 ? "P8 PASS" : "P8 FAIL"}`);
  const errs = log.filter((l) => l.includes("pageerror"));
  if (errs.length) console.log("pageerrors:", errs.join(" | "));
} finally {
  await browser.close();
}
