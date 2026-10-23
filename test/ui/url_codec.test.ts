import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEAR_PRESETS,
  ENUM_OPTIONS,
  clockOf,
  PARAM_DEFAULTS,
  REVEAL_END_CROSSES,
  REVEAL_END_GLOWS,
  applyAppearMode,
  beatSettingsOf,
  chaseParamsOf,
  encodeParams,
  fabricRulesOf,
  fireSettingsOf,
  minoClockOf,
  parseParams,
  writeParams,
} from "../../src/ui/url_state";
import type { AppearPreset, UrlParams } from "../../src/ui/url_state";
import { parseLaunch } from "../../src/ui/daily_link";
import { clampParamValue, CODEC_PARAMS, decodeToken, numberText } from "../../src/ui/param_codec";
import type { CodecDefaults } from "../../src/ui/param_codec";
import { DEFAULT_MAZE_PARAMS } from "../../src/core/maze_plan";
import { DEFAULT_CHASE_PARAMS } from "../../src/game/minotaur";

const withSeed = (seed: number, over: Partial<UrlParams> = {}): UrlParams => ({
  ...PARAM_DEFAULTS,
  seed,
  ...over,
});

// The user's rect design (2026-10-11) as a key=value link...
const USER_KEYS =
  "s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=2.4&fl=0&fw=.25&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1";
// ...and as its token (121 -> 56 chars).
const USER_COMPACT = "1471kin.EBGJeJH4_ol9B-mT9CXoqT4fol-NCvnoY8SYl6JbGRMCBUPg";
const USER = withSeed(2430477599, {
  gridSize: 12,
  repulsion: 1,
  bend: 1,
  smooth: 0.25,
  gridAlign: 0,
  threadWidth: 0.64,
  gap: 0.12,
  cuspRadius: 2.4,
  fadeLength: 0,
  flowStrength: 0.25,
  flowSpeed: 1.15,
  volume: 0.18,
  hueShift: 312,
  palette: "moss",
  pathColor: "#6c644c",
  appearSpeed: 2.1,
});

