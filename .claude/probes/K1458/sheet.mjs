// K1458 Done 3: the 4x sheet. Per site (css px centre), a block of rows fl x columns today | gf | gf+gfh=1, each
// cell a CROP css px square of fade.mjs's shot_<mode>_<fl>.png (DSF device px per css px) upscaled to 4x css,
// nearest-neighbour. Blocks are laid out PER_ROW across. Composes in a blank headless page (no app load).
//
//   node .claude/probes/K1458/sheet.mjs <shotDir> <out.png> "<x,y;x,y;...>" [fls=0,0.14,1.2] [modes=today,gf,gfh]
//     env CROP=36 DSF=2 PER_ROW=3 LABELS="c1;c2;..." CONTRAST=1
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const [, , dir, out, siteArg, flArg = "0,0.14,1.2", modeArg = "today,gf,gfh"] = process.argv;
const CROP = +(process.env.CROP ?? 36), DSF = +(process.env.DSF ?? 2), PER_ROW = +(process.env.PER_ROW ?? 3), CON = +(process.env.CONTRAST ?? 1);
const sites = siteArg.split(";").map((s) => s.split(",").map(Number));
const labels = (process.env.LABELS ?? "").split(";");
const fls = flArg.split(","), modes = modeArg.split(",");
const shots = {};
for (const m of modes) for (const f of fls) shots[`${m}_${f}`] = readFileSync(join(dir, `shot_${m}_${f}.png`)).toString("base64");
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, userDataDir: mkdtempSync(join(tmpdir(), "k1458sheet")) });
try {
  const page = await browser.newPage();
  const b64 = await page.evaluate(async (d) => {
    const load = (b) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + b; });
    const ims = {}; for (const [k, v] of Object.entries(d.shots)) ims[k] = await load(v);
    const cell = d.CROP * 4, gap = 6, lab = 18, head = 20;
    const bw = d.modes.length * (cell + gap) + 46, bh = head + d.fls.length * (cell + gap) + lab;
    const cols = Math.min(d.PER_ROW, d.sites.length), rows = Math.ceil(d.sites.length / d.PER_ROW);
    const cv = document.createElement("canvas"); cv.width = cols * bw + 10; cv.height = rows * bh + 10;
    const cx = cv.getContext("2d"); cx.fillStyle = "#222"; cx.fillRect(0, 0, cv.width, cv.height); cx.imageSmoothingEnabled = false;
    cx.font = "13px sans-serif";
    d.sites.forEach(([x, y], si) => {
      const ox = 5 + (si % d.PER_ROW) * bw, oy = 5 + Math.floor(si / d.PER_ROW) * bh;
      cx.fillStyle = "#fff"; cx.fillText(`${d.labels[si] || "site " + (si + 1)} (${x},${y})`, ox, oy + 14);
      d.modes.forEach((m, mi) => { cx.fillStyle = "#ccc"; cx.fillText(m === "gfh" ? "gf+gfh=1" : m, ox + 46 + mi * (cell + gap), oy + head + d.fls.length * (cell + gap) + 13); });
      d.fls.forEach((f, fi) => {
        cx.fillStyle = "#ccc"; cx.fillText(`fl ${f}`, ox, oy + head + fi * (cell + gap) + cell / 2);
        d.modes.forEach((m, mi) => {
          const im = ims[`${m}_${f}`];
          const sx = (x - d.CROP / 2) * d.DSF, sy = (y - d.CROP / 2) * d.DSF;
          cx.drawImage(im, sx, sy, d.CROP * d.DSF, d.CROP * d.DSF, ox + 46 + mi * (cell + gap), oy + head + fi * (cell + gap), cell, cell);
        });
      });
    });
    if (d.CON !== 1) { const id = cx.getImageData(0, 0, cv.width, cv.height); for (let i = 0; i < id.data.length; i += 4) for (let k = 0; k < 3; k++) id.data[i + k] = Math.max(0, Math.min(255, 128 + (id.data[i + k] - 128) * d.CON)); cx.putImageData(id, 0, 0); }
    return cv.toDataURL("image/png").split(",")[1];
  }, { shots, sites, labels, fls, modes, CROP, DSF, PER_ROW, CON });
  writeFileSync(out, Buffer.from(b64, "base64"));
  console.log(`wrote ${out}`);
} finally { await browser.close(); }
