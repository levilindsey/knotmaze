// K292 probe: dog-ears on the panel's design rows (Run G, K1184 batch 17;
// Run F, K1189 batch 18: the marks on for everyone, the Seed row marked).
//   node .claude/probes/K292/dogear.mjs <base>
// Headed Chrome, real time (never --virtual-time-budget). A plain load
// (no gate; only the knotmaze.panelOpen preset) opens the panel and
// compares KEY SETS: the data-kp-key values of the .kp-design rows in
// the DOM against task 1's table (PARAM_DEFAULTS minus
// DAILY_EXEMPT_KEYS, less the params with no panel row) plus "seed"
// (the Seed row is marked too, Levi 2026-11-04), listing both
// differences. Every row is built by buildPanel at load (folder folds
// and refreshCond only hide), so a hidden row is still in the DOM and
// no folder needs opening for the census; folders are opened for the
// sheet only. Then shoots the live look sheet at desktop and phone
// widths into sheet/ and stops: Claude checks the live panel against
// Levi's judged set (DOGEAR_NOSHOOT=1 runs the census and plain-load
// checks only, for scratch-change proofs). Link ?7&am=instant&snd=none
// (a fresh design; a bare URL would be today's daily).
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { open, sleep } from "../K793/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHEET = join(HERE, "sheet");
const base = process.argv[2] || "http://127.0.0.1:5680/";
const LINK = "?7&am=instant&snd=none";

// Copied from test/ui/panel_rows.test.ts (its EXEMPT and VIEW_ROWS are
// local, unexported consts; that file is read only in this run).
const NO_ROW = ["physicsWorker", "mazeFabric", "labelGpu"];
const VIEW_ROWS = [
  { view: "clockView", viewKey: "mino", key: "clock" },
  { view: "clockView", viewKey: "plain", key: "clock" },
  { view: "gaView", viewKey: "gridAlign", key: "gridAlign" },
  { view: "bgView", viewKey: "backgroundSpeed", key: "backgroundSpeed" },
  { view: "bgView", viewKey: "backgroundAngle", key: "backgroundAngle" },
];

let failures = 0;
function check(t, name, ok, data = {}) {
  if (!ok) failures++;
  t.check(name, ok, data);
}

// The panel-open preset, installed before the page's own scripts run.
const OPEN_SNIPPET = () => {
  try {
    localStorage.setItem("knotmaze.panelOpen", "1");
  } catch {}
};

// The census, in the page (the tables are imported from the dev server,
// as k79b_smoke.mjs imports /src/render/*.ts in the page).
const census = (page) =>
  page.evaluate(
    async (noRow) => {
      const { PARAM_DEFAULTS } = await import("/src/ui/url_state.ts");
      const { DAILY_EXEMPT_KEYS } = await import("/src/ui/daily_link.ts");
      const exempt = new Set(DAILY_EXEMPT_KEYS);
      const marked = Object.keys(PARAM_DEFAULTS).filter((k) => !exempt.has(k));
      const expected = marked.filter((k) => !noRow.includes(k)).sort();
      // The Seed row is marked too (its key is not a param).
      const expectedDom = [...expected, "seed"].sort();
      const els = [...document.querySelectorAll(".kp-design")];
      const dom = [...new Set(els.map((e) => e.dataset.kpKey))].sort();
      const seedDaily = [...document.querySelectorAll(".kp-seed, .kp-daily")].map((e) => ({
        cls: e.className,
        seed: e.classList.contains("kp-seed"),
        daily: e.classList.contains("kp-daily"),
        design: e.classList.contains("kp-design"),
        key: e.dataset.kpKey ?? null,
      }));
      const clockRows = els.filter((e) => e.dataset.kpKey === "clock").length;
      return {
        params: Object.keys(PARAM_DEFAULTS).length,
        exemptCount: exempt.size,
        markedCount: marked.length,
        noRowInMarked: marked.filter((k) => noRow.includes(k)),
        expected,
        expectedDom,
        dom,
        missing: expectedDom.filter((k) => !dom.includes(k)),
        extra: dom.filter((k) => !expectedDom.includes(k)),
        domRowCount: els.length,
        clockRows,
        seedDaily,
      };
    },
    NO_ROW
  );

const plainState = (page) =>
  page.evaluate(() => {
    const key = document.querySelector(".kp-dogear-key");
    const row = document.querySelector(".kp-design");
    const cs = row ? getComputedStyle(row, "::after") : null;
    const kcs = key ? getComputedStyle(key) : null;
    return {
      gate: document.documentElement.hasAttribute("data-dogear"),
      keyText: key?.textContent ?? null,
      keyDisplay: kcs?.display ?? null,
      triContent: cs?.content ?? null,
      triBorderTop: cs?.borderTopWidth ?? null,
    };
  });

const panelClip = (page) =>
  page.evaluate(() => {
    const r = document.querySelector(".tp-dfwv").getBoundingClientRect();
    return {
      x: Math.max(0, r.x - 4),
      y: Math.max(0, r.y - 4),
      width: Math.min(innerWidth, r.width + 8),
      height: Math.min(innerHeight - Math.max(0, r.y - 4), r.height + 8),
    };
  });