const warnings =(): ReturnType<typeof vi.spyOn> =>
  vi.spyOn(console, "warn").mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("links", () => {
  // Links OMIT defaults, so a link that does not list a param reads today's
  // default for it. Before launch a default changes in place (K132): edit
  // PARAM_DEFAULTS and this pin together, and every link that leaves the
  // param out takes the new value. ADDING a param: append it to the codec
  // table too (the codec tests say so).
  it("pins the defaults table", () => {
    expect(PARAM_DEFAULTS).toEqual({
      text: "", cartouche: "", emblem: "", cartoucheShape: "", gridSize: 18, shape: "rect", startAnchor: "nw", exitAnchor: "se",
      weaveDensity: 0.35, turnBias: 0.7, slack: 0.55, simSpeed: 5, drag: 0.5,
      repulsion: 1.45, bend: 2, smooth: 0.75, stiffness: 1, gridAlign: 0.1,
      threadWidth: 0.52, gap: 0.04, moveSpeed: 1, cuspRadius: 3,
      fadeLength: 0.14, flowStrength: 0.3, flowSpeed: 0.5, tugLimit: 2,
      snapBack: 4, soundMode: "music", pitchSpace: "chromatic", octaves: 3,
      soundSpeed: 1, volume: 0.33, reverb: 0.42, brightness: 0.5,
      sustain: 0.5, shimmer: 0.4, pickPosition: 0.4,
      rootNote: "seed", tonicEmphasis: 0.5, pulseSpacing: 2.5, hueShift: 300,
      gamutArc: 130, palette: "pastel", pathColor: "#eccc41",
      branchDensity: 0.35, fourWayFraction: 0.12, deadEndDensity: 0.5,
      pluckStyle: "string", pluckSize: 2, pluckGhost: 0.5, pluckReach: "run",
      physics: true, mazeFabric: true, pathViz: "gold",
      cameraMode: "fit", trailLength: 10, tension: 0.45, exploration: "off",
      fowRadius: 4, fowIntro: false, colorScheme: "segments",
      junctionBlend: 0.88, appearMode: "custom", appearSequence: "trace", appearSpeed: 2.2,
      appearFx: "burn",
      entranceClearance: 2.5, exitClearance: 12, junctionSpacing: 2,
      exitCorridor: 24, exitFlank: "away", exitTaperRadius: 0, exitTaperStrength: 0,
      background: "vellum", backgroundIntensity: 0.5,
      pulseReach: 3, backgroundSpeed: -1, deadEndLength: 20, hCutShare: 1,
      backgroundScale: 1, backgroundDetail: 1, backgroundFibers: 1,
      backgroundGrain: 1, backgroundAngle: -1, backgroundColorMode: "gamut",
      backgroundBase: "#151b28", backgroundAccent1: "#7ab8cd",
      backgroundAccent2: "#cdb17a", backgroundAccent3: "#aa7acd",
      settleBudget: 12, loadSettle: 0.45, physicsWorker: true,
      clock: "turn", playerPace: 10, minoWanderPace: 0.5, minoHuntPace: 0.9,
      minoPaceJitter: 0.2, minoPauseChance: 0.3, minoPauseMin: 0.5,
      minoPauseMax: 2, minoDetect: 15, minoLose: 25, minoCatch: 1,
      gameMode: "classic",
      minoDeadEnds: 0.4, minoRoam: 30, minoWake: 2, minoFog: "always",
      minoPull: 0.5, minoRefog: true,
      confettiAmount: 1, confettiShine: 1, foilShare: 0.3,
      confettiCannons: true, cannonAmount: 1, streamerShare: 0.2, cannonSpread: 0.12,
      borderWidth: 0.38, borderColor: "#000000", goldTextureStrength: 1, // K820
      loaderSpeed: 1, loaderMove: "maze", // K828
      cornerRoundShare: 1, // K830
      pluckWhole: 0.75, pluckCrossings: "through", pluckGlow: "fallback",
      pluckRipple: "glint", rippleStrength: 1, rippleAuto: 0.35,
      pluckSheen: 0.5, pluckTug: 0, tugAuto: false, autoPluckGain: 0.5,
      markerSize: 2,
      hoverGlow: 0.4,
      minotaur: "hunter", minoSpeed: "one", minoTelegraph: true, minoTelegraphLook: "rims", minoSight: 2,
      minoRoamRuns: 8, minoTerritory: 6, minoAccuracy: 0.3, minoPause: 0.1,
      minoSleep: 0,
      fireSpeed: 0.6, fireDelay: 0,
      minoRestart: false, minoLair: true,
      hoverGlowWidth: 0.85,
      hoverGlowLength: 3, hoverGlowFade: 0.2,
      pickMargin: 4, pickChoiceRatio: 1.5,
      revealDistance: 2.5, revealFade: 1, revealLook: "beacon",
      burnt: "gone",
      minoGiveUp: 3, minoRoamMin: 3, minoTurnPull: 0,
      minoGuardSight: 4, minoGuardAccuracy: 0.3, minoStalkerAccuracy: 0.3,
      fireClock: "turn",
      fireSpeedRt: 0.2, fireDelayRt: 20,
      revealFinish: true,
      revealEndCross: "under", revealEndGlow: "bright",
      minoByLength: false,
      greedyTrap: "off", trapTargetF: 2.5, trapTargetH: 3.5, trapMaxF: 6,
      trapMaxH: 8, trapMaxGrow: 1.15, trapRadius: 20, trapIters: 12,
      trapTries: 8, trapSurplus: 1.25,
      penReverse: false,
      dailyTitleThread: false,
      minoStopMin: 0.2, minoStopMax: 0.6, minoHuntStop: 0.5, minoTurnBack: 1.5,
      minoTipReach: 2, minoRoamNear: 0.25, minoTelegraphRuns: 1,
      fragile: "off", parMode: "off", parSlack: 1,
      minoGuardRoam: 30, minoGuardDetect: 20, minoGuardLose: 30,
      minoGuardAccuracyRt: 0.4, minoStalkerAccuracyRt: 0.45,
      collapse: "off",
      cut: "off", // K114
      lives: 0, // K137 stage 3a
      sword: "off", swordMoves: 8, // K137 stage 3b
      spool: false, spoolSlack: 0.3, hints: 0, compass: false, // K137 stage 2
      ice: 0, colorRule: "off", // K138 stage 1
      sprint: "off", // K137 stage 3c
      beatTempo: 100, beatLength: 2, beatCap: 4, // K114 beat rider
      turnstiles: 0, hiddenRuns: 0, // K138 stage 2
      sleepers: 0, sleepKind: "wake", // K137 stage 3d
      oneWay: 0, // K138 stage 3
      lures: 0, snares: 0, // K137 stage 4
      keys: 0, lockMode: "exit", // K138 stage 4
      snareHold: 3, lureRange: 6, hintSeconds: 2, hiddenReveal: 3, // K795
      beatTiming: "even", beatPerRun: 1, // K795 beat timing
      mud: 0, // K137 s5
      threadLook: "fill", // K797b
      goldWidth: 1, goldTexture: "solid", // K799
      minoExtras: 0, // K137 stage 6
      minoScent: 0, // K137 scent (4.34)
      darkMoves: 0, // K137 darkness (4.17)
      lantern: 1, // K137 darkness (4.17)
      sonar: false, // K137 sonar (4.26)
      sonarPings: 0, // K137 sonar (4.26)
      tunnels: 0, // K137 tunnels (4.13)
      lossAmount: 1, // K546 stage 3
      pulseColor: "#ffffff", pulseWidth: 1, hoverColor: "#ffffff", // K813
      telegraphColor: "#ff2418", telegraphWidth: 1, // K813
      frayColor: "#000000", frayWidth: 0.45, // K813
    });
  });

  // K111 stage 4: the hover glow width's override key, its clamp to
  // [0.3, 1], and the token round trip (a viewer preference like hg=).
  it("reads the hover glow width from its override key", () => {
    const p = parseParams("?7&hgw=0.6");
    expect(p.hoverGlowWidth).toBe(0.6);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    // The default stays out of the token.
    expect(encodeParams(parseParams("?7&hgw=0.85"))).toBe("7");
    expect(parseParams("?7&hgw=2").hoverGlowWidth).toBe(1);
    expect(parseParams("?7&hgw=0").hoverGlowWidth).toBe(0.3);
    expect(parseParams("?7&hgw=-1").hoverGlowWidth).toBe(0.3);
    expect(parseParams("?7&hgw=x").hoverGlowWidth).toBe(0.85);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { hoverGlowWidth: 0.1 }))}`).hoverGlowWidth
    ).toBe(0.3);
  });

  // K298: the glow's own length ([0.5, 15], world arc from the hover point)
  // and end fade ([0, 1.5], world arc in from each end gap), viewer
  // preferences like hgw=.
  it("reads the hover glow length and end fade from their override keys", () => {
    const p = parseParams("?7&hgl=6&hgf=0.5");
    expect([p.hoverGlowLength, p.hoverGlowFade]).toEqual([6, 0.5]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    expect(encodeParams(parseParams("?7&hgl=3&hgf=0.2"))).toBe("7");
    expect(parseParams("?7&hgl=40").hoverGlowLength).toBe(15);
    expect(parseParams("?7&hgl=0").hoverGlowLength).toBe(0.5);
    expect(parseParams("?7&hgl=x").hoverGlowLength).toBe(3);
    expect(parseParams("?7&hgf=9").hoverGlowFade).toBe(1.5);
    expect(parseParams("?7&hgf=-1").hoverGlowFade).toBe(0);
    expect(parseParams("?7&hgf=0").hoverGlowFade).toBe(0);
    expect(parseParams("?7&hgf=x").hoverGlowFade).toBe(0.2);
    const q = parseParams(`?${encodeParams(withSeed(7, { hoverGlowLength: 99, hoverGlowFade: -3 }))}`);
    expect([q.hoverGlowLength, q.hoverGlowFade]).toEqual([15, 0]);
  });

  // K298: the mouse pick margin ([0, 20] CSS px past a thread's edge) and
  // the choices' ratio to it ([1, 4]), viewer preferences like hgl=.
  it("reads the pick margin and the choice ratio from their override keys", () => {
    const p = parseParams("?7&pkm=2.5&pkr=2");
    expect([p.pickMargin, p.pickChoiceRatio]).toEqual([2.5, 2]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    expect(encodeParams(parseParams("?7&pkm=4&pkr=1.5"))).toBe("7");
    expect(parseParams("?7&pkm=30").pickMargin).toBe(20);
    expect(parseParams("?7&pkm=-1").pickMargin).toBe(0);
    expect(parseParams("?7&pkm=0").pickMargin).toBe(0);
    expect(parseParams("?7&pkm=x").pickMargin).toBe(4);
    expect(parseParams("?7&pkr=9").pickChoiceRatio).toBe(4);
    expect(parseParams("?7&pkr=0.5").pickChoiceRatio).toBe(1);
    expect(parseParams("?7&pkr=x").pickChoiceRatio).toBe(1.5);
    const q = parseParams(`?${encodeParams(withSeed(7, { pickMargin: 99, pickChoiceRatio: -3 }))}`);
    expect([q.pickMargin, q.pickChoiceRatio]).toEqual([20, 1]);
  });

  // K98: the marker size's override key, its clamp to [0.25, 3], and the
  // token round trip.
  it("reads the marker size from its override key", () => {
    const p = parseParams("?7&mks=1.5");
    expect(p.markerSize).toBe(1.5);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    // The default (2 since K225; 1.08 before) stays out of the token, and
    // the old default is now an ordinary listed value.
    expect(encodeParams(parseParams("?7&mks=2"))).toBe("7");
    expect(encodeParams(parseParams("?7&mks=1.08"))).not.toBe("7");
    expect(parseParams("?7&mks=1.08").markerSize).toBe(1.08);
    expect(parseParams("?7&mks=9").markerSize).toBe(3);
    expect(parseParams("?7&mks=0").markerSize).toBe(0.25);
    expect(parseParams("?7&mks=-1").markerSize).toBe(0.25);
    expect(parseParams("?7&mks=x").markerSize).toBe(2);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { markerSize: 7 }))}`).markerSize
    ).toBe(3);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { markerSize: 0.1 }))}`).markerSize
    ).toBe(0.25);
  });

  // K272 (K80 turns stage 2): roam and territory start at one run, from an
  // override key or a token; K273's catch toggles round-trip.
  it("keeps the turn minotaur's roam and territory at one run or more", () => {
    const p = parseParams("?7&mro=0&mtr=0");
    expect([p.minoRoamRuns, p.minoTerritory]).toEqual([1, 1]);
    const q = parseParams(`?${encodeParams(withSeed(7, { minoRoamRuns: 0, minoTerritory: 0 }))}`);
    expect([q.minoRoamRuns, q.minoTerritory]).toEqual([1, 1]);
    expect(parseParams("?7&mro=3").minoRoamRuns).toBe(3);
    const r = parseParams("?7&mrs=1&mlr=0");
    expect([r.minoRestart, r.minoLair]).toEqual([true, false]);
    expect(parseParams(`?${encodeParams(r)}`)).toEqual(r);
  });

  // K114/K323: the burn race is gameMode burn (`fi=fuse` implies it; `gm`
  // names it directly), with its clamps and the token round trip.
  it("reads the burn race from its override keys", () => {
    // 0.5, not the default (0.6 since K280; 0.75 before), so the token lists it.
    const p = parseParams("?7&fi=fuse&fsp=0.5&fdl=12.5");
    expect(p.gameMode).toBe("burn");
    expect(parseParams("?7&gm=burn&fsp=0.5&fdl=12.5").gameMode).toBe("burn");
    expect(parseParams("?7&gm=classic").gameMode).toBe("classic");
    expect([p.fireSpeed, p.fireDelay]).toEqual([0.5, 12.5]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    expect(fireSettingsOf(p)).toEqual({ speed: 0.5, delay: 12.5, clock: "turn" });
    // Clamps: speed to [0.1, 0.95] (K440 lowered the floor from 0.3;
    // garbage = the default, 0.6), delay to [0, 40].
    expect(parseParams("?7&fsp=2").fireSpeed).toBe(0.95);
    expect(parseParams("?7&fsp=0").fireSpeed).toBe(0.1);
    expect(parseParams("?7&fsp=0.05").fireSpeed).toBe(0.1);
    expect(parseParams("?7&fsp=0.25").fireSpeed).toBe(0.25);
    expect(parseParams("?7&fsp=x").fireSpeed).toBe(0.6);
    // The old default is an ordinary listed value now.
    expect(parseParams("?7&fsp=0.75").fireSpeed).toBe(0.75);
    expect(encodeParams(parseParams("?7&fsp=0.75"))).not.toBe("7");
    expect(encodeParams(parseParams("?7&fsp=0.6"))).toBe("7");
    expect(parseParams("?7&fdl=99").fireDelay).toBe(40);
    expect(parseParams("?7&fdl=-3").fireDelay).toBe(0);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { fireSpeed: 3, fireDelay: 77 }))}`)
    ).toMatchObject({ fireSpeed: 0.95, fireDelay: 40 });
    // Classic by default; the maze clock and the model no longer refuse
    // it (the modes are exclusive by construction).
    expect(fireSettingsOf(PARAM_DEFAULTS)).toBeNull();
    expect(fireSettingsOf({ ...p, gameMode: "classic" })).toBeNull();
    expect(fireSettingsOf({ ...p, clock: "realtime" })).toEqual({
      speed: 0.5, delay: 12.5, clock: "turn",
    });
    expect(fireSettingsOf({ ...p, minotaur: "guard" })).toEqual({
      speed: 0.5, delay: 12.5, clock: "turn",
    });
    expect(fireSettingsOf(parseParams("?7&fi=fuse"))).toEqual({
      speed: 0.6,
      delay: 0,
      clock: "turn",
    });
  });

  // K114 stage 2: the fire clock's override key, the token round trip, and
  // fireSettingsOf carrying it (null only outside the burn mode).
  it("reads the fire clock and carries it in fireSettingsOf", () => {
    const p = parseParams("?7&fi=fuse&fck=realtime");
    expect(p.fireClock).toBe("realtime");
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    // K440: the real-time clock's own pair.
    expect(fireSettingsOf(p)).toEqual({ speed: 0.2, delay: 20, clock: "realtime" });
    expect(parseParams("?7&fck=nope").fireClock).toBe("turn");
    expect(fireSettingsOf({ ...p, gameMode: "minotaur" })).toBeNull();
    expect(fireSettingsOf({ ...p, clock: "realtime" })).toEqual({
      speed: 0.2, delay: 20, clock: "realtime",
    });
  });

  // K440 (Levi, 2026-10-15): the real-time fire has its own speed and delay
  // (fsr 0.2, fdr 20); the turn clock keeps fsp 0.6 / fdl 0 (0.75 / 0 until
  // K280, 2026-10-20). Each clock
  // plays its own pair, both clamp like the turn pair did (speed to [0.1,
  // 0.95] since K440, delay to [0, 40]), and a link lists neither while it
  // holds its default.
  it("plays each fire clock's own speed and delay", () => {
    // The bare real-time link plays 0.2 / 20 and lists neither.
    const rt = parseParams("?7&fi=fuse&fck=realtime");
    expect([rt.fireSpeedRt, rt.fireDelayRt]).toEqual([0.2, 20]);
    const token = encodeParams(rt);
    const decoded = decodeToken(token, PARAM_DEFAULTS as unknown as CodecDefaults);
    expect(decoded.error).toBeNull();
    const listed = Object.keys(decoded.values).filter(
      (k) => decoded.values[k] !== (PARAM_DEFAULTS as unknown as CodecDefaults)[k]
    );
    expect(listed.sort()).toEqual(["fireClock", "gameMode"]);
    expect(parseParams(`?${token}`)).toEqual(rt);
    // The turn link keeps 0.6 / 0, whatever the real-time pair holds.
    const turn = parseParams("?7&fi=fuse");
    expect(fireSettingsOf(turn)).toEqual({ speed: 0.6, delay: 0, clock: "turn" });
    expect(
      fireSettingsOf({ ...turn, fireSpeedRt: 0.5, fireDelayRt: 33 })
    ).toEqual({ speed: 0.6, delay: 0, clock: "turn" });
    // And the real-time clock ignores the turn pair.
    expect(
      fireSettingsOf({ ...rt, fireSpeed: 0.9, fireDelay: 7 })
    ).toEqual({ speed: 0.2, delay: 20, clock: "realtime" });
    // Override keys, and the token round trip of a changed pair.
    const set = parseParams("?7&fi=fuse&fck=realtime&fsr=0.35&fdr=30");
    expect([set.fireSpeedRt, set.fireDelayRt]).toEqual([0.35, 30]);
    expect([set.fireSpeed, set.fireDelay]).toEqual([0.6, 0]);
    expect(fireSettingsOf(set)).toEqual({ speed: 0.35, delay: 30, clock: "realtime" });
    expect(parseParams(`?${encodeParams(set)}`)).toEqual(set);
    // Clamps: speed to [0.1, 0.95] (garbage = the real-time default),
    // delay to [0, 40], from override keys and tokens alike.
    expect(parseParams("?7&fsr=0").fireSpeedRt).toBe(0.1);
    expect(parseParams("?7&fsr=0.05").fireSpeedRt).toBe(0.1);
    expect(parseParams("?7&fsr=0.1").fireSpeedRt).toBe(0.1);
    expect(parseParams("?7&fsr=2").fireSpeedRt).toBe(0.95);
    expect(parseParams("?7&fsr=x").fireSpeedRt).toBe(0.2);
    expect(parseParams("?7&fdr=99").fireDelayRt).toBe(40);
    expect(parseParams("?7&fdr=-3").fireDelayRt).toBe(0);
    expect(parseParams("?7&fdr=x").fireDelayRt).toBe(20);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { fireSpeedRt: 3, fireDelayRt: 77 }))}`)
    ).toMatchObject({ fireSpeedRt: 0.95, fireDelayRt: 40 });
    expect(
      parseParams(`?${encodeParams(withSeed(7, { fireSpeedRt: 0.02, fireDelayRt: -5 }))}`)
    ).toMatchObject({ fireSpeedRt: 0.1, fireDelayRt: 0 });
    // fireSettingsOf clamps what it is handed (a panel edit, an undo).
    expect(
      fireSettingsOf({ ...rt, fireSpeedRt: 0, fireDelayRt: 99 })
    ).toEqual({ speed: 0.1, delay: 40, clock: "realtime" });
    expect(
      fireSettingsOf({ ...rt, fireSpeedRt: NaN })
    ).toEqual({ speed: 0.2, delay: 20, clock: "realtime" });
    expect(
      fireSettingsOf({ ...turn, fireSpeed: 0.05 })
    ).toEqual({ speed: 0.1, delay: 0, clock: "turn" });
  });

  // K465 (Levi, 2026-10-15: "With the thread reveal mode, we should show
  // where the destination marker is, by default"): the finish shows from the
  // start under the thread reveal. `rvx` is the flag's override key; the
  // default is on, so a link lists it only when it is off.
  it("reads the reveal's show-finish flag from rvx", () => {
    expect(PARAM_DEFAULTS.revealFinish).toBe(true);
    expect(parseParams("?7").revealFinish).toBe(true);
    expect(parseParams("?7&xp=threads").revealFinish).toBe(true);
    const off = parseParams("?7&xp=threads&rvx=0");
    expect(off.revealFinish).toBe(false);
    expect(off.exploration).toBe("threads");
    // The token round trip keeps it.
    expect(parseParams(`?${encodeParams(off)}`)).toEqual(off);
    const defaults = PARAM_DEFAULTS as unknown as CodecDefaults;
    const decoded = decodeToken(encodeParams(off), defaults);
    expect(decoded.error).toBeNull();
    expect(
      Object.keys(decoded.values)
        .filter((k) => decoded.values[k] !== defaults[k])
        .sort()
    ).toEqual(["exploration", "revealFinish"]);
    // On is the default: it stays out of the token, a bare rvx=1 is no link
    // setting, and garbage reads as the default.
    expect(encodeParams(parseParams("?7&rvx=1"))).toBe("7");
    expect(encodeParams(parseParams("?7&xp=threads"))).not.toContain("rvx");
    expect(parseParams("?7&rvx=x").revealFinish).toBe(true);
    // An override after a token wins over the token's own value.
    const token = encodeParams(off);
    expect(parseParams(`?${token}&rvx=1`).revealFinish).toBe(true);
    // The look of the reveal is independent: neither key moves the other.
    const both = parseParams("?7&xp=threads&rvx=0&rvl=dots&rvd=4");
    expect([both.revealFinish, both.revealLook, both.revealDistance]).toEqual([
      false, "dots", 4,
    ]);
    expect(parseParams(`?${encodeParams(both)}`)).toEqual(both);
  });

  // K466 (Levi, 2026-10-15: "emphasize the unexplored thread ends a bit
  // more, maybe especially for ends that lie under a crossing"): where a
  // frontier ends at a crossing (`rve`: under | past | back) and the end's
  // halo (`rvg`: soft | bright). A link lists them only off the default.
  it("reads the reveal's end params from rve and rvg", () => {
    expect(REVEAL_END_CROSSES).toEqual(["under", "past", "back"]);
    expect(REVEAL_END_GLOWS).toEqual(["soft", "bright"]);
    const D = PARAM_DEFAULTS;
    for (const c of REVEAL_END_CROSSES) {
      for (const g of REVEAL_END_GLOWS) {
        const p = parseParams(`?7&xp=threads&rve=${c}&rvg=${g}`);
        expect([p.revealEndCross, p.revealEndGlow]).toEqual([c, g]);
        expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
        const defaults = D as unknown as CodecDefaults;
        const decoded = decodeToken(encodeParams(p), defaults);
        expect(decoded.error).toBeNull();
        const listed = Object.keys(decoded.values).filter((k) => decoded.values[k] !== defaults[k]).sort();
        const want = ["exploration"];
        if (c !== D.revealEndCross) want.push("revealEndCross");
        if (g !== D.revealEndGlow) want.push("revealEndGlow");
        expect(listed).toEqual(want.sort());
      }
    }
    // Garbage reads as the default, and the defaults stay out of the token.
    expect(parseParams("?7&rve=x").revealEndCross).toBe(D.revealEndCross);
    expect(parseParams("?7&rvg=x").revealEndGlow).toBe(D.revealEndGlow);
    expect(encodeParams(parseParams(`?7&rve=${D.revealEndCross}&rvg=${D.revealEndGlow}`))).toBe("7");
    // An override after a token wins over the token's own value.
    const other = REVEAL_END_CROSSES.find((c) => c !== D.revealEndCross)!;
    const token = encodeParams(parseParams(`?7&rve=${other}`));
    expect(parseParams(`?${token}`).revealEndCross).toBe(other);
    expect(parseParams(`?${token}&rve=${D.revealEndCross}`).revealEndCross).toBe(D.revealEndCross);
  });
  // K140/K323: the finish confetti amount (0 = none; the old `cf`
  // switch is ignored), its clamp, and the token round trip.
  it("reads the finish confetti from override keys", () => {
    const off = parseParams("?7&cfa=0");
    expect(off.confettiAmount).toBe(0);
    expect(parseParams("?7&cf=0").confettiAmount).toBe(1);
    const lots = parseParams("?7&cfa=2.5");
    expect(lots.confettiAmount).toBe(2.5);
    expect(parseParams(`?${encodeParams(lots)}`)).toEqual(lots);
    expect(parseParams(`?${encodeParams(off)}`)).toEqual(off);
    // The amount clamps to [0, 3]; garbage reads as the default.
    expect(parseParams("?7&cfa=9").confettiAmount).toBe(3);
    expect(parseParams("?7&cfa=-1").confettiAmount).toBe(0);
    expect(parseParams("?7&cfa=x").confettiAmount).toBe(1);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { confettiAmount: 7 }))}`).confettiAmount
    ).toBe(3);
  });
  // K337: the confetti's shine and foil share, their clamps and the round
  // trip.
  it("reads the confetti shine and foil share from override keys", () => {
    const p = parseParams("?7&cfh=1.5&cff=0.6");
    expect([p.confettiShine, p.foilShare]).toEqual([1.5, 0.6]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    const off = parseParams("?7&cfh=0&cff=0");
    expect([off.confettiShine, off.foilShare]).toEqual([0, 0]);
    expect(parseParams(`?${encodeParams(off)}`)).toEqual(off);
    // The strength clamps to [0, 2] and the share to [0, 1]; garbage reads
    // as the default.
    expect(parseParams("?7&cfh=9").confettiShine).toBe(2);
    expect(parseParams("?7&cfh=-1").confettiShine).toBe(0);
    expect(parseParams("?7&cfh=x").confettiShine).toBe(PARAM_DEFAULTS.confettiShine);
    expect(parseParams("?7&cff=3").foilShare).toBe(1);
    expect(parseParams("?7&cff=-1").foilShare).toBe(0);
    expect(parseParams("?7&cff=x").foilShare).toBe(PARAM_DEFAULTS.foilShare);
    const big = withSeed(7, { confettiShine: 7, foilShare: 7 });
    const back = parseParams(`?${encodeParams(big)}`);
    expect([back.confettiShine, back.foilShare]).toEqual([2, 1]);
  });
  // K336: the side cannons' switch and amount, the clamp and the round trip.
  it("reads the side cannons and their amount from override keys", () => {
    const p = parseParams("?7&cfc=0&cfn=2.5");
    expect([p.confettiCannons, p.cannonAmount]).toEqual([false, 2.5]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    expect(parseParams("?7&cfc=1").confettiCannons).toBe(true);
    expect(parseParams("?7&cfn=9").cannonAmount).toBe(3);
    expect(parseParams("?7&cfn=-1").cannonAmount).toBe(0);
    expect(parseParams("?7&cfn=x").cannonAmount).toBe(PARAM_DEFAULTS.cannonAmount);
    const big = withSeed(7, { cannonAmount: 7 });
    expect(parseParams(`?${encodeParams(big)}`).cannonAmount).toBe(3);
    const q = parseParams("?7&cfs=0.45");
    expect(q.streamerShare).toBe(0.45);
    expect(parseParams(`?${encodeParams(q)}`)).toEqual(q);
    expect(parseParams("?7&cfs=4").streamerShare).toBe(1);
    expect(parseParams("?7&cfs=-1").streamerShare).toBe(0);
  });

  // K180: the pluck params' override keys, the whole amount's clamp, the
  // option lists, and the token round trip.
  it("reads the pluck params from override keys", () => {
    // pgl=with, not the default (fallback since K194; off before).
    const p = parseParams("?7&pw=1&pcx=ride&pgl=with");
    expect([p.pluckWhole, p.pluckCrossings, p.pluckGlow]).toEqual([
      1, "ride", "with",
    ]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    for (const pcx of ["through", "ride", "pinch"]) {
      expect(parseParams(`?7&pcx=${pcx}`).pluckCrossings).toBe(pcx);
    }
    for (const pgl of ["off", "instead", "with", "fallback"]) {
      const q = parseParams(`?7&pgl=${pgl}`);
      expect(q.pluckGlow).toBe(pgl);
      expect(parseParams(`?${encodeParams(q)}`)).toEqual(q);
    }
    // Defaults stay out of the token; unknown options read as the default.
    expect(encodeParams(parseParams("?7&pw=0.75&pcx=through&pgl=fallback"))).toBe("7");
    // K194: off (K104's look) is a listed value now.
    expect(encodeParams(parseParams("?7&pgl=off"))).not.toBe("7");
    expect(parseParams("?7&pgl=off").pluckGlow).toBe("off");
    expect(parseParams("?7&pcx=wobble").pluckCrossings).toBe("through");
    expect(parseParams("?7&pgl=bright").pluckGlow).toBe("fallback");
    // The amount clamps to [0, 1.5]; garbage reads as the default.
    expect(parseParams("?7&pw=9").pluckWhole).toBe(1.5);
    expect(parseParams("?7&pw=-1").pluckWhole).toBe(0);
    expect(parseParams("?7&pw=x").pluckWhole).toBe(0.75);
    expect(parseParams("?7&pw=0").pluckWhole).toBe(0);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { pluckWhole: 4 }))}`).pluckWhole
    ).toBe(1.5);
  });

  // K279: the pluck emphasis params' override keys, clamps and options.
  it("reads the pluck emphasis params from override keys", () => {
    const p = parseParams("?7&prp=ring&prs=1.5&pra=0&psh=1&ptg=0.5&pta=1&pag=1");
    expect([
      p.pluckRipple, p.rippleStrength, p.rippleAuto, p.pluckSheen, p.pluckTug,
      p.tugAuto, p.autoPluckGain,
    ]).toEqual(["ring", 1.5, 0, 1, 0.5, true, 1]);
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    for (const prp of ["off", "wave", "glint", "ring"]) {
      expect(parseParams(`?7&prp=${prp}`).pluckRipple).toBe(prp);
    }
    expect(parseParams("?7&prp=splash").pluckRipple).toBe("glint");
    // Strengths clamp to [0, 2], the rest to [0, 1].
    expect(parseParams("?7&prs=9&pra=-1").rippleStrength).toBe(2);
    expect(parseParams("?7&prs=9&pra=-1").rippleAuto).toBe(0);
    expect(parseParams("?7&psh=3&ptg=-2&pag=4").pluckSheen).toBe(1);
    expect(parseParams("?7&psh=3&ptg=-2&pag=4").pluckTug).toBe(0);
    expect(parseParams("?7&psh=3&ptg=-2&pag=4").autoPluckGain).toBe(1);
    expect(
      parseParams(`?${encodeParams(withSeed(7, { rippleStrength: 5 }))}`).rippleStrength
    ).toBe(2);
  });

  // K80: the chase's defaults are the simulation-picked tuning; a retune
  // edits DEFAULT_CHASE_PARAMS (PARAM_DEFAULTS reads it) and the pin above.
  it("reads the chase tuning as DEFAULT_CHASE_PARAMS", () => {
    expect(chaseParamsOf(PARAM_DEFAULTS)).toEqual({ ...DEFAULT_CHASE_PARAMS });
  });

  // K174: the minotaur's paces are fractions of the player's, taken in
  // chaseParamsOf; the defaults' products are exact (5 and 9 since K324's
  // re-tune raised the hunt fraction to 0.9).
  it("reads the minotaur's paces as fractions of the player's", () => {
    const d = chaseParamsOf(PARAM_DEFAULTS);
    expect(d.wanderPace).toBe(5);
    expect(d.approachPace).toBe(9);
    const fast = chaseParamsOf(parseParams("?7&plp=20"));
    expect(fast.wanderPace).toBe(10);
    expect(fast.approachPace).toBe(18);
    expect(chaseParamsOf(parseParams("?7&mpl=0")).roamPull).toBe(0);
    expect(chaseParamsOf(parseParams("?7&mpl=0.5")).roamPull).toBe(DEFAULT_CHASE_PARAMS.roamPull);
    expect(chaseParamsOf(parseParams("?7&mpl=1")).roamPull).toBe(1);
  });

  it("scopes the clock to the minotaur (clockOf, K323)", () => {
    expect(clockOf(parseParams("?7&gm=minotaur&clk=realtime"))).toBe("realtime");
    expect(clockOf(parseParams("?7&gm=classic&clk=realtime"))).toBe("turn");
    expect(clockOf(parseParams("?7&gm=burn&clk=realtime"))).toBe("turn");
    expect(clockOf(parseParams("?7&gm=minotaur"))).toBe("turn");
    const m = parseParams("?7&gm=minotaur&clk=realtime&mt=guard");
    expect(parseParams(`?${encodeParams(m)}`)).toEqual(m);
  });

  it("reads the real-time mode from override keys", () => {
    const p = parseParams(
      "?7&clk=realtime&plp=12&mwp=0.25&mhp=0.75&mpj=0.1&mpc=0.5&mpn=1&mpx=3" +
        "&mdt=10&mls=20&mct=1.5&mde=0.6&mrm=40&mwk=3&mfg=hunting&mpl=0&mrf=0&mlr=0" +
        "&mhn=0.1&mhx=0.4&mhh=0.25&mrv=2&mdr=1.5&mnr=0.5&mtn=2"
    );
    expect(p.clock).toBe("realtime");
    expect(chaseParamsOf(p)).toEqual({
      playerPace: 12, wanderPace: 3, approachPace: 9, paceJitter: 0.1,
      pauseChance: 0.5, pauseMin: 1, pauseMax: 3, detectStart: 10,
      detectEnd: 20, catchDist: 1.5, deadEndBias: 0.6, roamRange: 40, wake: 3,
      roamPull: 0, lair: false,
      stopMin: 0.1, stopMax: 0.4, huntStop: 0.25, turnBack: 2, tipReach: 1.5,
      roamNear: 0.5,
      model: "hunter", territory: 30, guardDetect: 20, guardLose: 30,
      guardAccuracy: 0.4, stalkerAccuracy: 0.45,
    });
    // The telegraph's reach is the renderer's (stage 2), not the chase's.
    expect(p.minoTelegraphRuns).toBe(2);
    expect(chaseParamsOf(parseParams("?7&clk=realtime")).lair).toBe(true);
    expect(p.gameMode).toBe("minotaur");
    expect(p.minoFog).toBe("hunting");
    expect(p.minoPull).toBe(0);
    expect(p.minoRefog).toBe(false);
    // An unknown clock reads as the default; the token round-trips the mode.
    expect(parseParams("?7&clk=tempo").clock).toBe("turn");
    expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
  });

  it("reads K114's beat clock in every game mode", () => {
    for (const mode of ["", "&mt=hunter", "&fi=fuse"]) {
      const p = parseParams(`?7&clk=beat${mode}`);
      expect(p.clock).toBe("beat");
      expect(clockOf(p)).toBe("beat");
      expect(minoClockOf(p)).toBe("turn");
      expect(beatSettingsOf(p)).toEqual({ tempo: 100, unit: 2, cap: 4, timing: "even", perRun: 1 });
      expect(parseParams(`?${encodeParams(p)}`)).toEqual(p);
    }
    // realtime stays the minotaur's alone.
    expect(clockOf(parseParams("?7&clk=realtime"))).toBe("realtime");
    expect(clockOf(parseParams("?7&clk=realtime&fi=fuse&mt=off"))).toBe("turn");
    // The beat params clamp; off the beat clock there are no settings.
    const q = parseParams("?7&clk=beat&btp=999&btl=0.01&btc=0&btr=9");
    expect(beatSettingsOf(q)).toEqual({ tempo: 180, unit: 0.5, cap: 1, timing: "even", perRun: 4 });
    // K795: the length timing (K114's rule) by link; the beats round and
    // clamp to 1..4; an unknown timing reads as even.
    const l = parseParams("?7&clk=beat&btm=length&btr=0");
    expect(beatSettingsOf(l)).toEqual({ tempo: 100, unit: 2, cap: 4, timing: "length", perRun: 1 });
    expect(l.beatPerRun).toBe(1); // clamped to the floor, the default
    expect(beatSettingsOf(parseParams("?7&clk=beat&btr=2.6"))?.perRun).toBe(3);
    expect(parseParams("?7&clk=beat&btm=swing").beatTiming).toBe("even");
    expect(parseParams(`?${encodeParams(l)}`)).toEqual(l);
    expect(beatSettingsOf(parseParams("?7&btp=90"))).toBeNull();
    // Under beat the cut (and so the walker) is off, the fire on turn.
    const r = parseParams("?7&clk=beat&ct=lead&fi=fuse&fck=realtime");
    expect(fabricRulesOf(r).cut).toBe("off");
    expect(fireSettingsOf(r)?.clock).toBe("turn");
  });

  // K324: the link keeps both stop lengths as written; the chase reads the
  // max held at least the min. Every new knob clamps to its range.
  it("orders the junction stop pair and clamps K324's knobs", () => {
    const p = parseParams("?7&clk=realtime&mhn=0.8&mhx=0.3");
    expect([p.minoStopMin, p.minoStopMax]).toEqual([0.8, 0.3]);
    const c = chaseParamsOf(p);
    expect([c.stopMin, c.stopMax]).toEqual([0.8, 0.8]);
    const pick = (q: UrlParams) => [
      q.minoStopMin, q.minoStopMax, q.minoHuntStop, q.minoTurnBack,
      q.minoTipReach, q.minoRoamNear, q.minoTelegraphRuns,
    ];
    expect(pick(parseParams("?7&mhn=5&mhx=9&mhh=2&mrv=20&mdr=9&mnr=3&mtn=7"))).toEqual([
      2, 2, 1, 10, 4, 1, 3,
    ]);
    expect(pick(parseParams("?7&mhn=-1&mhx=-1&mhh=-1&mrv=-1&mdr=0&mnr=-1&mtn=-1"))).toEqual([
      0, 0, 0, 0, 0.5, 0, 0,
    ]);
    // The same clamps through a token.
    const big = withSeed(7, { minoStopMax: 9, minoTipReach: 9, minoTelegraphRuns: 7 });
    const back = parseParams(`?${encodeParams(big)}`);
    expect([back.minoStopMax, back.minoTipReach, back.minoTelegraphRuns]).toEqual([2, 4, 3]);
  });

  // K324 stage 3: the Behavior row picks the real-time model too, and the
  // guard's and stalker's knobs read from their own keys, clamped.
  it("reads the real-time guard and stalker", () => {
    const g = parseParams("?7&clk=realtime&mt=guard&mgr=20&mgd=12&mgl=18&mgx=0.4&msx=0.9");
    const c = chaseParamsOf(g);
    expect([c.model, c.territory, c.guardDetect, c.guardLose]).toEqual(["guard", 20, 12, 18]);
    expect([c.guardAccuracy, c.stalkerAccuracy]).toEqual([0.4, 0.9]);
    expect(parseParams(`?${encodeParams(g)}`)).toEqual(g);
    expect(chaseParamsOf(parseParams("?7&clk=realtime&mt=stalker")).model).toBe("stalker");
    expect(chaseParamsOf(parseParams("?7&clk=realtime&mt=hunter")).model).toBe("hunter");
    const pick = (q: UrlParams) => [
      q.minoGuardRoam, q.minoGuardDetect, q.minoGuardLose,
      q.minoGuardAccuracyRt, q.minoStalkerAccuracyRt,
    ];
    expect(pick(parseParams("?7&mgr=999&mgd=999&mgl=999&mgx=3&msx=3"))).toEqual([
      150, 100, 150, 1, 1,
    ]);
    expect(pick(parseParams("?7&mgr=-1&mgd=-1&mgl=-1&mgx=-1&msx=-1"))).toEqual([
      5, 0, 0, 0, 0,
    ]);
  });

  it("keeps the maze-plan knobs equal to DEFAULT_MAZE_PARAMS", () => {
    // One tuning: a link (or a daily) that leaves them out builds with the
    // maze plan's own defaults.
    expect({
      entranceClearance: DEFAULT_MAZE_PARAMS.entranceClearance,
      exitClearance: DEFAULT_MAZE_PARAMS.exitClearance,
      junctionSpacing: DEFAULT_MAZE_PARAMS.junctionSpacing,
      deadEndLength: DEFAULT_MAZE_PARAMS.deadEndLength,
      hCutShare: DEFAULT_MAZE_PARAMS.hCutShare,
    }).toEqual({
      entranceClearance: PARAM_DEFAULTS.entranceClearance,
      exitClearance: PARAM_DEFAULTS.exitClearance,
      junctionSpacing: PARAM_DEFAULTS.junctionSpacing,
      deadEndLength: PARAM_DEFAULTS.deadEndLength,
      hCutShare: PARAM_DEFAULTS.hCutShare,
    });
  });

  it("is the bare seed for an all-default design", () => {
    expect(encodeParams(withSeed(2430477599))).toBe("1471kin");
    // A sentence period, a URLSearchParams "=", the all-default blob (".EQ")
    // and the ones earlier builds wrote (".N", codec v6, ".L", v5, and
    // ".J", v4: each warns) read the same.
    const warn = warnings();
    for (const q of [
      "?1471kin", "1471kin", "?1471kin.", "?1471kin=", "?1471kin.EQ", "?1471kin.P", "?1471kin.N", "?1471kin.L", "?1471kin.J",
    ]) {
      expect(parseParams(q)).toEqual(withSeed(2430477599));
    }
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it("packs the user's rect design into one token", () => {
    expect(encodeParams(USER)).toBe(USER_COMPACT);
    expect(USER_COMPACT.length).toBe(56);
    expect(USER_KEYS.length).toBe(121);
    expect(parseParams("?" + USER_COMPACT)).toEqual(USER);
    expect(parseParams("?" + USER_KEYS)).toEqual(USER);
  });

  // K132: one live codec table. A token of another version (v1-v3, written
  // before K132) keeps its seed and reads today's defaults, with one warning.
  it("reads another version's token as its seed at today's defaults", () => {
    const old: Array<[string, number]> = [
      ["?7.c", 7], // all-default, v3
      ["?7.U", 7], // all-default, v2
      ["?7.aByQ", 7], // a preset, v3
      ["?1471kin.hGJeJH4_ol9B-mT9CXoqT4fol-NCvnoY8UYl6JbGRMCRUPg", 2430477599], // v1
      ["?1471kin.QSiXiR-P6JfQfpk_Ql6Kk-H6JfjQr56GPFGJeiWxkTB4eyof", 2430477599], // v2
      ["?1471kin.YTiXiR-P6JfQfpk_Ql6Kk-H6JfjQr56GPFGJeiWxkTB4eyofQ-", 2430477599], // v3
      ["?1z141z3.Z0YbTfDwtYr7_9JKK", 4294967295], // v3
    ];
    for (const [q, seed] of old) {
      const warn = warnings();
      expect([q, parseParams(q)]).toEqual([q, withSeed(seed)]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]![0])).toMatch(/old link version [123]\b/);
      warn.mockRestore();
    }
    // Override keys after it still apply (a probe's &am=instant).
    const warn = warnings();
    expect(parseParams("?7.c&am=instant&gs=12")).toEqual(
      withSeed(7, { appearMode: "instant", appearSequence: "instant", gridSize: 12 })
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });

  // K398: a link cannot leave the panel's ranges - gs 66 in knot mode
  // would need 16384 GAP rows, past the Pixel's 8192, and every gap
  // vanishes. Both readers clamp (key=value in readNumber's table, the
  // token in the codec's number reader).
  it("clamps link values to the panel ranges (K398)", () => {
    expect(parseParams("?s=7&gs=66").gridSize).toBe(24);
    expect(parseParams("?s=7&gs=2").gridSize).toBe(4);
    expect(parseParams("?s=7&tw=9").threadWidth).toBe(0.8);
    expect(parseParams("?s=7&rep=99").repulsion).toBe(1.8);
    expect(parseParams("?s=7&rep=0").repulsion).toBe(0.4);
    expect(parseParams("?7&gs=66").gridSize).toBe(24);
    const token = encodeParams(withSeed(7, { gridSize: 66, threadWidth: 9 }));
    expect(parseParams(`?${token}`).gridSize).toBe(24);
    expect(parseParams(`?${token}`).threadWidth).toBe(0.8);
    // The codec itself stays lossless; the app's readers clamp.
    const decoded = decodeToken(token, PARAM_DEFAULTS as unknown as CodecDefaults);
    expect(decoded.error).toBeNull();
    // In-range values pass through untouched.
    expect(parseParams("?s=7&gs=12&tw=.64").gridSize).toBe(12);
    expect(parseParams("?s=7&gs=12&tw=.64").threadWidth).toBe(0.64);
  });

  it("round-trips changed params at their written precision", () => {
    const p = withSeed(4294967295, {
      threadWidth: 0.6000000000000001, // slider-step float noise
      gap: 0,
      shape: "ring",
      physics: false,
      pathColor: "#ffd24a",
      hueShift: -15,
    });
    const q = encodeParams(p);
    expect(q).toBe("1z141z3.EHRhtN8PCtivv_0koKg");
    expect(parseParams("?" + q)).toEqual({ ...p, threadWidth: 0.6 });
  });

  it("drops float noise that equals a default", () => {
    expect(encodeParams(withSeed(7, { repulsion: 1.4500000000000002 }))).toBe("7");
    expect(encodeParams(withSeed(7, { junctionBlend: 0.8800000000000001 }))).toBe("7");
    expect(encodeParams(withSeed(7, { pluckSize: 2.0000000000000004 }))).toBe("7");
    expect(encodeParams(withSeed(7, { trailLength: 10.000000000000002 }))).toBe("7");
  });

  it("leaves out appearance values a mode implies", () => {
    const preset = withSeed(7, {
      appearMode: "trace-rainbow",
      appearSequence: "trace",
      appearFx: "rainbow",
      appearSpeed: 2,
    });
    expect(encodeParams(preset)).toBe("7.EIGxA");
    expect(parseParams("?7.EIGxA")).toEqual(preset);
    const instant = withSeed(7, {
      appearMode: "instant",
      appearSequence: "instant",
    });
    expect(encodeParams(instant)).toBe("7.EIG0");
    expect(parseParams("?7.EIG0")).toEqual(instant);
    const custom = withSeed(7, { appearFx: "dust" });
    expect(encodeParams(custom)).toBe("7.EIHJA");
    expect(parseParams("?7.EIHJA")).toEqual(custom);
    // Every preset round-trips, values implied.
    for (const id of Object.keys(APPEAR_PRESETS) as AppearPreset[]) {
      const p = withSeed(9, { appearMode: id });
      applyAppearMode(p);
      expect(parseParams("?" + encodeParams(p))).toEqual(p);
    }
  });

  it("re-rolls a random appearance on every load", () => {
    const q = encodeParams(withSeed(7, { appearMode: "random" }));
    const seen = new Set<string>();
    for (let k = 0; k < 40; k++) {
      const p = parseParams("?" + q);
      expect(p.appearMode).toBe("random");
      expect(p.appearSequence).not.toBe("instant");
      expect(p.appearFx).not.toBe("none");
      expect(encodeParams(p)).toBe(q);
      seen.add(`${p.appearSequence} ${p.appearFx} ${p.appearSpeed}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("writes a relative URL, so a path prefix survives", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    writeParams(USER);
    expect(replaceState).toHaveBeenCalledWith(null, "", "?" + USER_COMPACT);
  });
});

