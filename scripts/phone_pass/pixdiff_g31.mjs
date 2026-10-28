// pixdiff_g31.mjs: where do two builds' frozen frames differ? Offline (reads PNGs, touches no phone). For each link, the pixels
// that differ between <link>_base_r1.png and <link>_head_r2.png (the first base run and the second head run of a k539_g31.mjs
// pass, whose shots they are): the count, the largest channel difference, a histogram of it and the bounding box.
// Call: node scripts/phone_pass/pixdiff_g31.mjs <the pass's g31 folder>
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
const KIT = fileURLToPath(new URL("./", import.meta.url));
const P = await import(pathToFileURL(KIT + "png.mjs").href);
const d = process.argv[2].replace(/\\/g, "/").replace(/\/?$/, "/");
const rd = (n) => P.toRGB(P.decodePNG(readFileSync(d + n)));
const pairs = [
  ["dense", "dense_base_r1.png", "dense_head_r2.png"],
  ["maxfab", "maxfab_base_r1.png", "maxfab_head_r2.png"],
  ["knot24", "knot24_base_r1.png", "knot24_head_r2.png"],
];
for (const [name, a, b] of pairs) {
  const A = rd(a);
  const B = rd(b);
  let n = 0;
  let maxd = 0;
  const hist = { "1-8": 0, "9-24": 0, "25-64": 0, "65+": 0 };
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1;
  let y1 = -1;
  const diff = new Uint8Array(A.W * A.H * 3);
  for (let i = 0; i < A.W * A.H; i++) {
    const dr = Math.abs(A.data[i * 3] - B.data[i * 3]);
    const dg = Math.abs(A.data[i * 3 + 1] - B.data[i * 3 + 1]);
    const db = Math.abs(A.data[i * 3 + 2] - B.data[i * 3 + 2]);
    const m = Math.max(dr, dg, db);
    const s = dr + dg + db;
    if (s) {
      n++;
      if (m > maxd) maxd = m;
      if (m <= 8) hist["1-8"]++;
      else if (m <= 24) hist["9-24"]++;
      else if (m <= 64) hist["25-64"]++;
      else hist["65+"]++;
      const x = i % A.W;
      const y = (i / A.W) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const v = Math.min(255, 40 + m * 8);
      diff[i * 3] = v;
      diff[i * 3 + 1] = 0;
      diff[i * 3 + 2] = 0;
    }
  }
  console.log(name, A.W + "x" + A.H, "differing px", n, "max channel diff", maxd, JSON.stringify(hist), "bbox", [x0, y0, x1, y1].join(","));
}
