// K332 probe: arrow-key hints at the player's junction.
//   node .claude/probes/K332/hints.mjs <base> before|after
// Headed Chrome, real time (never --virtual-time-budget). Loads seed 7,
// records at the entrance and the next three junctions (walking the
// fewest route via __knotFabric().choiceMoves + __knotTurnMove, the
// K137 page-driver way) every choice run with the key or chord that
// takes it from __knotKeyMoves. `before` also screenshots the entrance
// and notes there is no hint surface yet. `after` presses a first
// direction key, compares the renderer's keyHintMarkers against the
// hintMap inversion of the hook's picks, screenshots the entrance with
// hints up and after a move, presses each hinted cardinal (and one
// hinted chord) with the real keyboard, and checks the hidden states
// (before first press, while the dot travels, after the solve).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep, waitLive, waitView, waitIdle, waitAsleep } from "../K120/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "shots");
const OUT = join(HERE, "out");
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

const base = process.argv[2] || "http://127.0.0.1:5550/";
const mode = process.argv[3] || "before";
const LINK = "?7&am=instant&snd=none";

const ARROW = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const CHORD_KEYS = {
  upRight: ["ArrowUp", "ArrowRight"],
  downRight: ["ArrowDown", "ArrowRight"],
  downLeft: ["ArrowDown", "ArrowLeft"],
  upLeft: ["ArrowUp", "ArrowLeft"],
};
const CARDINALS = ["up", "down", "left", "right"];
const DIAGONALS = ["upRight", "downRight", "downLeft", "upLeft"];

const checks = [];
function check(ok, what, detail = "") {
  checks.push({ ok: !!ok, what, detail: String(detail) });
  console.log(`${ok ? "PASS" : "FAIL"} ${what}${detail ? " (" + detail + ")" : ""}`);
}

// One junction's picks, read in the page from __knotKeyMoves.
function recordJunction(page) {
  return page.evaluate(() => {
    const km = window.__knotKeyMoves();
    const F = window.__knotFabricRenderer();
    const runs = [];
    const seen = new Set();
    for (const d of km.departures) {
      if (seen.has(d.edge)) continue;
      seen.add(d.edge);
      const cardinals = Object.entries(km.press)
        .filter(([, p]) => p.edge === d.edge)
        .map(([k]) => k);
      const chords = Object.entries(km.chord)
        .filter(([, p]) => p.edge === d.edge)
        .map(([k]) => k);
      runs.push({ edge: d.edge, cardinals, chords, none: cardinals.length + chords.length === 0 });
    }
    return {
      vertex: km.vertex,
      live: km.live,
      press: km.press,
      chord: km.chord,
      departures: km.departures,
      runs,
      hintSurface: F && "keyHintMarkers" in F,
      hints: F && "keyHintMarkers" in F ? F.keyHintMarkers : null,
      markerRadius: F ? F.markerRadius() : null,
      solved: window.__knotFabric()?.solved ?? false,
      animating: window.__knotFabric()?.animating ?? false,
      head: window.__knotFabric()?.head ?? null,
    };
  });
}

function hintMarkers(page) {
  return page.evaluate(() => {
    const F = window.__knotFabricRenderer();
    return F && "keyHintMarkers" in F ? F.keyHintMarkers : null;
  });
}

// The hintMap rules (K332 task 2; K1170) over a recorded junction:
// one entry per run; a cardinal that takes a run always beats a chord,
// among cardinals the smaller err wins (an exact tie keeps the first
// in CARDINALS order, which is KEY_DIRS order), and a chord's diagonal
// shows only on a run no cardinal takes. Mirrors src/ui/key_moves.ts.
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
function compareHints(rec, label) {
  const exp = expectedHints(rec);
  const shown = (rec.hints ?? [])
    .map((h) => ({ edge: h.edge, dir: h.dir, chord: !!h.chord }))
    .sort((a, b) => a.edge - b.edge);
  const ok =
    exp.length === shown.length &&
    exp.every((e, i) => shownKey(e) === shownKey(shown[i]));
  check(ok, `${label}: shown hints equal the hook picks under hintMap rules`,
    `expected [${exp.map(shownKey).join(", ")}], shown [${shown.map(shownKey).join(", ")}]`);
  const rOk = (rec.hints ?? []).every(
    (h) => Math.abs(h.r - rec.markerRadius * 0.55) < 1e-9
  );
  check(rOk, `${label}: hint radius is markerRadius * 0.55`,
    `r=${(rec.hints ?? []).map((h) => h.r).join(",")}, base=${rec.markerRadius}`);
  return exp;
}

// Walk one run of the fewest route (K137 page drivers: choiceMoves).
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