describe("key=value links", () => {
  it("reads s= links against today's defaults and rewrites them compactly", () => {
    expect(parseParams("?s=1471kin")).toEqual(withSeed(2430477599));
    expect(encodeParams(parseParams("?s=1471kin"))).toBe("1471kin");
    expect(encodeParams(parseParams("?" + USER_KEYS))).toBe(USER_COMPACT);
    expect(encodeParams(parseParams("?s=7&am=trace-rainbow"))).toBe("7.EIGxA");
    expect(parseParams("?s=7&afx=dust")).toEqual(withSeed(7, { appearFx: "dust" }));
    expect(parseParams("?s=7&pv=trail")).toEqual(withSeed(7, { pathViz: "trail" }));
  });

  it("reads seed= links: every param written out", () => {
    // Written by a 2026-10-10 build. The dead ends, their density and the
    // trail length it lists are no longer the defaults, so they stay.
    const old =
      "?seed=2430477599&gs=18&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1.4500000000000002&bd=2&sm=0.75&st=1&ga=0.1&tw=0.52&gap=0.04&ms=1&cr=3&fl=0.14000000000000004&fw=0.3&fv=0.5000000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.33&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=300&arc=130&pal=pastel&pc=eccc41&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1999999999999997&afx=burn";
    // K323: `de=0` is ignored (dead ends are density 0 now); ded stays.
    const listed = { deadEndDensity: 0.25, trailLength: 5 };
    const token = encodeParams(parseParams(old));
    expect(token).toBe("1471kin.EMFdEvkXw");
    expect(parseParams("?" + token)).toEqual(withSeed(2430477599, listed));
    const user = parseParams(
      "?seed=2430477599&gs=12&shp=rect&sa=nw&xa=se&wd=0.35&tb=0.7&sl=0.55&sp=5&dr=0.5&rep=1&bd=1&sm=0.25&st=1&ga=0&tw=0.64&gap=0.12&ms=1&cr=2.4&fl=1.734723475976807e-17&fw=0.25&fv=1.1500000000000001&tl=2&sb=4&snd=music&sc=chromatic&oct=3&ss=0.9999999999999996&vol=0.18&rv=0.42&brt=0.5&sus=0.5&shm=0.4&pp=0.4&snpy=0.88&rn=seed&tnc=0.5&psp=2.5&hs=312&arc=130&pal=moss&pc=6c644c&brd=0.35&fwf=0.12&ded=0.25&pk=string&mf=1&de=0&pv=gold&cam=fit&trl=5&tn=0.45&fow=0&fr=4&fwi=0&cs=segments&ap=trace&as=2.1&afx=burn"
    );
    const userToken = encodeParams(user);
    expect(userToken).toBe("1471kin.EBOJeJH4_ol9B-mT9CXoqT4fol-NCvnoY8SYl6JbGRMdEvkXxJUPg");
    expect(parseParams("?" + userToken)).toEqual({ ...USER, ...listed });
    // Earlier builds' renamed keys (mc=, trm=) are gone: ignored.
    expect(parseParams("?seed=1&mc=1").colorScheme).toBe(PARAM_DEFAULTS.colorScheme);
    expect(parseParams("?seed=1&trm=1").pathViz).toBe(PARAM_DEFAULTS.pathViz);
    expect(parseParams("?seed=1&ga=1").gridAlign).toBe(1);
    expect(parseParams("?seed=1&afx=sparks").appearFx).toBe("burn");
  });

  it("gives a link without any seed a fresh random design", () => {
    for (const q of ["", "?", "?am=instant", "?fbclid=x"]) {
      const p = parseParams(q);
      expect(Number.isInteger(p.seed) && p.seed >= 0 && p.seed < 2 ** 32).toBe(true);
    }
    expect(parseParams("?am=instant").appearMode).toBe("instant");
    // No seed = no link: a fresh design at today's defaults.
    const p = parseParams("?fbclid=x");
    expect(p).toEqual(withSeed(p.seed));
  });
});

