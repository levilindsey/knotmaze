// K1139 S5 q3_head sheet: the cross stand's head (node_116), 8 frames
// of one pulse period, flag off (twice, the same-build control pair)
// then flag on, at one pinned state. Off rows above the on row on the
// sheet; the report is the sheet's key.
//   $env:K1139_HOST = "http://127.0.0.1:5760"; node s5_sheet.mjs
// Stand copied verbatim from strips.mjs (rule 11): the shared link
// k111&am=instant&fw=0&snd=none&phw=0, moves 0, 246, 82, 83, 199,
// head node_116. Nothing changed. The flag is set in the page through
// a /src import of paint_math (setPulseHeadPass), the paint tick
// forced the way setState forces one (tickPaint(0) per pinned clock).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, dumpPulses, PIN, setState, sleep } from "./lib.mjs";
import { decodePNG, toRGB } from "./png.mjs";

const HERE = resolve(import.meta.dirname);
const OUT = join(HERE, "out", "s5");
const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });
const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const MOVES = [0, 246, 82, 83, 199];
const HEAD = "node_116";

const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, Q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of MOVES) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  const decl = await dumpPulses(page);
  if (decl.head !== HEAD) throw new Error(`head ${decl.head}, want ${HEAD}`);
  const arrival = decl.pulses.filter((p) => p.inward && p.dist0 === 0);
  // Zoom to 60 px per world unit at the head, as strips.mjs does.
  const fpt = await page.evaluate((id) => window.__knotFabric().vertexScreen(id), HEAD);
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
  const s0 = await pxPerWorld();
  if (s0 < 60 * 0.97) {
    await wheel(-30);
    const s1 = await pxPerWorld();
    const kEff = Math.log(s1 / s0) / 30;
    if (kEff > 0 && s1 < 60 * 0.97) await wheel(-Math.log(60 / s1) / kEff);
  }
  const scale = await pxPerWorld();
  await page.mouse.move(2, 2);
  await sleep(400);
  await viewStill(page);
  await waitAsleep(page, 20000);
  await page.evaluate(PIN);

  const period = decl.spacing / 1.6;
  const passes = [
    { name: "off1", on: false },
    { name: "off2", on: false },
    { name: "on", on: true },
  ];
  const passInfo = [];
  for (const pass of passes) {
    const info = await page.evaluate(async (on) => {
      const PM = await import("/src/render/paint_math.ts");
      const MD = await import("/src/render/paint_model.ts");
      PM.setPulseHeadPass(on);
      const r = window.__knotRenderer();
      r.tickPaint(0);
      const U = MD.knotUniformValues();
      return {
        flag: PM.pulseHeadPass,
        uKPulse: Array.from(U.uKPulse),
        uKHead: U.uKHead ? Array.from(U.uKHead) : null,
        head: window.__knotFabric().vertexScreen("node_116"),
      };
    }, pass.on);
    passInfo.push({ pass: pass.name, on: pass.on, ...info });
    for (let k = 0; k < 8; k++) {
      const t = 100 + (k * period) / 8;
      await setState(page, { t, dbg: 0, webs: true });
      writeFileSync(join(RAW, `${pass.name}_t${k}.png`), await page.screenshot({ type: "png" }));
    }
  }
  // Restore today's picture in the page (flag off) before closing.
  await page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    PM.setPulseHeadPass(false);
    window.__knotRenderer().tickPaint(0);
  });
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  const headPt = passInfo[0].head;
  // Crops: head centred, 160 CSS px, then 1.6x (appendix q3_head).
  for (const pass of passes) {
    for (let k = 0; k < 8; k++) {
      execFileSync("node", [join(HERE, "crop.mjs"), join(RAW, `${pass.name}_t${k}.png`), join(OUT, `${pass.name}_t${k}.png`), String(headPt.x), String(headPt.y), "160", "160", "1.6"], { stdio: "pipe" });
    }
  }
  const files = [];
  for (const pass of passes) for (let k = 0; k < 8; k++) files.push(join(OUT, `${pass.name}_t${k}.png`));
  execFileSync("node", [join(HERE, "sheet.mjs"), join(OUT, "q3_head_s5.png"), "8", ...files], { stdio: "inherit" });
  // Pixel evidence: mean abs diff per frame, control pair vs off/on.
  const load = (p) => toRGB(decodePNG(readFileSync(p)));
  const mad = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.data.length; i++) s += Math.abs(a.data[i] - b.data[i]);
    return s / a.data.length;
  };
  const diffs = [];
  for (let k = 0; k < 8; k++) {
    const a = load(join(OUT, `off1_t${k}.png`));
    const b = load(join(OUT, `off2_t${k}.png`));
    const c = load(join(OUT, `on_t${k}.png`));
    diffs.push({ k, controlMAD: +mad(a, b).toFixed(3), onVsOffMAD: +mad(a, c).toFixed(3) });
  }
  const summary = { stand: { q: Q, moves: MOVES, head: HEAD }, scale, period, spacing: decl.spacing, arrivalAtHead: arrival, passInfo, ctxLost, diffs, log: log.slice(-5) };
  writeFileSync(join(OUT, "s5_sheet.json"), JSON.stringify(summary, null, 1));
  console.log(`s5 sheet: head ${decl.head} scale ${scale.toFixed(1)} period ${period} ctxLost ${ctxLost} arrival ${JSON.stringify(arrival)}`);
  for (const p of passInfo) console.log(`${p.pass}: flag ${p.flag} uKPulse ${p.uKPulse.map((v) => v.toFixed(3)).join(",")} uKHead ${p.uKHead ? p.uKHead[0] : "absent"}`);
  for (const d of diffs) console.log(`frame ${d.k}: control MAD ${d.controlMAD}, on-vs-off MAD ${d.onVsOffMAD}`);
} finally {
  await browser.close();
}
