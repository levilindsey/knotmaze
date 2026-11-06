// K1218 S4 (a live_s4.mjs module): webs or strips? One settled state, three
// renders: as is, the cover strips dropped (pushStrip patched to a no-op on
// both fillet meshes, then rebuildFillets), and the fan meshes hidden; a side
// by side sheet of one device crop, the changed-pixel counts in it, and the
// luma of a small pixel window per render.
//   node live_s4.mjs <stand> <outDir> attr_s4.mjs <x0,y0> <size> <zoom> <wx0,wy0,wx1,wy1> <name> [paintClock=100]
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

export async function run({ page, OUT, args }) {
  const [x0, y0] = args[0].split(",").map(Number);
  const S = Number(args[1]), Z = Number(args[2]);
  const [wx0, wy0, wx1, wy1] = args[3].split(",").map(Number);
  const name = args[4] || "attr";
  const T = args[5] ? Number(args[5]) : 100; // the paint clock (shoot_s4's t_k = 100 + k * period / nf)
  const variants = [
    { id: "as-is", strips: true, webs: true },
    { id: "no strips", strips: false, webs: true },
    { id: "no fans", strips: true, webs: false },
    { id: "no mask", strips: true, webs: true, mask: false },
  ];
  const ims = [];
  for (const v of variants) {
    await page.evaluate((v, T) => {
      const r = window.__knotRenderer();
      for (const m of [r.filletMesh, r.filletTopMesh]) {
        if (!m) continue;
        if (v.strips) delete m.pushStrip; else m.pushStrip = () => {};
        m.mesh.renderable = v.webs;
      }
      r.maskEnabled = v.mask !== false;
      r.update();
      r.rebuildFillets(true);
      r.paintClock = T;
      r.tickPaint(0);
    }, v, T);
    await frames(page, 3);
    await sleep(150);
    const buf = await page.screenshot({ type: "png" });
    writeFileSync(join(OUT, `${name}_${v.id.replace(/ /g, "")}.png`), buf);
    ims.push(toRGB(decodePNG(buf)));
  }
  await page.evaluate(() => {
    const r = window.__knotRenderer();
    for (const m of [r.filletMesh, r.filletTopMesh]) { if (!m) continue; delete m.pushStrip; m.mesh.renderable = true; }
    r.update(); r.rebuildFillets(true);
  });
  const lum = (im, x, y) => { const o = (y * im.W + x) * 3; return Math.round(0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2]); };
  for (let i = 1; i < ims.length; i++) {
    let n = 0, mx = 0;
    for (let y = y0; y < y0 + S; y++) for (let x = x0; x < x0 + S; x++) {
      const o = (y * ims[0].W + x) * 3;
      const d = Math.max(Math.abs(ims[0].data[o] - ims[i].data[o]), Math.abs(ims[0].data[o + 1] - ims[i].data[o + 1]), Math.abs(ims[0].data[o + 2] - ims[i].data[o + 2]));
      if (d > 2) n++;
      if (d > mx) mx = d;
    }
    console.log(`${variants[i].id} vs as-is in the crop: ${n} px changed (>2), max ${mx}`);
  }
  variants.forEach((v, i) => {
    console.log(`${v.id}: luma rows ${wy0}-${wy1}, cols ${wx0}-${wx1}`);
    for (let y = wy0; y <= wy1; y++) {
      const row = [];
      for (let x = wx0; x <= wx1; x++) row.push(String(lum(ims[i], x, y)).padStart(3));
      console.log(`  ${y}: ${row.join(" ")}`);
    }
  });
  const G = 8, CW = S * Z, W = variants.length * CW + (variants.length + 1) * G, H = CW + 2 * G;
  const data = Buffer.alloc(W * H * 3, 40);
  ims.forEach((im, i) => {
    const ox = G + i * (CW + G);
    for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) {
      const s = ((y0 + Math.floor(y / Z)) * im.W + x0 + Math.floor(x / Z)) * 3, o = ((G + y) * W + ox + x) * 3;
      data[o] = im.data[s]; data[o + 1] = im.data[s + 1]; data[o + 2] = im.data[s + 2];
    }
  });
  writeFileSync(join(OUT, `${name}_sheet.png`), encodePNG({ W, H, data }));
  console.log(`${name}_sheet.png: ${variants.map((v) => v.id).join(" | ")}, crop ${x0},${y0} size ${S} zoom ${Z}`);
}