async function shootPanel(t, tag) {
  // Open every folder for the sheet (the census above needs none open).
  await t.page.click(".kp-sx-fold[aria-label='Expand all groups']");
  await sleep(600);
  const clip = await panelClip(t.page);
  // The top sheet must show the Seed row: grow the top clip to its foot.
  const seedFoot = await t.page.evaluate((clipY) => {
    const r = document.querySelector(".kp-seed")?.getBoundingClientRect();
    return r ? Math.ceil(r.bottom - clipY + 6) : 340;
  }, clip.y);
  await t.shot("00_top", { ...clip, height: Math.min(clip.height, Math.max(340, seedFoot)) });
  // A folder where marked and unmarked rows sit side by side: Path &
  // view (pathViz marked, Camera unmarked). Scroll it into view.
  await t.page.evaluate(() => {
    document
      .querySelector('[data-kp-key="pathViz"]')
      ?.scrollIntoView({ block: "start" });
  });
  await sleep(400);
  await t.shot("01_mixed_pathview", clip);
  // One row with a help mark: gridSize (the (i) shows on the sheet /
  // coarse pointer; the triangle is at the row's top-right). Crop it
  // magnified so both ends of the row are readable.
  const box = await t.page.evaluate(() => {
    const e = document.querySelector('[data-kp-key="gridSize"]');
    e?.scrollIntoView({ block: "center" });
    const r = e?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  await sleep(400);
  const box2 = await t.page.evaluate(() => {
    const r = document
      .querySelector('[data-kp-key="gridSize"]')
      ?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  void box;
  if (box2) await t.crop("02_help_row", { x: box2.x - 2, y: box2.y - 2, width: box2.width + 4, height: box2.height + 4 }, 3);
  await t.shot("03_full", clip);
  // The Seed row, magnified as 02 crops gridSize: the triangle must sit
  // in the row's corner, clear of the seed field and the dice beside it.
  const seedBox = await t.page.evaluate(() => {
    const e = document.querySelector(".kp-seed");
    e?.scrollIntoView({ block: "center" });
    const r = e?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  await sleep(400);
  const seedBox2 = await t.page.evaluate(() => {
    const r = document.querySelector(".kp-seed")?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  void seedBox;
  if (seedBox2) await t.crop("04_seed_row", { x: seedBox2.x - 2, y: seedBox2.y - 2, width: seedBox2.width + 4, height: seedBox2.height + 4 }, 3);
}

async function live(tag, phone) {
  const t = await open({ base, outDir: SHEET, tag, phone });
  try {
    await t.page.evaluateOnNewDocument(OPEN_SNIPPET);
    await t.load(LINK);
    if (phone) {
      await t.setPanel(true);
      await sleep(300);
    }
    const c = await census(t.page);
    console.log(`[${tag}] census: ${JSON.stringify({ params: c.params, exempt: c.exemptCount, marked: c.markedCount, noRowInMarked: c.noRowInMarked, expectedKeys: c.expected.length, expectedDomKeys: c.expectedDom.length, domKeys: c.dom.length, domRows: c.domRowCount, clockRows: c.clockRows, missing: c.missing, extra: c.extra })}`);
    check(t, "marked set in DOM = params minus exempt, less no-row params, plus seed", c.missing.length === 0 && c.extra.length === 0, { missing: c.missing, extra: c.extra });
    check(t, "counts: 269 params, 82 exempt, 187 marked, 186 DOM keys", c.params === 269 && c.exemptCount === 82 && c.markedCount === 187 && c.dom.length === 186, { params: c.params, exempt: c.exemptCount, marked: c.markedCount, domKeys: c.dom.length });
    check(t, "no-row marked params named (mazeFabric, labelGpu)", JSON.stringify(c.noRowInMarked) === JSON.stringify(["mazeFabric", "labelGpu"]), c.noRowInMarked);
    check(t, "clock view rows both carry clock (187 rows, 186 keys)", c.clockRows === 2 && c.domRowCount === 187, { clockRows: c.clockRows, domRows: c.domRowCount });
    const seedEntry = c.seedDaily.find((s) => s.seed);
    const dailyEntry = c.seedDaily.find((s) => s.daily);
    check(t, "Seed marked with key seed, Daily unmarked", !!seedEntry && seedEntry.design && seedEntry.key === "seed" && !!dailyEntry && !dailyEntry.design && dailyEntry.key === null, c.seedDaily);
    const g = await plainState(t.page);
    check(t, "plain load: key line shown with its words, triangle drawn (no gate)", !g.gate && g.keyDisplay !== "none" && /corner mark.*in the link/.test(g.keyText ?? "") && g.triContent !== "none" && parseFloat(g.triBorderTop) >= 6, g);
    check(t, "plain load: 187 marked rows", c.domRowCount === 187, { rows: c.domRowCount });
    void VIEW_ROWS;
    if (process.env.DOGEAR_NOSHOOT !== "1") await shootPanel(t, tag);
  } catch (e) {
    failures++;
    console.log(`[${tag}] THREW ${e.stack}`);
  } finally {
    await t.close();
  }
}

await live("live_desk", false);
await live("live_phone", true);
console.log(failures === 0 ? "ALL CHECKS PASS" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
