// K1218 S5 (a copy of S4's nomark_s4.mjs; s5's lib.mjs).
// K1218 S4 (a live_s4.mjs module): what the markers cover. One settled state; the
// paint clock at each shoot_s4 moment t_k = 100 + k * period / nf (k = 0..nf-1), then
// the gold with no light (np, as shoot_s4's np.png), every marker mesh hidden
// (renderable = false), plus a t0 cell with the markers shown; a grid sheet of one
// device crop, nearest-neighbour zoomed.
//   node live_s4.mjs <stand> <outDir> nomark_s4.mjs <cx,cy> <size> <zoom> <name> [nf=8]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

export async function run({ page, OUT, args }) {
  const [cx, cy] = args[0].split(",").map(Number);
  const S = Number(args[1]), Z = Number(args[2]);
  const name = args[3] || "nomark";
  const nf = Number(args[4] || 8);
  const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2);
  const period = await page.evaluate(() => window.__knotRenderer().pulseSpacing / 1.6);
  const tOf = (k) => 100 + (k * period) / nf;
  const marks = (show) => page.evaluate((show) => {
    const F = window.__knotFabricRenderer();
    const all = [...Object.values(F.markers || {}), ...(F.extraMeshes || []), ...(F.ticks || []), ...(F.chevrons || []), ...(F.hintMeshes || []), ...(F.lockMeshes || [])];
    for (const m of all) if (m && m.mesh) m.mesh.renderable = show;
    return all.length;
  }, show);
  const at = (T) => page.evaluate((T) => { const r = window.__knotRenderer(); r.paintClock = T; r.tickPaint(0); }, T);
  const cells = [];
  const grab = async (label) => {
    await frames(page, 3);
    await sleep(150);
    const buf = await page.screenshot({ type: "png" });
    writeFileSync(join(OUT, `${name}_${label}.png`), buf);
    cells.push({ label, im: toRGB(decodePNG(buf)) });
  };
  await at(tOf(0));
  const nMarks = await marks(true);
  await grab("t0_marks");
  await marks(false);
  for (let k = 0; k < nf; k++) { await at(tOf(k)); await marks(false); await grab(`t${k}`); }
  await page.evaluate(() => {
    const r = window.__knotRenderer(), D = r.paintState, E = [];
    r.setPaint(D.paintSpans, E, D.paintCaps, D.paintRoutes, D.paintTraveled, E);
    r.setPaint = function () {}; // the fabric's re-declare would bring the pulses back
    r.pulseBorn = 0;
    r.rebuildFillets(true);
  });
  await at(tOf(0));
  await marks(false);
  await grab("np");
  const G = 8, CW = S * Z, COLS = 5, ROWS = Math.ceil(cells.length / COLS);
  const W = COLS * CW + (COLS + 1) * G, H = ROWS * CW + (ROWS + 1) * G;
  const data = Buffer.alloc(W * H * 3, 40);
  cells.forEach(({ im }, i) => {
    const ox = G + (i % COLS) * (CW + G), oy = G + Math.floor(i / COLS) * (CW + G);
    for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) {
      const s = ((y0 + Math.floor(y / Z)) * im.W + x0 + Math.floor(x / Z)) * 3, o = ((oy + y) * W + ox + x) * 3;
      data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2];
    }
  });
  writeFileSync(join(OUT, `${name}_sheet.png`), encodePNG({ W, H, data }));
  console.log(`${name}_sheet.png: ${cells.map((c) => c.label).join(" | ")} (${COLS} per row), crop ${x0},${y0} size ${S} zoom ${Z}, ${nMarks} marker meshes, period ${period}`);
  return { x0, y0, S, Z, period, nMarks, cells: cells.map((c) => c.label) };
}
