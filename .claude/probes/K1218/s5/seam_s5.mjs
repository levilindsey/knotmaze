// K1218 S5 (a live_s5.mjs module): the web against the ribbon beneath it, at
// several paint clocks in one settled stand. Per t: luma with the fans drawn
// minus luma with them hidden, over a device window, and its largest |delta|.
//   node live_s5.mjs <stand> <outDir> seam_s5.mjs <x0,y0,x1,y1> <t,t,...>
import { decodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

export async function run({ page, args }) {
  const [x0, y0, x1, y1] = args[0].split(",").map(Number);
  const ts = args[1].split(",").map(Number);
  const shot = async (t, fans) => {
    await page.evaluate((t, fans) => {
      const r = window.__knotRenderer();
      for (const m of [r.filletMesh, r.filletTopMesh]) if (m && m.mesh) m.mesh.renderable = fans;
      r.paintClock = t;
      r.tickPaint(0);
    }, t, fans);
    await frames(page, 3);
    await sleep(150);
    return toRGB(decodePNG(await page.screenshot({ type: "png" })));
  };
  const L = (img, x, y) => { const o = (y * img.W + x) * 3; return luma(img.data[o], img.data[o + 1], img.data[o + 2]); };
  let hdr = "      ";
  for (let x = x0; x <= x1; x++) hdr += String(x).padStart(4);
  const out = [];
  for (const t of ts) {
    const imF = await shot(t, false);
    const im = await shot(t, true);
    let mx = 0, at = "";
    console.log(`t ${t}  gpu - nofan`);
    console.log(hdr);
    for (let y = y0; y <= y1; y++) {
      let s = `${String(y).padStart(5)} `;
      for (let x = x0; x <= x1; x++) {
        const d = L(im, x, y) - L(imF, x, y);
        if (Math.abs(d) > mx) { mx = Math.abs(d); at = `${x},${y}`; }
        s += d.toFixed(0).padStart(4);
      }
      console.log(s);
    }
    console.log(`t ${t} max |gpu-nofan| ${mx.toFixed(1)} at ${at}`);
    out.push({ t, mx, at });
  }
  return out;
}
