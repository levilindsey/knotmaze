// K1175 probe: key hints can go stale under flow.
//   node .claude/probes/K1175/stale.mjs <base> <label> [extraQuery]
// Headed Chrome, real time (never --virtual-time-budget).
// The stand is copied verbatim from .claude/probes/K332/hints.mjs:
// the link `?7&am=instant&snd=none` (flow at its default 0.3, on).
// The only changes are the base (the caller's server) and, for the
// control stand, the one added key in extraQuery (`&fw=0`), named in
// the table this probe prints. Walks to the probe's chord junction
// (mnode_109, the junction after the entrance, as hints.mjs's after
// mode reaches it), sets the hint flag with a first direction press,
// then samples the shown discs (keyHintMarkers) against a fresh
// expectedHints over __knotKeyMoves every 250 ms for 10 s. Presses
// shown cardinals with the real keyboard and records the runs taken.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep, waitLive, waitView, waitIdle, waitAsleep } from "../K120/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
mkdirSync(OUT, { recursive: true });

const base = process.argv[2] || "http://127.0.0.1:5560/";
const label = process.argv[3] || "flow";
const extra = process.argv[4] || "";
const LINK = "?7&am=instant&snd=none" + extra;

const ARROW = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const CARDINALS = ["up", "down", "left", "right"];
const DIAGONALS = ["upRight", "downRight", "downLeft", "upLeft"];

// The hintMap rules over a recorded junction (copied from hints.mjs).
function expectedHints(rec) {
  const best = new Map();
  const offer = (edge, dir, chord, err) => {
    if (edge < 0 || err === undefined) return;
    const cur = best.get(edge);
    if (!cur) {
      best.set(edge, { edge, dir, chord, err });
      return;
    }
    if (cur.chord !== chord) {
      if (!chord) best.set(edge, { edge, dir, chord, err });
      return;
    }
    if (err < cur.err - 1e-12) best.set(edge, { edge, dir, chord, err });
  };
  for (const d of CARDINALS) {
    const p = rec.press[d];
    if (p) offer(p.edge, d, false, p.err);
  }
  for (const d of DIAGONALS) {
    const p = rec.chord[d];
    if (p) offer(p.edge, d, true, p.err);
  }
  return [...best.values()]
    .map(({ edge, dir, chord }) => ({ edge, dir, chord }))
    .sort((a, b) => a.edge - b.edge);
}

const shownKey = (h) => `${h.edge}:${h.dir}:${h.chord ? "chord" : "key"}`;

function recordJunction(page) {
  return page.evaluate(() => {
    const km = window.__knotKeyMoves();
    const F = window.__knotFabricRenderer();
    return {
      vertex: km.vertex,
      live: km.live,
      press: km.press,
      chord: km.chord,
      departures: km.departures,
      hints: F && "keyHintMarkers" in F ? F.keyHintMarkers : null,
      solved: window.__knotFabric()?.solved ?? false,
      animating: window.__knotFabric()?.animating ?? false,
      head: window.__knotFabric()?.head ?? null,
      flowStrength: window.__knotParams()?.flowStrength ?? null,
    };
  });
}

async function walkFewest(page) {
  const mv = await page.evaluate(() => {
    const f = window.__knotFabric();
    if (!f || f.solved) return null;
    const fin = f.choiceMoves.filter((c) => Number.isFinite(c.moves));
    if (!fin.length) return null;
    const best = fin.reduce((a, b) => (b.moves < a.moves ? b : a));
    return window.__knotTurnMove(best.edge) ? best.edge : null;
  });
  await waitIdle(page);
  await sleep(250);
  return mv;
}