// Every param's override key (url_state.ts readLegacy), in PARAM_DEFAULTS
// order. Links already sent carry them after a token (`?7.J&clk=realtime`
// went out by email), so a key is never renamed or dropped, and a new param
// gets one here and in readLegacy.
const OVERRIDE_KEYS: Record<keyof typeof PARAM_DEFAULTS, string> = {
  text: "txt", cartouche: "car", emblem: "emb", cartoucheShape: "csh", gridSize: "gs", shape: "shp", startAnchor: "sa", exitAnchor: "xa",
  weaveDensity: "wd", turnBias: "tb", slack: "sl", simSpeed: "sp", drag: "dr",
  repulsion: "rep", bend: "bd", smooth: "sm", stiffness: "st", gridAlign: "ga",
  threadWidth: "tw", gap: "gap", moveSpeed: "ms", cuspRadius: "cr",
  fadeLength: "fl", flowStrength: "fw", flowSpeed: "fv", tugLimit: "tl",
  snapBack: "sb", soundMode: "snd", pitchSpace: "sc", octaves: "oct",
  soundSpeed: "ss", volume: "vol", reverb: "rv", brightness: "brt",
  sustain: "sus", shimmer: "shm", pickPosition: "pp",
  rootNote: "rn", tonicEmphasis: "tnc", pulseSpacing: "psp", hueShift: "hs",
  gamutArc: "arc", palette: "pal", pathColor: "pc", branchDensity: "brd",
  fourWayFraction: "fwf", deadEndDensity: "ded", pluckStyle: "pk",
  pluckSize: "psz", pluckGhost: "pgh", pluckReach: "prc", physics: "phy",
  mazeFabric: "mf", pathViz: "pv", threadLook: "tlk", goldWidth: "gw", goldTexture: "gtx", minoExtras: "mex", minoScent: "msc", darkMoves: "dkm", lantern: "lan", sonar: "son", sonarPings: "spg", tunnels: "tun", lossAmount: "lam", pulseColor: "plc", pulseWidth: "plw", hoverColor: "hgc", telegraphColor: "tgc", telegraphWidth: "tgw", frayColor: "frc", frayWidth: "frw", cameraMode: "cam",
  trailLength: "trl", tension: "tn", exploration: "xp", fowRadius: "fr",
  fowIntro: "fwi", colorScheme: "cs", junctionBlend: "jbl", appearMode: "am",
  appearSequence: "ap", appearSpeed: "as", appearFx: "afx",
  entranceClearance: "ecl", exitClearance: "xcl", junctionSpacing: "jsp",
  background: "bg", backgroundIntensity: "bgi", pulseReach: "pr",
  backgroundSpeed: "bgs", deadEndLength: "del", backgroundScale: "bgsz",
  backgroundDetail: "bgdt", backgroundFibers: "bgfb", backgroundGrain: "bggr",
  backgroundAngle: "bgan", backgroundColorMode: "bgcm", backgroundBase: "bgc0",
  backgroundAccent1: "bgc1", backgroundAccent2: "bgc2", backgroundAccent3: "bgc3",
  settleBudget: "stb", loadSettle: "lds", physicsWorker: "phw", clock: "clk",
  playerPace: "plp",
  minoWanderPace: "mwp", minoHuntPace: "mhp", minoPaceJitter: "mpj",
  minoPauseChance: "mpc", minoPauseMin: "mpn", minoPauseMax: "mpx",
  minoDetect: "mdt", minoLose: "mls", minoCatch: "mct", minoDeadEnds: "mde",
  minoRoam: "mrm", minoWake: "mwk", minoFog: "mfg", minoPull: "mpl",
  minoRefog: "mrf", gameMode: "gm",
  confettiAmount: "cfa", confettiShine: "cfh", foilShare: "cff",
  confettiCannons: "cfc", cannonAmount: "cfn", streamerShare: "cfs", cannonSpread: "cfw", borderWidth: "bdw", borderColor: "bdc", goldTextureStrength: "gts", loaderSpeed: "ldsp", loaderMove: "ldmv", cornerRoundShare: "crs",
  pluckWhole: "pw", pluckCrossings: "pcx",
  pluckGlow: "pgl", markerSize: "mks", hoverGlow: "hg", hoverGlowWidth: "hgw",
  revealDistance: "rvd", revealFade: "rvf", revealLook: "rvl",
  hoverGlowLength: "hgl", hoverGlowFade: "hgf",
  pickMargin: "pkm", pickChoiceRatio: "pkr",
  minotaur: "mt", minoSpeed: "msp", minoTelegraph: "mtg", minoTelegraphLook: "mtl", minoSight: "msi",
  minoRoamRuns: "mro", minoTerritory: "mtr", minoAccuracy: "mac",
  minoPause: "mpa", minoSleep: "msl", hCutShare: "hcs",
  fireSpeed: "fsp", fireDelay: "fdl",
  pluckRipple: "prp", rippleStrength: "prs", rippleAuto: "pra",
  pluckSheen: "psh", pluckTug: "ptg", tugAuto: "pta", autoPluckGain: "pag",
  minoRestart: "mrs", minoLair: "mlr",
  burnt: "fbt",
  minoGiveUp: "mlm", minoRoamMin: "mrn", minoTurnPull: "mtp",
  minoGuardSight: "mgs", minoGuardAccuracy: "mga", minoStalkerAccuracy: "msa",
  minoByLength: "mbl",
  fireClock: "fck",
  fireSpeedRt: "fsr", fireDelayRt: "fdr",
  revealFinish: "rvx",
  revealEndCross: "rve", revealEndGlow: "rvg",
  exitCorridor: "xcr", exitFlank: "xfl", exitTaperRadius: "xtr", exitTaperStrength: "xtk",
  greedyTrap: "gtp", trapTargetF: "ttf", trapTargetH: "tth", trapMaxF: "tmf",
  trapMaxH: "tmh", trapMaxGrow: "tmg", trapRadius: "trd", trapIters: "tit",
  trapTries: "ttr", trapSurplus: "tsp",
  penReverse: "pnr",
  dailyTitleThread: "dtt",
  minoStopMin: "mhn", minoStopMax: "mhx", minoHuntStop: "mhh", minoTurnBack: "mrv",
  minoTipReach: "mdr", minoRoamNear: "mnr", minoTelegraphRuns: "mtn",
  fragile: "fg", parMode: "pa", parSlack: "par",
  minoGuardRoam: "mgr", minoGuardDetect: "mgd", minoGuardLose: "mgl",
  minoGuardAccuracyRt: "mgx", minoStalkerAccuracyRt: "msx",
  collapse: "cl",
  cut: "ct", // K114
  lives: "mlv", // K137 stage 3a
  sword: "swd", swordMoves: "swm", // K137 stage 3b
  spool: "sp2", spoolSlack: "sps", hints: "hn", compass: "cmp", // K137 stage 2
  ice: "ice", colorRule: "cru", // K138 stage 1
  sprint: "spr", // K137 stage 3c
  beatTempo: "btp", beatLength: "btl", beatCap: "btc", // K114 beat rider
  turnstiles: "tst", hiddenRuns: "hid", // K138 stage 2
  sleepers: "slp", sleepKind: "slk", // K137 stage 3d
  oneWay: "ow", // K138 stage 3
  lures: "lur", snares: "snr", // K137 stage 4
  keys: "ky", lockMode: "lkm", // K138 stage 4
  snareHold: "snh", lureRange: "lrg", hintSeconds: "hns", hiddenReveal: "hrv", // K795
  beatTiming: "btm", beatPerRun: "btr", // K795 beat timing
  mud: "mud", // K137 s5
};
const APPEAR_GROUP = ["appearMode", "appearSequence", "appearSpeed", "appearFx"];

