// K1218 S3 (a live_s3.mjs module): who paints a few device pixels. One settled
// state, four renders: as is, the fan meshes hidden, the crossing-gap mask off,
// and both; then a side-by-side sheet of one device crop and the luma of a
// small pixel window per render.
//   node live_s3.mjs <stand> <outDir> attr_s3.mjs <x0,y0> <size> <zoom> <wx0,wy0,wx1,wy1> <name>
// <x0,y0> <size> <zoom>: the crop (device px); the window: the pixels printed.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

export async function run({ page, OUT, args }) {
  const [x0, y0] = args[0].split(",").map(Number);
  const S = Number(args[1]), Z = Number(args[2]);
  const [wx0, wy0, wx1, wy1] = args[3].split(",").map(Number);
  const name = args[4] || "attr";
  const variants = [
    { id: "as-is", webs: true, mask: true },
    { id: "no fans", webs: false, mask: true },
    { id: "no mask", webs: true, mask: false },
    { id: "neither", webs: false, mask: false },
  ];
  const ims = [];
  for (const v of variants) {
    await page.evaluate((v) => {
      const r = window.__knotRenderer();
      r.maskEnabled = v.mask;
      r.update();
      r.rebuildFillets(true);
      if (r.filletMesh) r.filletMesh.mesh.renderable = v.webs;
      if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = v.webs;
      r.paintClock = 100;
      r.tickPaint(0);
    }, v);
    await frames(page, 3);
    await sleep(150);
    const buf = await page.screenshot({ type: "png" });
    writeFileSync(join(OUT, `${name}_${v.id.replace(/ /g, "")}.png`), buf);
    ims.push(toRGB(decodePNG(buf)));
  }
  await page.evaluate(() => {
    const r = window.__knotRenderer();
    r.maskEnabled = true; r.update(); r.rebuildFillets(true);
    if (r.filletMesh) r.filletMesh.mesh.renderable = true;
    if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = true;
  });
  const lum = (im, x, y) => { const o = (y * im.W + x) * 3; return Math.round(0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2]); };
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