async function returnToEntrance(page, entrance) {
  for (let i = 0; i < 90; i++) {
    const back = await page.evaluate((ent) => {
      const f = window.__knotFabric();
      if (!f || f.head === ent || f.pathEdges.length === 0) return null;
      return f.pathEdges[f.pathEdges.length - 1];
    }, entrance);
    if (back === null) break;
    await page.evaluate((e) => window.__knotTurnMove(e), back);
    await waitIdle(page);
    await sleep(150);
  }
  const head = await page.evaluate(() => window.__knotFabric()?.head ?? null);
  return head === entrance;
}

const { page, logs, close } = await launch("k332-" + mode);
const table = { mode, base, link: LINK, junctions: [], notes: [] };
try {
  await page.goto(base + LINK, { waitUntil: "load" });
  check(await waitLive(page, 90000), "maze live");
  table.stamp = await waitAsleep(page, 60000);
  await waitView(page);

  if (mode === "before") {
    for (let i = 0; i < 4; i++) {
      const rec = await recordJunction(page);
      table.junctions.push(rec);
      console.log(`JUNCTION ${i} vertex=${rec.vertex} runs=` +
        rec.runs.map((r) => `${r.edge}:[${[...r.cardinals, ...r.chords].join("+") || "none"}]`).join(" "));
      if (i === 0) await page.screenshot({ path: join(SHOTS, "before_entrance.png") });
      if (i < 3) await walkFewest(page);
    }
    const anySurface = table.junctions.some((j) => j.hintSurface);
    table.notes.push(
      anySurface
        ? "a keyHintMarkers surface exists (unexpected in before mode)"
        : "no hint discs anywhere: the renderer has no keyHintMarkers surface yet"
    );
    check(!anySurface, "before: no hint surface (keyHintMarkers) exists yet");
  } else {
    // --- after ---
    const entranceRec = await recordJunction(page);
    const entrance = entranceRec.vertex;
    table.entrance = entrance;
    check((entranceRec.hints ?? []).length === 0, "after: no disc before the first direction press",
      `hints=${JSON.stringify(entranceRec.hints)}`);

    // First direction press: an unhinted cardinal if one exists (it
    // sets the flag without moving), else a hinted one and hook back.
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
    let rec = await recordJunction(page);
    compareHints(rec, "entrance after first press");
    await page.screenshot({ path: join(SHOTS, "after_first_press.png") });

    // The same junctions as the before table, hints up.
    for (let i = 0; i < 4; i++) {
      rec = await recordJunction(page);
      table.junctions.push(rec);
      compareHints(rec, `junction ${i} (${rec.vertex})`);
      if (i === 0) {
        // Hidden while the dot travels: hook a move and poll it.
        const mv = await walkFewest(page);
        table.movedTo = mv;
      }
      if (i === 0) await page.screenshot({ path: join(SHOTS, "after_move.png") });
      if (i > 0 && i < 3) await walkFewest(page);
    }

    // Poll one hook move for discs while the dot travels.
    {
      const edge = await page.evaluate(() => {
        const f = window.__knotFabric();
        const fin = f.choiceMoves.filter((c) => Number.isFinite(c.moves));
        return fin.length ? fin.reduce((a, b) => (b.moves < a.moves ? b : a)).edge : -1;
      });
      if (edge >= 0) {
        await page.evaluate((e) => window.__knotTurnMove(e), edge);
        let sawAnim = false;
        let sawHints = 0;
        for (let i = 0; i < 200; i++) {
          const s = await page.evaluate(() => ({
            anim: window.__knotFabric()?.animating ?? false,
            n: window.__knotFabricRenderer()?.keyHintMarkers?.length ?? -1,
          }));
          if (s.anim) {
            sawAnim = true;
            sawHints = Math.max(sawHints, s.n);
          }
          if (!s.anim && sawAnim) break;
          await sleep(15);
        }
        await waitIdle(page);
        check(sawAnim && sawHints === 0, "after: no disc while the dot travels",
          `animSamples sawAnim=${sawAnim}, maxHints=${sawHints}`);
      }
    }

    // Back to the entrance, then prove the arrows with the real keyboard.
    check(await returnToEntrance(page, entrance), "after: returned to the entrance");
    await sleep(400);
    rec = await recordJunction(page);
    const exp = compareHints(rec, "entrance for key truth");
    const tapsOf = () => page.evaluate(() => window.__knotDaily().taps);
    for (const h of exp.filter((x) => !x.chord)) {
      const before = (await tapsOf()).length;
      await page.keyboard.press(ARROW[h.dir]);
      await waitIdle(page);
      await sleep(200);
      const taps = await tapsOf();
      const took = taps.length > before ? taps[taps.length - 1] : -1;
      check(took === h.edge, `after: pressing ${h.dir} takes its hinted run`,
        `hint edge=${h.edge}, took=${took}, taps ${before}->${taps.length}`);
      if (took >= 0) {
        await page.evaluate((e) => window.__knotTurnMove(e), took);
        await waitIdle(page);
        await sleep(150);
      }
    }
    // One hinted chord, held with both keys together. The entrance's
    // only run wears a cardinal, so this runs at the next junction,
    // whose hints (before K1170) were chords. Under K1170 every run
    // there has a cardinal, so where no chord is hinted the probe
    // presses that junction's first hinted cardinal instead: it must
    // take the run the chord press took before the fix.
    await walkFewest(page);
    await sleep(300);
    const jrec = await recordJunction(page);
    // K1175: gated on equality again (K1170 dropped this gate because
    // the renderer's cached hints went stale under flow; keyHints now
    // recomputes while the flow is on). The press-truth below still
    // uses the SHOWN disc, as a player would.
    compareHints(jrec, "chord junction revisit");
    const jexp = expectedHints(jrec);
    const shownHints = (jrec.hints ?? [])
      .map((h) => ({ edge: h.edge, dir: h.dir, chord: !!h.chord }))
      .sort((a, b) => a.edge - b.edge);
    table.chordJunctionNote =
      `hook [${jexp.map(shownKey).join(", ")}], shown [${shownHints.map(shownKey).join(", ")}]`;
    console.log("NOTE chord junction: " + table.chordJunctionNote);
    const chordHint = shownHints.find((x) => x.chord);
    if (chordHint) {
      const [k1, k2] = CHORD_KEYS[chordHint.dir];
      const before = (await tapsOf()).length;
      await page.keyboard.down(k1);
      await sleep(25);
      await page.keyboard.down(k2);
      await waitIdle(page);
      await sleep(300);
      await page.keyboard.up(k2).catch(() => {});
      await page.keyboard.up(k1).catch(() => {});
      await waitIdle(page);
      const taps = await tapsOf();
      const took = taps.length > before ? taps[taps.length - 1] : -1;
      check(took === chordHint.edge, `after: holding ${k1}+${k2} (${chordHint.dir}) takes its hinted run`,
        `hint edge=${chordHint.edge}, took=${took}, taps ${before}->${taps.length}`);
      table.chordTest = { at: jrec.vertex, dir: chordHint.dir, edge: chordHint.edge, took };
    } else if (shownHints.length > 0) {
      // K1170: no chord is hinted at this junction (every run has a
      // cardinal). Press the first shown cardinal: it takes its run,
      // the run the chord press took before the fix.
      const h = shownHints[0];
      const before = (await tapsOf()).length;
      await page.keyboard.press(ARROW[h.dir]);
      await waitIdle(page);
      await sleep(200);
      const taps = await tapsOf();
      const took = taps.length > before ? taps[taps.length - 1] : -1;
      check(took === h.edge, `after: pressing ${h.dir} at the chord junction takes its hinted run (no chord hinted under K1170)`,
        `hint edge=${h.edge}, took=${took}, taps ${before}->${taps.length}`);
      table.chordTest = { at: jrec.vertex, dir: h.dir, edge: h.edge, took, chordHinted: false };
      if (took >= 0) {
        await page.evaluate((e) => window.__knotTurnMove(e), took);
        await waitIdle(page);
        await sleep(150);
      }
    } else {
      check(false, "after: the chord junction has a hint to press", `shown=${JSON.stringify(shownHints)}`);
      table.chordTest = null;
    }

    // Hidden once the solve is over.
    let solved = false;
    for (let i = 0; i < 120 && !solved; i++) {
      solved = await page.evaluate(() => window.__knotFabric()?.solved ?? false);
      if (solved) break;
      if ((await walkFewest(page)) === null) break;
    }
    await sleep(600);
    const endRec = await recordJunction(page);
    check(endRec.solved && (endRec.hints ?? []).length === 0,
      "after: no disc once the solve is over",
      `solved=${endRec.solved}, hints=${JSON.stringify(endRec.hints)}`);
    table.solved = endRec.solved;
  }
} catch (e) {
  check(false, "probe threw", String(e?.stack || e).slice(0, 600));
} finally {
  table.checks = checks;
  table.logs = logs;
  writeFileSync(join(OUT, mode + ".json"), JSON.stringify(table, null, 1));
  await close();
}
const fails = checks.filter((c) => !c.ok).length;
console.log(`CHECK ${mode}: ${checks.length - fails}/${checks.length} passed; table in out/${mode}.json`);
if (logs.length) console.log("PAGE LOGS: " + logs.slice(0, 4).join(" | "));