// A value other than the default and inside every clamp: an enum's first
// other option, a boolean flipped, another color, a number halved (the two
// that read -1 as auto get real values). appearMode takes instant: random
// re-rolls on every load.
function otherValue(name: keyof typeof PARAM_DEFAULTS): string | number | boolean {
  const d: unknown = PARAM_DEFAULTS[name];
  if (name === "appearMode") return "instant";
  const options = ENUM_OPTIONS[name];
  if (options) return options.find((o) => o !== d)!;
  if (typeof d === "boolean") return !d;
  if (name === "text") return "Welcome";
if (name === "cartouche") return "knot";
  if (typeof d === "string") {
    expect([name, d]).toEqual([name, expect.stringMatching(/^#[0-9a-f]{6}$/)]);
    return d === "#123abc" ? "#abc123" : "#123abc";
  }
  if (name === "backgroundSpeed") return 2;
  if (name === "backgroundAngle") return 90;
  if (name === "minoSleep") return 2; // K80 turns: its default is 0
  if (name === "minoTurnPull") return 0.5; // K80 turns 3a: its default is 0
  // A share whose default could be 0 (off), where halving changes nothing.
  if (name === "hCutShare") return d === 0.5 ? 0.25 : 0.5;
  if (name === "fireDelay") return 12; // K114: its default is 0
  if (name === "exitTaperRadius") return 16; // K74 stage 3: its default is 0
  if (name === "exitTaperStrength") return 1; // K74 stage 3: its default is 0
  if (name === "pluckTug") return 0.3; // K279 wake follow-up: default 0
  if (name === "pickChoiceRatio") return 2; // K298: half of 1.5 is under its floor 1
  if (name === "trapMaxGrow") return 1.25; // K74 stage 4: half of 1.15 is under its floor 1
  if (name === "trapSurplus") return 1.5; // K74 stage 4: half of 1.25 is under its floor 1
  // K324: the junction stops default to 0 (off); the reach is whole runs.
  if (name === "minoStopMin") return 0.3;
  if (name === "minoStopMax") return 0.9;
  if (name === "minoTelegraphRuns") return 2;
  if (name === "lives") return 3; // K137 stage 3a: its default is 0 (off)
  if (name === "hints") return 3; // K137 stage 2: its default is 0 (none)
  if (name === "ice") return 0.25; // K138 stage 1: its default is 0 (off)
  if (name === "turnstiles") return 4; // K138 stage 2: its default is 0 (off)
  if (name === "hiddenRuns") return 2; // K138 stage 2: its default is 0 (off)
  if (name === "mud") return 3; // K137 s5: its default is 0 (off)
  if (name === "sleepers") return 2; // K137 stage 3d: its default is 0 (off)
  if (name === "minoExtras") return 2; // K137 stage 6: its default is 0 (off)
  if (name === "minoScent") return 12; // 4.34: its default is 0 (off)
  if (name === "darkMoves") return 12; // 4.17: its default is 0 (never)
  if (name === "lantern") return 2.5; // 4.17: its default is 1 (off)
  if (name === "sonarPings") return 7; // 4.26: its default is 0 (unlimited)
  if (name === "tunnels") return 1; // 4.13: its default is 0 (off)
  if (name === "oneWay") return 0.4; // K138 stage 3: its default is 0 (off)
  if (name === "lures") return 3; // K137 stage 4: both default to 0 (off)
  if (name === "snares") return 2;
  if (name === "beatPerRun") return 2; // K795: half of 1 is under its floor 1
  if (name === "keys") return 2; // K138 stage 4: its default is 0 (off)
  return (d as number) * 0.5;
}
// As a link writes it: booleans 0/1, colors without the "#".
const linkText = (v: string | number | boolean): string =>
  typeof v === "boolean" ? (v ? "1" : "0") : String(v).replace(/^#/, "");

describe("token + overrides", () => {
  // K132: links sent to Levi before K132 (an email and a reminder) carry
  // overrides after `?7.J`, the all-default v4 token. They keep loading
  // as seed 7 at today's defaults plus the override, as designs. Since
  // codec v5 (K111 stage 3) `.J` is an older version's blob, so each read
  // also warns (the seed and the overrides still apply).
  it("keeps the links already sent working", () => {
    const warn = warnings();
    const sent: Array<[string, Partial<UrlParams>]> = [
      ["?7.J", {}],
      ["?7.J&clk=realtime", { clock: "realtime", gameMode: "minotaur" }],
      ["?7.J&cam=follow", { cameraMode: "follow" }],
      [
        "?7.J&pw=1&pcx=ride&pgl=fallback",
        { pluckWhole: 1, pluckCrossings: "ride", pluckGlow: "fallback" },
      ],
    ];
    for (const [q, over] of sent) {
      const p = withSeed(7, over);
      expect([q, parseParams(q)]).toEqual([q, p]);
      expect([q, parseLaunch(q, 3)]).toEqual([
        q,
        { params: p, daily: null, floating: false },
      ]);
      // The page rewrites it to one token, which reads back the same.
      expect([q, parseParams("?" + encodeParams(p))]).toEqual([q, p]);
    }
    // parseParams and parseLaunch each warn once per link; the rewritten
    // token reads clean.
    expect(warn).toHaveBeenCalledTimes(sent.length * 2);
    for (const [msg] of warn.mock.calls) {
      expect(String(msg)).toMatch(/old link version 4/);
    }
  });

  it("reads every param's override key after a token", () => {
    const names = Object.keys(PARAM_DEFAULTS) as Array<keyof typeof PARAM_DEFAULTS>;
    // One key per param, none shared, none the seed's own keys.
    expect(Object.keys(OVERRIDE_KEYS).sort()).toEqual([...names].sort());
    const keys = Object.values(OVERRIDE_KEYS);
    expect(new Set([...keys, "s", "seed"]).size).toBe(keys.length + 2);
    const warn = warnings();
    const rest = (p: UrlParams) =>
      Object.fromEntries(
        Object.entries(p).filter(([k]) => !APPEAR_GROUP.includes(k))
      );
    for (const name of names) {
      // K138 stage 4: the lock has one form today (exit), so no other value;
      // the shortcut and colors forms append later.
      if (name === "lockMode") {
        expect(parseParams("?7.EQ&lkm=exit&ky=2")).toEqual(withSeed(7, { keys: 2 }));
        continue;
      }
      const value = otherValue(name);
      expect([name, value]).not.toEqual([name, PARAM_DEFAULTS[name]]);
      const q = `?7.EQ&${OVERRIDE_KEYS[name]}=${linkText(value)}`;
      const p = parseParams(q);
      // The value lands and nothing else moves (in the appearance group the
      // mode follows the values).
      expect([q, p[name]]).toEqual([q, value]);
      // K323 implied mode: naming the clock or the model names the mode.
      const want = withSeed(7, {
        [name]: value,
        ...(name === "clock" || name === "minotaur" ? { gameMode: "minotaur" as const } : {}),
      });
      if (APPEAR_GROUP.includes(name)) {
        expect([q, rest(p)]).toEqual([q, rest(want)]);
      } else {
        expect([q, p]).toEqual([q, want]);
      }
      // And survives the page's rewrite to a token (mazeFabric excepted:
      // its codec entry is gone in v7, so a token reads it back on, K326).
      if (name === "mazeFabric") {
        expect(parseParams("?" + encodeParams(p)).mazeFabric).toBe(true);
      } else {
        expect([q, parseParams("?" + encodeParams(p))]).toEqual([q, p]);
      }
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it("applies key=value pairs after the token, then folds them in", () => {
    const p = parseParams(`?${USER_COMPACT}&am=instant&tw=.5`);
    expect(p).toEqual({
      ...USER,
      threadWidth: 0.5,
      appearMode: "instant",
      appearSequence: "instant",
    });
    // Folded into one token; instant implies its values, so the inert speed
    // reads back as the default (as with every instant link).
    expect(encodeParams(p)).toMatch(/^1471kin\.[A-Za-z0-9_-]+$/);
    expect(parseParams("?" + encodeParams(p))).toEqual({
      ...p,
      appearSpeed: PARAM_DEFAULTS.appearSpeed,
    });
    expect(parseParams("?7&mf=0").mazeFabric).toBe(false);
    // The token's own seed wins over s=/seed= after it.
    expect(parseParams("?7&s=zz&seed=5").seed).toBe(7);
  });

  it("ignores unknown keys (click ids, utm tags)", () => {
    expect(parseParams(`?${USER_COMPACT}&fbclid=IwAR0x&utm_source=x`)).toEqual(USER);
    expect(encodeParams(parseParams("?1471kin&fbclid=IwAR0x"))).toBe("1471kin");
  });

  it("reads a token re-serialized by URLSearchParams (a trailing =)", () => {
    const url = new URL(`https://levi.dev/knotmaze/?${USER_COMPACT}`);
    url.searchParams.append("ref", "newsletter");
    expect(url.search).toBe(`?${USER_COMPACT}=&ref=newsletter`);
    expect(parseParams(url.search)).toEqual(USER);
    expect(parseParams("?1471kin=")).toEqual(withSeed(2430477599));
  });

  it("round-trips the pluck and physics params", () => {
    const p = withSeed(7, {
      pluckSize: 1.5,
      pluckGhost: 0,
      pluckReach: "lobe",
      physics: false,
    });
    const q = encodeParams(p);
    expect(q).toBe("7.EFB0NL8Pq");
    expect(parseParams("?" + q)).toEqual(p);
    // A token takes them as overrides (probe URLs: &phy=0).
    expect(parseParams("?7&psz=1.5&pgh=0&prc=lobe&phy=0")).toEqual(p);
  });

  it("round-trips the maze-plan knobs", () => {
    const p = withSeed(7, {
      entranceClearance: 4,
      exitClearance: 0,
      junctionSpacing: 3.25,
    });
    const q = encodeParams(p);
    expect(parseParams("?" + q)).toEqual(p);
    // A link that leaves them out reads today's maze.
    for (const link of ["?7", "?7.EQ", "?s=7"]) {
      expect(parseParams(link)).toMatchObject({
        entranceClearance: 2.5,
        exitClearance: 12,
        junctionSpacing: 2,
        deadEndDensity: 0.5,
        deadEndLength: 20,
      });
    }
    // Density 0 is the braided maze the deadEnds switch used to mean.
    expect(parseParams("?7&ded=0").deadEndDensity).toBe(0);
    expect(parseParams("?7&ecl=4&xcl=0&jsp=3.25")).toEqual(p);
  });

  it("round-trips the shader background params", () => {
    const p = withSeed(7, { background: "aurora", backgroundIntensity: 0.8 });
    const q = encodeParams(p);
    // v8, 2 entries: background = option 5, backgroundIntensity = ".8".
    expect(q).toBe("7.EMCCbUe");
    expect(parseParams("?" + q)).toEqual(p);
    // Every effect round-trips.
    for (const id of ENUM_OPTIONS.background!) {
      const b = withSeed(9, { background: id as UrlParams["background"] });
      expect(parseParams("?" + encodeParams(b))).toEqual(b);
    }
    // A link that leaves them out reads the defaults...
    expect(parseParams("?7")).toEqual(withSeed(7));
    expect(parseParams("?" + USER_COMPACT)).toEqual(USER);
    // ...and a token takes them as overrides (probe URLs: &bg=mist&bgi=.7).
    expect(parseParams("?7&bg=mist&bgi=.7")).toEqual(
      withSeed(7, { background: "mist", backgroundIntensity: 0.7 })
    );
    // An unknown effect reads as the default; the intensity clamps to [0, 1].
    expect(parseParams("?7&bg=lava&bgi=3")).toEqual(
      withSeed(7, { backgroundIntensity: 1 })
    );
    const hot = encodeParams(withSeed(7, { backgroundIntensity: 3 }));
    expect(parseParams("?" + hot).backgroundIntensity).toBe(1);
  });

  it("round-trips the background speed (-1 = auto)", () => {
    for (const speed of [0, 0.5, 1, 2.25, 3, 5.5, 8]) {
      const p = withSeed(7, { background: "vellum", backgroundSpeed: speed });
      expect(parseParams("?" + encodeParams(p))).toEqual(p);
    }
    // Auto is the default: the all-default token, and links without it.
    expect(encodeParams(withSeed(7))).toBe("7");
    expect(parseParams("?7").backgroundSpeed).toBe(-1);
    expect(parseParams("?" + USER_COMPACT).backgroundSpeed).toBe(-1);
    // A token takes it as an override (probe URLs: &bgs=2); any negative
    // value is auto, and explicit speeds clamp to the slider's max 8
    // (Levi, 2026-10-13: "Max backgroundSpeed should be like x8").
    expect(parseParams("?7&bgs=2")).toEqual(withSeed(7, { backgroundSpeed: 2 }));
    expect(parseParams("?7&bgs=8")).toEqual(withSeed(7, { backgroundSpeed: 8 }));
    expect(parseParams("?7&bgs=-.5").backgroundSpeed).toBe(-1);
    expect(parseParams("?7&bgs=9").backgroundSpeed).toBe(8);
    expect(parseParams("?7&bgs=100").backgroundSpeed).toBe(8);
    expect(parseParams("?7&bgs=x").backgroundSpeed).toBe(-1);
    const fast = encodeParams(withSeed(7, { backgroundSpeed: 9 }));
    expect(parseParams("?" + fast).backgroundSpeed).toBe(8);
    const eight = encodeParams(withSeed(7, { backgroundSpeed: 8 }));
    expect(parseParams("?" + eight).backgroundSpeed).toBe(8);
    const neg = encodeParams(withSeed(7, { backgroundSpeed: -0.25 }));
    expect(parseParams("?" + neg).backgroundSpeed).toBe(-1);
  });

  it("round-trips the background shape and colors", () => {
    const p = withSeed(7, {
      background: "silk",
      backgroundScale: 1.75,
      backgroundDetail: 0,
      backgroundFibers: 3,
      backgroundGrain: 0.25,
      backgroundAngle: 90,
      backgroundColorMode: "custom",
      backgroundBase: "#203040",
      backgroundAccent1: "#ffcc66",
      backgroundAccent2: "#0a0b0c",
      backgroundAccent3: "#a1b2c3",
    });
    expect(parseParams("?" + encodeParams(p))).toEqual(p);
    // Beside deadEndLength (index 71; these ten start at 72): the
    // neighbors of the join keep their own values, as tokens and as keys.
    const joined = withSeed(7, { deadEndLength: 30, backgroundScale: 1.5, backgroundSpeed: 4 });
    expect(parseParams("?" + encodeParams(joined))).toEqual(joined);
    expect(parseParams("?7&del=30&bgsz=1.5&bgs=4")).toEqual(joined);
    // At their defaults they cost nothing: the all-default token.
    expect(encodeParams(withSeed(7))).toBe("7");
    // Links without them read the defaults (as designed, in the design's
    // colors).
    for (const q of ["?7", "?" + USER_COMPACT, "?s=7"]) {
      expect(parseParams(q)).toMatchObject({
        backgroundScale: 1,
        backgroundDetail: 1,
        backgroundFibers: 1,
        backgroundGrain: 1,
        backgroundAngle: -1,
        backgroundColorMode: "gamut",
        backgroundBase: "#151b28",
        backgroundAccent1: "#7ab8cd",
        backgroundAccent2: "#cdb17a",
        backgroundAccent3: "#aa7acd",
      });
    }
    // Out-of-range values clamp (a hand-edited link), in tokens...
    const wild = encodeParams(
      withSeed(7, {
        backgroundScale: 9,
        backgroundDetail: -1,
        backgroundFibers: 7,
        backgroundGrain: -2,
        backgroundAngle: 450,
      })
    );
    expect(parseParams("?" + wild)).toMatchObject({
      backgroundScale: 2,
      backgroundDetail: 0,
      backgroundFibers: 3,
      backgroundGrain: 0,
      backgroundAngle: 90,
    });
    const tiny = encodeParams(withSeed(7, { backgroundScale: 0.1, backgroundAngle: -7 }));
    expect(parseParams("?" + tiny)).toMatchObject({
      backgroundScale: 0.5,
      backgroundAngle: -1,
    });
  });

  it("takes the background shape and colors as overrides", () => {
    // Probe URLs: &bgsz=2&bgdt=0&bgfb=3&bggr=0&bgan=90&bgcm=custom&bgc0=...
    expect(
      parseParams(
        "?7&bgsz=2&bgdt=0&bgfb=3&bggr=0&bgan=90&bgcm=custom" +
          "&bgc0=101820&bgc1=FFCC66&bgc2=000000&bgc3=a1b2c3"
      )
    ).toEqual(
      withSeed(7, {
        backgroundScale: 2,
        backgroundDetail: 0,
        backgroundFibers: 3,
        backgroundGrain: 0,
        backgroundAngle: 90,
        backgroundColorMode: "custom",
        backgroundBase: "#101820",
        backgroundAccent1: "#ffcc66",
        backgroundAccent2: "#000000",
        backgroundAccent3: "#a1b2c3",
      })
    );
    // Clamps, wraps, auto and garbage.
    expect(parseParams("?7&bgsz=.1&bgdt=5&bgfb=-1&bggr=9&bgan=370")).toMatchObject({
      backgroundScale: 0.5,
      backgroundDetail: 2,
      backgroundFibers: 0,
      backgroundGrain: 3,
      backgroundAngle: 10,
    });
    // The slider's old top (3, before K129) clamps to the new one (2).
    expect(parseParams("?7&bgsz=3").backgroundScale).toBe(2);
    expect(
      parseParams("?7&bgsz=x&bgdt=1e999&bgan=-30&bgcm=plaid&bgc0=%23101820&bgc1=fff&bgc2=zzzzzz")
    ).toEqual(withSeed(7));
  });

  it("round-trips the load settle (K147)", () => {
    for (const [settleBudget, loadSettle] of [[0, 0], [8, 1.25], [30, 5]]) {
      const p = withSeed(7, { settleBudget, loadSettle });
      expect(parseParams("?" + encodeParams(p))).toEqual(p);
    }
    // Beside K79's backgroundAccent3 (index 81; these two are 82 and 83):
    // the neighbors of the join keep their own values.
    const joined = withSeed(7, {
      backgroundColorMode: "custom",
      backgroundAccent3: "#a1b2c3",
      settleBudget: 8,
      loadSettle: 1.25,
    });
    expect(parseParams("?" + encodeParams(joined))).toEqual(joined);
    // Links without them read the defaults.
    expect(parseParams("?7")).toMatchObject({ settleBudget: 12, loadSettle: 0.45 });
    // Override keys for probes (&stb=0 = real-time stepping, &lds=5 =
    // settle until asleep); both clamp to their sliders, garbage reads 0.
    expect(parseParams("?7&stb=0&lds=5")).toEqual(
      withSeed(7, { settleBudget: 0, loadSettle: 5 })
    );
    expect(parseParams("?7&stb=99&lds=-1")).toMatchObject({ settleBudget: 30, loadSettle: 0 });
    const big = encodeParams(withSeed(7, { settleBudget: 99, loadSettle: 9 }));
    expect(parseParams("?" + big)).toMatchObject({ settleBudget: 30, loadSettle: 5 });
  });
});

describe("unreadable links", () => {
  it("keeps the seed and warns once for a malformed blob", () => {
    for (const blob of ["@@", "hGJeJH4_ol9B", "Y", "w-", "IA"]) {
      const warn = warnings();
      expect(parseParams(`?1471kin.${blob}`)).toEqual(withSeed(2430477599));
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    }
  });

  it("clamps gridAlign to [0, 1] and junctionBlend at 0, like the key reader", () => {
    const q = encodeParams(withSeed(7, { gridAlign: 5, junctionBlend: -2 }));
    const p = parseParams("?" + q);
    expect([p.gridAlign, p.junctionBlend]).toEqual([1, 0]);
    expect(parseParams("?s=7&ga=5&jbl=-2")).toEqual(p);
    // junctionBlend is a distance: no upper clamp.
    expect(parseParams("?" + encodeParams(withSeed(7, { junctionBlend: 9 }))).junctionBlend).toBe(9);
  });

  it("warns once and rolls a new design for an unreadable seed", () => {
    const warn = warnings();
    const p = parseParams("?NOT-A-SEED.AAAA");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(p).toEqual(withSeed(p.seed));
  });

  it("never throws on random queries", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let s = 7;
    const rand = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.=&%?é ";
    for (let k = 0; k < 2000; k++) {
      let q = "?";
      const n = Math.floor(rand() * 40);
      for (let i = 0; i < n; i++) q += alphabet[Math.floor(rand() * alphabet.length)];
      const p = parseParams(q);
      expect(Object.keys(p).sort()).toEqual(
        ["seed", ...Object.keys(PARAM_DEFAULTS)].sort()
      );
    }
  });
});

describe("links round trip (seeded property test)", () => {
  const D = PARAM_DEFAULTS as unknown as Record<string, unknown>;
  // The first 60 params: no reader clamps them but gridAlign and
  // junctionBlend (handled below). The later ones, many clamped, have their
  // own round-trip tests above.
  const PARAMS = CODEC_PARAMS.slice(0, 60);
  // A random design: each param changed with a random share, numbers mixing
  // short decimals, slider noise, negatives and big values.
  const randomParams = (rand: () => number): UrlParams => {
    const p = withSeed(Math.floor(rand() * 2 ** 32) >>> 0) as unknown as Record<
      string,
      unknown
    >;
    const share = rand();
    for (const c of PARAMS) {
      if (rand() >= share) continue;
      if (c.type === "boolean") p[c.name] = !D[c.name];
      else if (c.type === "color") {
        p[c.name] = "#" + Math.floor(rand() * 0x1000000).toString(16).padStart(6, "0");
      } else if (c.type === "enum") {
        const options = ENUM_OPTIONS[c.name as keyof typeof ENUM_OPTIONS]!;
        p[c.name] = options[Math.floor(rand() * options.length)];
      } else {
        const d = Math.floor(rand() * 10000) / 10 ** Math.floor(rand() * 7);
        const r = rand();
        p[c.name] =
          r < 0.4 ? d : r < 0.6 ? d + (rand() - 0.5) * 1e-11 : r < 0.7 ? -d : Math.floor(rand() * 400);
      }
    }
    // gridAlign never leaves [0, 1] and junctionBlend (a distance) never
    // goes negative in the app - both readers clamp (see "clamps ...").
    p.gridAlign = rand();
    p.junctionBlend = rand() * 6;
    return p as unknown as UrlParams;
  };
  // What a design reads back as: numbers at their written precision, the
  // clamped gridAlign / junctionBlend, and the values its appearance mode
  // implies.
  const expected = (p: UrlParams, back: UrlParams): UrlParams => {
    const e = { ...p } as unknown as Record<string, unknown>;
    for (const c of PARAMS) {
      if (c.type === "number") e[c.name] = clampParamValue(c.name, Number(numberText(e[c.name] as number)));
    }
    const out = e as unknown as UrlParams;
    out.gridAlign = Math.max(0, Math.min(1, out.gridAlign));
    out.junctionBlend = Math.max(0, out.junctionBlend);
    if (out.appearMode !== "custom") {
      out.appearSequence = PARAM_DEFAULTS.appearSequence;
      out.appearSpeed = PARAM_DEFAULTS.appearSpeed;
      out.appearFx = PARAM_DEFAULTS.appearFx;
    }
    if (out.appearMode === "random") {
      out.appearSequence = back.appearSequence;
      out.appearSpeed = back.appearSpeed;
      out.appearFx = back.appearFx;
    } else {
      applyAppearMode(out);
    }
    return out;
  };

  it("reads back what it writes, and writes it back the same", () => {
    let s = 20261011;
    const rand = (): number => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let k = 0; k < 1500; k++) {
      const p = randomParams(rand);
      const q = encodeParams(p);
      expect(q).toMatch(/^[0-9a-z]{1,7}(\.[A-Za-z0-9_-]+)?$/);
      const back = parseParams("?" + q);
      expect(back).toEqual(expected(p, back));
      expect(encodeParams(back)).toBe(q);
    }
  });
});