const { page, logs, close } = await launch("k1175-" + label.replace(/[^a-z0-9-]/gi, ""));
const table = { label, base, link: LINK, extra: extra || "(none)", samples: [], presses: [] };
try {
  await page.goto(base + LINK, { waitUntil: "load" });
  const live = await waitLive(page, 90000);
  console.log(`live=${live}`);
  table.stamp = await waitAsleep(page, 60000);
  await waitView(page);

  // Entrance: set the hint flag with a first direction press (an
  // unhinted cardinal if one exists, as hints.mjs's after mode does).
  const entranceRec = await recordJunction(page);
  table.entrance = entranceRec.vertex;
  const unhinted = CARDINALS.find((d) => entranceRec.press[d]?.edge < 0);
  if (unhinted) {
    await page.keyboard.press(ARROW[unhinted]);
    table.firstPress = { kind: "unhinted cardinal", dir: unhinted };
  } else {
    const d0 = CARDINALS.find((d) => entranceRec.press[d]?.edge >= 0);
    await page.keyboard.press(ARROW[d0]);
    await waitIdle(page);
    const taken = entranceRec.press[d0].edge;
    await page.evaluate((e) => window.__knotTurnMove(e), taken);
    table.firstPress = { kind: "hinted cardinal + hook back", dir: d0, edge: taken };
  }
  await waitIdle(page);
  await sleep(500);

  // The chord junction: one fewest-route walk from the entrance.
  table.walkedEdge = await walkFewest(page);
  await sleep(300);
  const atJunction = await recordJunction(page);
  table.junction = atJunction.vertex;
  table.flowStrength = atJunction.flowStrength;
  console.log(`junction=${table.junction} flowStrength=${table.flowStrength}`);

  // 10 s of samples, one every 250 ms.
  const t0 = Date.now();
  let disagreements = 0;
  const disagreeRuns = new Map();
  for (let i = 0; i < 40; i++) {
    const rec = await recordJunction(page);
    const exp = expectedHints(rec);
    const shown = (rec.hints ?? [])
      .map((h) => ({ edge: h.edge, dir: h.dir, chord: !!h.chord }))
      .sort((a, b) => a.edge - b.edge);
    const expKeys = exp.map(shownKey);
    const shownKeys = shown.map(shownKey);
    const differ = expKeys.join("|") !== shownKeys.join("|");
    if (differ) {
      disagreements++;
      const edges = new Set([...exp, ...shown].map((h) => h.edge));
      for (const e of edges) {
        const s = shown.find((h) => h.edge === e);
        const x = exp.find((h) => h.edge === e);
        if (shownKey(s ?? { edge: e, dir: "?", chord: false }) !== (x ? shownKey(x) : "(none)")) {
          if (!disagreeRuns.has(e)) disagreeRuns.set(e, { shown: new Set(), fresh: new Set() });
          const r = disagreeRuns.get(e);
          r.shown.add(s ? shownKey(s) : "(none)");
          r.fresh.add(x ? shownKey(x) : "(none)");
        }
      }
    }
    table.samples.push({
      tMs: Date.now() - t0,
      vertex: rec.vertex,
      shown: shownKeys,
      expected: expKeys,
      differ,
      // On a disagreeing sample, what a press of each cardinal would
      // take right now (the fresh hook picks the press path uses).
      press: differ
        ? Object.fromEntries(CARDINALS.map((d) => [d, rec.press[d]?.edge ?? null]))
        : undefined,
    });
    if (i < 39) await sleep(250);
  }
  table.sampleCount = table.samples.length;
  table.disagreements = disagreements;
  table.disagreeRuns = [...disagreeRuns.entries()].map(([edge, r]) => ({
    edge,
    shown: [...r.shown],
    fresh: [...r.fresh],
  }));
  console.log(`samples=${table.sampleCount} disagreements=${disagreements}`);
  for (const r of table.disagreeRuns) {
    console.log(`  run ${r.edge}: shown [${r.shown.join(", ")}] vs fresh [${r.fresh.join(", ")}]`);
  }

  const tapsOf = () => page.evaluate(() => window.__knotDaily().taps);

  // At a disagreeing instant, press the shown cardinal and record
  // the run the taps took. Polls briefly for a live disagreement;
  // on a fixed build none comes, and this records that instead.
  {
    let caught = null;
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const rec = await recordJunction(page);
      const exp = expectedHints(rec);
      const shown = (rec.hints ?? [])
        .map((h) => ({ edge: h.edge, dir: h.dir, chord: !!h.chord }))
        .sort((a, b) => a.edge - b.edge);
      const bad = shown.find((s) => {
        const x = exp.find((h) => h.edge === s.edge);
        return !x || shownKey(x) !== shownKey(s);
      });
      if (bad && !bad.chord) {
        caught = {
          shown: bad,
          fresh: exp.find((h) => h.edge === bad.edge) ?? null,
          freshPressEdge: rec.press[bad.dir]?.edge ?? null,
          vertex: rec.vertex,
        };
        break;
      }
      if (disagreements === 0 && table.samples.every((s) => !s.differ)) {
        // Fixed-build path: no stale instant to catch; stop polling
        // once the 10 s table already read clean and a few fresh
        // polls agree too.
        if (Date.now() > deadline - 12000) break;
      }
      await sleep(100);
    }
    if (caught) {
      const before = (await tapsOf()).length;
      await page.keyboard.press(ARROW[caught.shown.dir]);
      await waitIdle(page);
      await sleep(200);
      const taps = await tapsOf();
      const took = taps.length > before ? taps[taps.length - 1] : -1;
      const press = {
        kind: "shown cardinal at a disagreeing instant",
        vertex: caught.vertex,
        shown: caught.shown,
        fresh: caught.fresh,
        freshPressEdge: caught.freshPressEdge,
        took,
        tookShownRun: took === caught.shown.edge,
      };
      table.presses.push(press);
      console.log(
        `press stale: shown ${shownKey(caught.shown)} fresh ${caught.fresh ? shownKey(caught.fresh) : "(none)"} freshPress(${caught.shown.dir})=${caught.freshPressEdge} took=${took}`
      );
      if (took >= 0) {
        await page.evaluate((e) => window.__knotTurnMove(e), took);
        await waitIdle(page);
        await sleep(200);
      }
    } else {
      console.log("press stale: no disagreeing instant caught in 15 s");
      table.presses.push({ kind: "shown cardinal at a disagreeing instant", caught: false });
    }
  }

  // Three presses of shown cardinals, each read at the press instant
  // (the after table's truth presses; recorded on every stand).
  for (let n = 0; n < 3; n++) {
    const rec = await recordJunction(page);
    const shown = (rec.hints ?? [])
      .map((h) => ({ edge: h.edge, dir: h.dir, chord: !!h.chord }))
      .sort((a, b) => a.edge - b.edge);
    const cards = shown.filter((h) => !h.chord);
    if (!cards.length) {
      table.presses.push({ kind: "truth press", n, error: "no cardinal hint shown", vertex: rec.vertex });
      console.log(`press truth ${n}: no cardinal hint shown at ${rec.vertex}`);
      break;
    }
    const h = cards[n % cards.length];
    const before = (await tapsOf()).length;
    await page.keyboard.press(ARROW[h.dir]);
    await waitIdle(page);
    await sleep(200);
    const taps = await tapsOf();
    const took = taps.length > before ? taps[taps.length - 1] : -1;
    table.presses.push({
      kind: "truth press",
      n,
      vertex: rec.vertex,
      shown: h,
      took,
      tookShownRun: took === h.edge,
    });
    console.log(`press truth ${n}: shown ${shownKey(h)} took=${took} ok=${took === h.edge}`);
    if (took >= 0) {
      await page.evaluate((e) => window.__knotTurnMove(e), took);
      await waitIdle(page);
      await sleep(200);
    }
  }
} catch (e) {
  table.error = String(e?.stack || e).slice(0, 800);
  console.log("PROBE THREW " + table.error);
} finally {
  writeFileSync(join(OUT, label + ".json"), JSON.stringify(table, null, 1));
  await close();
}
console.log(
  `TABLE ${label}: link=${LINK} samples=${table.sampleCount ?? 0} disagreements=${table.disagreements ?? "?"} presses=${JSON.stringify(table.presses)}`
);
if (logs.length) console.log("PAGE LOGS: " + logs.slice(0, 4).join(" | "));
