// COMPACT LINKS (2026-10-11): a design's whole URL state is ONE query
// token - `?<seed>` when every setting is at its default, else
// `?<seed>.<blob>`.
//
// - seed: base-36 (0-9a-z, at most 7 chars for 32 bits), as the legacy
//   `s=` key wrote it.
// - blob: base64url without padding (A-Z a-z 0-9 - _). The "." separator
//   is in neither alphabet, and the token has no "=", so it reads straight
//   off location.search.
//
// The blob is a BITSTREAM, MSB first, zero-padded to whole 6-bit chars:
//
//   version       gamma(CODEC_VERSION)
//   entry count   gamma(count + 1)
//   per changed param, in ascending CODEC_PARAMS index:
//     index       gamma(index - previousIndex)   previousIndex starts at -1
//     value       boolean  0 bits (a changed boolean is its default flipped)
//                 enum     gamma(optionIndex + 1)
//                 color    24 bits, 0xrrggbb
//                 number   its shortest decimal (numberText: ".25", "-.5"),
//                          4 bits per char - 0-9, "." = 10, "-" = 11 - then
//                          15 terminates (12-14 reserved)
//                 string   gamma(byteLength), then that many UTF-8 bytes
//                          (8 bits each); NFC-normalized on encode
//
// gamma(n), n >= 1 (Elias gamma) = floor(log2 n) zeros, then n in binary.
//
// SELF-DESCRIBING: every value carries its own type and length, so a
// slider's range or step can change freely. A link lists only what differs
// from TODAY's defaults (the caller passes them: url_state.ts
// PARAM_DEFAULTS), so a default edit changes what older links mean -
// accepted before launch (K132, 2026-10-14, which dropped the frozen
// per-version tables). What a link does depend on is CODEC_PARAMS: the
// param ORDER, each param's codec type and each enum's option list, pinned
// literally by test/ui/param_codec.test.ts.
//
// - A NEW param, or a NEW option of an existing enum: APPEND it (to the end
//   of CODEC_PARAMS / of that enum's options) and to the pin. Older links
//   lack the entry and read its default.
// - Any other change (a reorder, a removal, a type, an option renamed or
//   moved): bump CODEC_VERSION and re-pin. A link of another version reads
//   as its seed at today's defaults, like an unreadable one.

export type ParamValue = number | boolean | string;

export type CodecParam =
  | { readonly name: string; readonly type: "number" | "boolean" | "color" | "string" }
  | {
      readonly name: string;
      readonly type: "enum";
      readonly options: readonly string[];
    };

// Every param's value at today's defaults: what a link leaves out.
export type CodecDefaults = Readonly<Record<string, ParamValue>>;

const num = (name: string): CodecParam => Object.freeze({ name, type: "number" });
const flag = (name: string): CodecParam =>
  Object.freeze({ name, type: "boolean" });
const color = (name: string): CodecParam => Object.freeze({ name, type: "color" });
const str = (name: string): CodecParam => Object.freeze({ name, type: "string" });
const choice = (name: string, options: readonly string[]): CodecParam =>
  Object.freeze({ name, type: "enum", options: Object.freeze([...options]) });

const ANCHOR_OPTIONS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// Indices 0-59 are the legacy URL_KEYS order (2026-10-11); everything
// after was appended.
export const CODEC_PARAMS: readonly CodecParam[] = Object.freeze([
  num("gridSize"), // 0
  choice("shape", ["rect", "heart", "star", "fish", "tree", "ring", "circle"]),
  choice("startAnchor", ANCHOR_OPTIONS),
  choice("exitAnchor", ANCHOR_OPTIONS),
  num("weaveDensity"),
  num("turnBias"), // 5
  num("slack"),
  num("simSpeed"),
  num("drag"),
  num("repulsion"),
  num("bend"), // 10
  num("smooth"),
  num("stiffness"),
  num("gridAlign"),
  num("threadWidth"),
  num("gap"), // 15
  num("moveSpeed"),
  num("cuspRadius"),
  num("fadeLength"),
  num("flowStrength"),
  num("flowSpeed"), // 20
  num("tugLimit"),
  num("snapBack"),
  choice("soundMode", ["none", "manual", "random", "music"]),
  choice("pitchSpace", [
    "chromatic",
    "pentMajor",
    "pentMinor",
    "hirajoshi",
    "insen",
    "dorian",
    "lydian",
    "wholeTone",
    "harmMinor",
  ]),
  num("octaves"), // 25
  num("soundSpeed"),
  num("volume"),
  num("reverb"),
  num("brightness"),
  num("sustain"), // 30
  num("shimmer"),
  num("pickPosition"),
  choice("rootNote", [
    "seed",
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ]),
  num("tonicEmphasis"), // 35
  num("pulseSpacing"),
  num("hueShift"),
  num("gamutArc"),
  choice("palette", ["pastel", "jewel", "ember", "moss", "ink"]),
  color("pathColor"), // 40
  num("branchDensity"),
  num("fourWayFraction"),
  num("deadEndDensity"),
  choice("pluckStyle", ["soft", "string"]),
  choice("pathViz", ["gold", "trail", "string"]),
  choice("cameraMode", ["fit", "follow"]),
  num("trailLength"),
  num("tension"), // 50
  // K76 stage 2c: the fog of war's flag became the exploration mode (v6).
  choice("exploration", ["off", "fog", "threads"]),
  num("fowRadius"),
  flag("fowIntro"),
  choice("colorScheme", ["mono", "strands", "depth", "segments", "noise"]),
  num("junctionBlend"), // 55
  choice("appearMode", [
    "instant",
    "ink-dust",
    "trace-burn",
    "trace-rainbow",
    "trace-roots",
    "bloom-comet",
    "random",
    "custom",
  ]),
  choice("appearSequence", ["instant", "trace", "bloom", "draw", "ink", "edges", "edgesAll"]), // edges*: K798
  num("appearSpeed"),
  choice("appearFx", ["none", "rainbow", "comet", "dust", "burn", "roots"]),
  // Render-only plucks + the physics checkbox (2026-10-11).
  num("pluckSize"), // 60
  num("pluckGhost"),
  choice("pluckReach", ["run", "lobe"]),
  flag("physics"),
  // The last three maze-plan knobs (K20, 2026-10-12).
  num("entranceClearance"), // 64
  num("exitClearance"),
  num("junctionSpacing"),
  // Shader backgrounds (K21, 2026-10-12).
  choice("background", [
    "none",
    "vellum",
    "mist",
    "wash",
    "silk",
    "aurora",
    "contours",
    "paper",
  ]), // 67
  num("backgroundIntensity"),
  num("pulseReach"), // 69 (K75)
  num("backgroundSpeed"), // 70 (K79)
  num("deadEndLength"), // 71 (K74)
  // The background's shape params and custom colors (K79 stage B).
  num("backgroundScale"), // 72
  num("backgroundDetail"),
  num("backgroundFibers"),
  num("backgroundGrain"),
  num("backgroundAngle"), // 76
  choice("backgroundColorMode", ["gamut", "custom"]),
  color("backgroundBase"),
  color("backgroundAccent1"),
  color("backgroundAccent2"),
  color("backgroundAccent3"), // 81
  // K147's load settle.
  num("settleBudget"), // 82
  num("loadSettle"), // 83
  // K80's real-time minotaur mode: the maze clock, the chase's tuning
  // (game/minotaur.ts DEFAULT_CHASE_PARAMS), how it shows under fog.
  choice("clock", ["turn", "realtime", "beat"]), // 84 (beat: K114, appended)
  num("playerPace"), // 85
  num("minoWanderPace"),
  num("minoHuntPace"),
  num("minoPaceJitter"),
  num("minoPauseChance"),
  num("minoPauseMin"), // 90
  num("minoPauseMax"),
  num("minoDetect"),
  num("minoLose"),
  num("minoCatch"),
  num("minoDeadEnds"), // 95
  num("minoRoam"),
  num("minoWake"),
  choice("minoFog", ["always", "hunting", "never"]), // 98
  // K140's finish confetti.
  num("confettiAmount"), // 100
  // K180's pluck params.
  num("pluckWhole"), // 101
  choice("pluckCrossings", ["through", "ride", "pinch"]), // 102
  choice("pluckGlow", ["off", "instead", "with", "fallback"]), // 103
  // K98's marker size.
  num("markerSize"), // 104
  // K145's hover glow.
  num("hoverGlow"), // 105
  // K174's minotaur controls: it roams toward the player, a catch re-fogs.
  num("minoPull"), // 106 (K323: was minoToward flag)
  flag("minoRefog"), // 107
  // K80 turns stage 1: the turn-aligned minotaur (game/minotaur_turns.ts).
  choice("minotaur", ["hunter", "guard", "stalker"]), // 108 (K323: off removed)
  choice("minoSpeed", ["half", "one", "charge", "two"]), // 109
  flag("minoTelegraph"), // 110
  num("minoSight"), // 111
  num("minoRoamRuns"), // 112
  num("minoTerritory"), // 113
  num("minoAccuracy"), // 114
  num("minoPause"), // 115
  num("minoSleep"), // 116
  // K74 stage 2's H1 share (the fused arm cut).
  num("hCutShare"), // 117
  // K114 stage 1: the burn race (game/fire.ts).
  num("fireSpeed"), // 119
  num("fireDelay"), // 120
  // K279 stage 1's pluck emphasis (render/pluck_model.ts K279 params).
  choice("pluckRipple", ["off", "wave", "glint", "ring"]), // 121
  num("rippleStrength"), // 122
  num("rippleAuto"), // 123
  num("pluckSheen"), // 124
  num("pluckTug"), // 125
  flag("tugAuto"), // 126
  num("autoPluckGain"), // 127
  // K80 turns stage 2 (K273): what a minotaur's catch resets.
  flag("minoRestart"), // 128
  flag("minoLair"), // 129
  // K111 stage 4: the hover glow's width (K264).
  num("hoverGlowWidth"), // 130
  // K298: the hover glow's own length and its end fade.
  num("hoverGlowLength"), // 131
  num("hoverGlowFade"), // 132
  // K298: the mouse's pick margin and the choices' multiple of it.
  num("pickMargin"), // 133
  num("pickChoiceRatio"), // 134
  // K7 stage 3: physics in a worker.
  flag("physicsWorker"), // 135
  // K76 stage 2c: the thread reveal's reach, its fade and its end look
  // (the options in EXPLORE_LOOKS order, render/explore_glsl.ts).
  num("revealDistance"), // 136
  num("revealFade"), // 137
  choice("revealLook", ["fade", "halo", "glow", "dots", "fray", "beacon"]), // 138
  // K290 (burn stage 3a): how burnt runs draw (BURNT_MODES order).
  choice("burnt", ["gone", "char"]), // 139
  // K80 turns 3a: K324 section 4.3's two knobs, the turn pull, and K294's
  // per-model rows (the guard's sight and accuracy, the stalker's accuracy).
  num("minoGiveUp"), // 140
  num("minoRoamMin"), // 141
  num("minoTurnPull"), // 142
  num("minoGuardSight"), // 143
  num("minoGuardAccuracy"), // 144
  num("minoStalkerAccuracy"), // 145
  choice("fireClock", ["turn", "realtime"]), // 146, K114 stage 2
  // K440: the real-time fire's own speed and delay (fireClock realtime).
  num("fireSpeedRt"), // 147
  num("fireDelayRt"), // 148
  // K465: the finish shows under the thread reveal (default on).
  flag("revealFinish"), // 149
  // K466 THE ENDS: where an end under a crossing goes, and the end's halo
  // (REVEAL_END_CROSSES and REVEAL_END_GLOWS order, url_state.ts).
  choice("revealEndCross", ["under", "past", "back"]), // 150
  choice("revealEndGlow", ["soft", "bright"]), // 151
  // K74 stage 3: the trap-zone finish (appended; defaults in url_state).
  num("exitCorridor"), // 152
  choice("exitFlank", ["stub", "away", "near"]), // 153
  num("exitTaperRadius"), // 154
  num("exitTaperStrength"), // 155
  // K481 stage 2: the turn minotaur travels by thread length.
  flag("minoByLength"), // 156
  // K323 Stage A (v7): the game mode (appended; classic is the default).
  choice("gameMode", ["classic", "minotaur", "burn"]),
  // K74 stage 4 (K527/K532): the greedy-trap search and its thresholds.
  choice("greedyTrap", ["off", "on"]),
  num("trapTargetF"),
  num("trapTargetH"),
  num("trapMaxF"),
  num("trapMaxH"),
  num("trapMaxGrow"),
  num("trapRadius"),
  num("trapIters"),
  num("trapTries"),
  num("trapSurplus"),
  str("text"),
  str("cartouche"),
  choice("emblem", ["", "star", "trefoil", "triquetra", "solomon", "wreath"]),
  choice("cartoucheShape", ["", "star", "trefoil", "triquetra", "solomon", "wreath"]),
  // K558: reverse the pen-order rule for text crossings (the earlier stroke on top).
  flag("penReverse"),
  flag("dailyTitleThread"), // K552
  num("confettiShine"), // K337: the confetti's specular strength
  num("foilShare"), // K337: the share of foil pieces
  // K324 (design 4.2): the real-time minotaur's junction stops, turn-back
  // margin, roam window and telegraph reach.
  num("minoStopMin"),
  num("minoStopMax"),
  num("minoHuntStop"),
  num("minoTurnBack"),
  num("minoTipReach"),
  num("minoRoamNear"),
  num("minoTelegraphRuns"),
  flag("confettiCannons"), // K336: the side cannons
  num("cannonAmount"), // K336: the side cannons' amount
  num("streamerShare"), // K336: the cannons' streamer share
  choice("minoTelegraphLook", ["rims", "line", "both"]), // 181, K525: the telegraph's look
  // 182-184, K137 stage 1: fragile runs and par (FRAGILE_MODES and
  // PAR_MODES order, game/fragile.ts and game/par.ts).
  choice("fragile", ["off", "crack", "snap"]),
  choice("parMode", ["off", "strict", "strokes"]),
  num("parSlack"),
  // K324 stage 3: the real-time guard's territory, sight and accuracy and
  // the real-time stalker's accuracy (185-189).
  num("minoGuardRoam"),
  num("minoGuardDetect"),
  num("minoGuardLose"),
  num("minoGuardAccuracyRt"),
  num("minoStalkerAccuracyRt"),
  // 190, K139: collapse (COLLAPSE_MODES order, game/collapse.ts).
  choice("collapse", ["off", "finish", "free"]),
  // 191, K114: cut (CUT_MODES order, game/cut.ts).
  choice("cut", ["off", "on", "lead", "delay"]), // K114 walker: lead, delay appended
  // 192, K137 stage 3a: lives (0 off, 1..5 hearts; game/lives.ts).
  num("lives"),
  // 193-194, K137 stage 3b (4.7): the sword (SWORD_MODES order,
  // game/sword.ts) and its flee's length (moves, or runs walked).
  choice("sword", ["off", "timed", "oneuse"]),
  num("swordMoves"),
  // 195-198, K137 stage 2: the player's aids - Ariadne's spool and its
  // slack (game/spool.ts), hints a solve and the compass (game/hints.ts).
  flag("spool"),
  num("spoolSlack"),
  num("hints"),
  flag("compass"),
  // 199-200, K138 stage 1: the share of core runs that are icy (game/ice.ts)
  // and the color rule (COLOR_RULE_MODES order, game/color_rule.ts).
  num("ice"),
  choice("colorRule", ["off", "alternate", "cycle"]),
  // 201, K137 stage 3c (4.29): sprint (SPRINT_MODES order, game/sprint.ts).
  choice("sprint", ["off", "on"]),
  // K114's beat rider (202-204): tempo, the length a beat covers, the cap.
  num("beatTempo"),
  num("beatLength"),
  num("beatCap"),
  // 205-206, K138 stage 2: turnstile junctions (0 off, 1..8; game/turnstiles.ts)
  // and hidden runs (0 off, 1..4; game/hidden_runs.ts).
  num("turnstiles"),
  num("hiddenRuns"),
  // 207-208, K137 stage 3d (4.9): the extra monsters' count (0 off, 1..3)
  // and their kind (SLEEP_KINDS order, game/monsters.ts).
  num("sleepers"),
  choice("sleepKind", ["wake", "follow", "both"]),
  // 209, K138 stage 3: one-way runs (0 off, else the share of the core runs;
  // game/one_way.ts).
  num("oneWay"),
  // 210-211, K137 stage 4 (4.10, 4.30): the lure plucks' stock (0 off,
  // 1..5; game/lures.ts) and the snares' (0 off, 1..3; game/snares.ts).
  num("lures"),
  num("snares"),
  // 212-213, K138 stage 4 (4.1): keys (0 off, 1..3; game/locks.ts) and the
  // lock's form (LOCK_MODES order; options append without a bump).
  num("keys"),
  choice("lockMode", ["exit", "shortcut", "colors"]),
  // 214-216, K795: the snare's hold (turns), the lure's range (runs) and
  // the hidden runs' reveal distance (runs from a pluck). (216 was the
  // hint's seconds until K838 removed it - codec v9.)
  num("snareHold"),
  num("lureRange"),
  num("hiddenReveal"),
  // 217-218, K795: the beat's run timing (BEAT_TIMINGS order,
  // game/beat_rider.ts) and the beats every run takes under even (1..4).
  choice("beatTiming", ["even", "length"]),
  num("beatPerRun"),
  // 219, K137 s5 (4.33): muddy runs (0 off, 1..6; game/mud.ts).
  num("mud"),
  // 220, K797b: the thread look (fill | border | both).
  choice("threadLook", ["fill", "border", "both"]), // 220 K797b
  // 221-222, K799: the traveled path's width and fill texture.
  num("goldWidth"),
  choice("goldTexture", ["solid", "pencil", "crayon", "highlighter"]),
  // 223, K137 stage 6: real-time extras (0 off, 1..3 hunters).
  num("minoExtras"),
  // 224, K137 scent (4.34): the scent trail's seconds (0 off).
  num("minoScent"),
  // 225-226, K137 darkness (4.17): closing span in moves, lantern x.
  num("darkMoves"),
  num("lantern"),
  // 227-228, K137 sonar (4.26): the ring, and its ping limit.
  flag("sonar"),
  num("sonarPings"),
  // 229, K137 tunnels (4.13): linked junction pairs.
  num("tunnels"),
  // 230, K546 stage 3: the loss effects' amount.
  num("lossAmount"),
  // K813: the highlights' colors and widths (border-look stage).
  color("pulseColor"),
  num("pulseWidth"),
  color("hoverColor"),
  color("telegraphColor"),
  num("telegraphWidth"),
  color("frayColor"),
  num("frayWidth"),
  // 238, K819: the side cannons' spread.
  num("cannonSpread"),
  // 239-241, K820: the border stroke's width and color, the gold grain.
  num("borderWidth"),
  color("borderColor"),
  num("goldTextureStrength"),
  // 242-243, K828: the loading trefoil's speed and motion.
  num("loaderSpeed"),
  choice("loaderMove", ["maze", "head", "above", "spin"]), // K852; "spin" appended K853
  // 244, K830: the rounded share of junction wedges.
  num("cornerRoundShare"),
  num("pathIrregularity"), // K835
  num("pathExcursion"), // K835
  flag("showShortestPath"), // K839
  // K852: the loader's own look (own params; defaults mirror today).
  num("loaderGap"),
  num("loaderThreadWidth"),
  color("loaderThreadColor"),
  color("loaderBgColor"),
  num("loaderIndicatorSize"),
  choice("loaderFill", ["solid", "outline", "flat"]),
  num("loaderTrail"),
  flag("labelInk"), // K868 S3a: the border look's ink from the label passes
  flag("labelGpu"), // K868 S3a7: the label's tubes on the GPU
]);

// The format version a blob names first. Bump it for anything but an
// append (see above). 1-3 were the frozen tables K132 dropped; 5 removed
// K111 stage 2's highlightMode (index 108, K111 stage 3); 6 replaced the
// fogOfWar flag at 51 with the exploration enum (K76 stage 2c); 7 is
// K323 Stage A (see above). v8 (K115): the text string param appended.
// v7 (K323 Stage A): snappiness, mazeFabric (codec only; the field stays
// until K326), deadEnds, confetti and fire left the table; minotaur lost
// its off option; minoToward became the minoPull slider; gameMode was
// appended. K398: the panel's range for every numeric param that has one, so a
// link cannot leave it in either reader (here, and url_state.ts's
// clampToRanges for the key=value form). A gs of 66 in knot mode needs
// 16384 GAP rows - past the Pixel's 8192-row texture limit, where the
// allocation fails and every gap vanishes. Not listed: hueShift (it
// wraps mod 360, so any finite value is the same design), the two AUTO
// sentinels backgroundSpeed / backgroundAngle (their sanitizers own
// them). gap's floor is 0,
// not the slider's 0.04: 0 is "no casing gap", which links have said.
export const PARAM_RANGES: Readonly<
  Record<string, readonly [number, number]>
> = Object.freeze({
  gridSize: [4, 24],
  weaveDensity: [0, 1],
  turnBias: [0, 1],
  slack: [0, 1],
  simSpeed: [0, 10],
  drag: [0, 1],
  repulsion: [0.4, 1.8],
  bend: [0.2, 2.5],
  smooth: [0, 1],
  stiffness: [0.1, 1.35],
  gridAlign: [0, 1],
  threadWidth: [0.15, 0.8],
  gap: [0, 0.5],
  moveSpeed: [0.25, 4],
  cuspRadius: [0, 6],
  fadeLength: [0, 1.2],
  flowStrength: [0, 1],
  flowSpeed: [0, 3],
  tugLimit: [0.5, 6],
  snapBack: [0, 12],
  octaves: [1, 4],
  soundSpeed: [0.25, 6],
  volume: [0, 1],
  reverb: [0, 1],
  brightness: [0, 1],
  sustain: [0, 1],
  shimmer: [0, 1],
  pickPosition: [0, 1],
  tonicEmphasis: [0, 1],
  pulseSpacing: [0.8, 6],
  pulseReach: [0.5, 15],
  gamutArc: [40, 360],
  branchDensity: [0, 1],
  fourWayFraction: [0, 1],
  deadEndDensity: [0, 1],
  deadEndLength: [0, 40],
  hCutShare: [0, 1],
  exitCorridor: [0, 32],
  exitTaperRadius: [0, 32],
  exitTaperStrength: [0, 2],
  trapTargetF: [1, 6],
  trapTargetH: [1, 8],
  trapMaxF: [2, 12],
  trapMaxH: [2, 16],
  trapMaxGrow: [1, 1.5],
  trapRadius: [0, 40],
  trapIters: [0, 24],
  trapTries: [1, 16],
  trapSurplus: [1, 2],
  entranceClearance: [0, 12],
  exitClearance: [0, 20],
  junctionSpacing: [0.5, 8],
  trailLength: [1, 30],
  tension: [0, 1],
  fowRadius: [1.5, 10],
  revealDistance: [1, 12],
  revealFade: [0.35, 4],
  // junctionBlend: floor-only by pin (a token may say 9; the readers
  // hold it at 0, never at the slider's 6).
  appearSpeed: [0.3, 4],
  backgroundIntensity: [0, 1],
  backgroundScale: [0.5, 2],
  backgroundDetail: [0, 2],
  backgroundFibers: [0, 3],
  backgroundGrain: [0, 3],
  settleBudget: [0, 30],
  loadSettle: [0, 5],
  playerPace: [2, 30],
  minoWanderPace: [0, 2],
  minoHuntPace: [0, 2],
  minoPaceJitter: [0, 0.5],
  minoPauseChance: [0, 1],
  minoPauseMin: [0, 10],
  minoPauseMax: [0, 10],
  minoDetect: [0, 100],
  minoLose: [0, 150],
  minoCatch: [0.2, 5],
  minoDeadEnds: [0, 1],
  minoRoam: [5, 150],
  minoWake: [0, 20],
  minoPull: [0, 1],
  minoStopMin: [0, 2], // K324
  minoStopMax: [0, 2],
  minoHuntStop: [0, 1],
  minoTurnBack: [0, 10],
  minoTipReach: [0.5, 4],
  minoRoamNear: [0, 1],
  minoTelegraphRuns: [0, 3],
  minoGuardRoam: [5, 150], // K324 stage 3
  minoGuardDetect: [0, 100],
  minoGuardLose: [0, 150],
  minoGuardAccuracyRt: [0, 1],
  minoStalkerAccuracyRt: [0, 1],
  confettiAmount: [0, 3],
  confettiShine: [0, 2], // K337 (CONFETTI_SHINE_MAX)
  foilShare: [0, 1], // K337
  cannonAmount: [0, 3], // K336 (CANNON_AMOUNT_MAX)
  cannonSpread: [0, 0.5], // K819 (CANNON_SPREAD_MAX)
  borderWidth: [0, 1], // K820
  goldTextureStrength: [0, 1], // K820
  loaderSpeed: [0.25, 9], // K828; max x3 (K853)
  loaderGap: [0, 1.5], // K852
  loaderThreadWidth: [0.1, 0.8], // K852
  loaderIndicatorSize: [0.3, 3], // K852
  loaderTrail: [0, 6], // K852
  cornerRoundShare: [0, 1], // K830
  pathIrregularity: [0, 1], // K835
  pathExcursion: [0, 1], // K835
  streamerShare: [0, 1], // K336
  pluckWhole: [0, 1.5],
  markerSize: [0.25, 3],
  hoverGlow: [0, 1],
  hoverGlowWidth: [0.3, 1],
  hoverGlowLength: [0.5, 15],
  hoverGlowFade: [0, 1.5],
  pickMargin: [0, 20],
  pickChoiceRatio: [1, 4],
  minoSight: [0, 20],
  minoRoamRuns: [1, 30],
  minoTerritory: [1, 20],
  minoAccuracy: [0, 1],
  minoPause: [0, 1],
  minoSleep: [0, 99],
  minoGiveUp: [0, 10],
  minoRoamMin: [1, 10],
  minoTurnPull: [0, 1],
  minoGuardSight: [0, 20],
  minoGuardAccuracy: [0, 1],
  minoStalkerAccuracy: [0, 1],
  fireSpeed: [0.1, 0.95],
  fireDelay: [0, 40],
  fireSpeedRt: [0.1, 0.95],
  fireDelayRt: [0, 40],
  parSlack: [0, 1], // K137 (PAR_SLACK_MIN, PAR_SLACK_MAX)
  pluckSize: [0, 3],
  pluckGhost: [0, 1],
  rippleStrength: [0, 2],
  rippleAuto: [0, 2],
  pluckSheen: [0, 1],
  pluckTug: [0, 1],
  autoPluckGain: [0, 1],
  lives: [0, 5], // K137 stage 3a (LIVES_MAX)
  swordMoves: [4, 20], // K137 stage 3b (SWORD_MOVES_MIN..MAX)
  spoolSlack: [0.1, 1], // K137 stage 2 (SPOOL_SLACK_MIN..MAX)
  hints: [0, 5], // K137 stage 2 (HINTS_MAX)
  ice: [0, 0.5], // K138 (ICE_SHARE_MAX)
  // K114 beat rider. 180 at most: the head's ring pulses on every beat, and
  // 3.6 keeps a flash under three a second.
  beatTempo: [40, 180],
  beatLength: [0.5, 8], // K114 beat rider: lattice units of run a beat covers
  beatCap: [1, 8], // K114 beat rider: the most beats a run takes
  turnstiles: [0, 8], // K138 stage 2 (TURNSTILES_MAX)
  hiddenRuns: [0, 4], // K138 stage 2 (HIDDEN_MAX)
  sleepers: [0, 3], // K137 stage 3d (SLEEPERS_MAX)
  minoExtras: [0, 3], // K137 stage 6
  minoScent: [0, 30], // K137 scent (4.34)
  darkMoves: [0, 40], // K137 darkness (4.17)
  lantern: [1, 4], // K137 darkness (4.17)
  sonarPings: [0, 20], // K137 sonar (4.26)
  tunnels: [0, 2], // K137 tunnels (4.13, TUNNELS_MAX)
  lossAmount: [0, 3], // K546 stage 3 (LOSS_AMOUNT_MAX)
  pulseWidth: [0, 1], // K813
  telegraphWidth: [0.2, 2.5], // K813
  frayWidth: [0, 1], // K813
  oneWay: [0, 0.6], // K138 stage 3 (ONE_WAY_MAX)
  lures: [0, 5], // K137 stage 4 (LURES_MAX)
  snares: [0, 3], // K137 stage 4 (SNARES_MAX)
  keys: [0, 3], // K138 stage 4 (KEYS_MAX)
  snareHold: [1, 8], // K795 (SNARE_HOLD_MIN..MAX)
  lureRange: [1, 12], // K795 (LURE_RANGE_MIN..MAX)
  hiddenReveal: [1, 8], // K795 (REVEAL_RUNS_MIN..MAX)
  beatPerRun: [1, 4], // K795 (BEAT_PER_RUN_MIN..MAX)
  mud: [0, 6], // K137 s5 (MUD_MAX)
  goldWidth: [0, 1], // K799
});

// A link value held to its panel range (K398); a param with no range,
// or a non-finite value, passes through (the readers handle garbage).
export function clampParamValue(name: string, value: number): number {
  const range = PARAM_RANGES[name];
  if (!range || !Number.isFinite(value)) return value;
  return Math.min(range[1], Math.max(range[0], value));
}

// v9 (K838): the hint's seconds left the table (a hint now lasts until
// the player's next move); indices after 216 shift down one.
export const CODEC_VERSION = 9;

// The shortest decimal for a number, after rounding to 6 decimals (slider
// steps leave float noise behind - 1.4500000000000002, or 1.7e-17 for a
// zero), leading zero dropped (".25", "-.5"): exactly the legacy short
// links' writer. Comparing these texts is the "same value?" test. Null when
// the value cannot be written (not finite).
export function numberText(value: number): string | null {
  const r = Math.round(value * 1e6) / 1e6;
  if (!Number.isFinite(r)) return null;
  // String() switches to exponent form at 1e21 ("e" and "+" have no code);
  // a value that large is an integer, and BigInt prints every digit.
  const s = Math.abs(r) >= 1e21 ? BigInt(r).toString() : String(r);
  if (s.startsWith("0.")) return s.slice(1);
  if (s.startsWith("-0.")) return "-" + s.slice(2);
  return s;
}

const B64URL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
// 4-bit number codes 0-11; 12-14 reserved; 15 terminates.
const NUMBER_CHARS = "0123456789.-";
const NUMBER_END = 15;
// Elias gamma with more leading zeros than this is garbage, not a value.
const GAMMA_MAX_ZEROS = 31;
const SEED_RE = /^[0-9a-z]{1,7}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

class BitWriter {
  private readonly bits: number[] = [];

  write(value: number, width: number): void {
    for (let i = width - 1; i >= 0; i--) {
      this.bits.push(Math.floor(value / 2 ** i) % 2);
    }
  }

  gamma(n: number): void {
    let width = 1;
    while (2 ** width <= n) width++;
    this.write(0, width - 1);
    this.write(n, width);
  }

  toBase64Url(): string {
    let out = "";
    for (let i = 0; i < this.bits.length; i += 6) {
      let v = 0;
      for (let k = 0; k < 6; k++) v = v * 2 + (this.bits[i + k] ?? 0);
      out += B64URL[v];
    }
    return out;
  }
}

// Reads bits straight off the text, one char at a time (a pasted link can
// be megabytes long; nothing past what the parse needs is ever touched).
class BitReader {
  private readonly text: string;
  private pos = 0;

  constructor(text: string) {
    this.text = text;
  }

  private bitAt(pos: number): number {
    const ch = this.text[Math.floor(pos / 6)];
    const v = B64URL.indexOf(ch);
    if (v < 0) throw new Error(`invalid character "${ch}"`);
    return (v >> (5 - (pos % 6))) & 1;
  }

  read(width: number): number {
    let v = 0;
    for (let i = 0; i < width; i++) {
      if (this.pos >= this.text.length * 6) throw new Error("truncated");
      v = v * 2 + this.bitAt(this.pos++);
    }
    return v;
  }

  gamma(): number {
    let zeros = 0;
    while (this.read(1) === 0) {
      if (++zeros > GAMMA_MAX_ZEROS) throw new Error("oversized count");
    }
    return 2 ** zeros + this.read(zeros);
  }

  // True when all that is left is the zero padding of the last char.
  atPaddedEnd(): boolean {
    const end = this.text.length * 6;
    if (end - this.pos >= 6) return false;
    for (let p = this.pos; p < end; p++) {
      if (this.bitAt(p) !== 0) return false;
    }
    return true;
  }
}

const NO_NAMES: ReadonlySet<string> = new Set();

// One changed param, ready to write: its index + its value's bits.
interface Entry {
  index: number;
  write: (w: BitWriter) => void;
}

// The entry for `value` if it differs from `def` (today's default), else
// null. Also null for a value the param cannot express (wrong type, an
// option the list lacks, a malformed color, a non-finite number): the link
// then leaves it out, so it reads back as the default.
function entryFor(
  p: CodecParam,
  index: number,
  value: unknown,
  def: ParamValue | undefined
): Entry | null {
  if (p.type === "string") {
    if (typeof value !== "string") return null;
    const text = value.normalize("NFC");
    const defText = typeof def === "string" ? def.normalize("NFC") : def;
    if (text === defText) return null;
    const bytes = new TextEncoder().encode(text);
    return {
      index,
      write: (w) => {
        w.gamma(bytes.length);
        for (const b of bytes) w.write(b, 8);
      },
    };
  }
  switch (p.type) {
    case "boolean":
      // A listed boolean is its default flipped: it needs a boolean default.
      if (typeof value !== "boolean" || typeof def !== "boolean") return null;
      return value === def ? null : { index, write: () => {} };
    case "enum": {
      if (typeof value !== "string" || value === def) return null;
      const option = p.options.indexOf(value);
      if (option < 0) return null;
      return { index, write: (w) => w.gamma(option + 1) };
    }
    case "color": {
      if (typeof value !== "string" || !COLOR_RE.test(value)) return null;
      if (typeof def === "string" && value.toLowerCase() === def.toLowerCase()) {
        return null;
      }
      const rgb = Number.parseInt(value.slice(1), 16);
      return { index, write: (w) => w.write(rgb, 24) };
    }
    case "number": {
      if (typeof value !== "number") return null;
      // K398: write the clamped value, so one design has one token.
      const text = numberText(clampParamValue(p.name, value));
      if (text === null) return null;
      if (typeof def === "number" && text === numberText(def)) return null;
      return {
        index,
        write: (w) => {
          for (const ch of text) w.write(NUMBER_CHARS.indexOf(ch), 4);
          w.write(NUMBER_END, 4);
        },
      };
    }
  }
}

// The link token for a design: `<seed>`, or `<seed>.<blob>` (no "?") listing
// every param whose value differs from `defaults`, except any named in
// `omit`; params `values` lacks count as default.
export function encodeToken(
  seed: number,
  values: Readonly<Record<string, unknown>>,
  defaults: CodecDefaults,
  omit: ReadonlySet<string> = NO_NAMES
): string {
  const seedText = (seed >>> 0).toString(36);
  const entries: Entry[] = [];
  CODEC_PARAMS.forEach((p, index) => {
    if (omit.has(p.name) || !Object.hasOwn(values, p.name)) return;
    const entry = entryFor(p, index, values[p.name], defaults[p.name]);
    if (entry) entries.push(entry);
  });
  if (entries.length === 0) return seedText;
  const w = new BitWriter();
  w.gamma(CODEC_VERSION);
  w.gamma(entries.length + 1);
  let previous = -1;
  for (const e of entries) {
    w.gamma(e.index - previous);
    previous = e.index;
    e.write(w);
  }
  return `${seedText}.${w.toBase64Url()}`;
}

function readValue(
  r: BitReader,
  p: CodecParam,
  def: ParamValue | undefined
): ParamValue {
  if (p.type === "string") {
    const len = r.gamma();
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = r.read(8);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`${p.name} is not valid UTF-8`);
    }
  }
  switch (p.type) {
    case "boolean":
      if (typeof def !== "boolean") throw new Error(`${p.name} is no flag`);
      return !def;
    case "enum": {
      const option = r.gamma() - 1;
      if (option >= p.options.length) {
        throw new Error(`${p.name} option ${option} out of range`);
      }
      return p.options[option];
    }
    case "color":
      return "#" + r.read(24).toString(16).padStart(6, "0");
    case "number": {
      let text = "";
      for (;;) {
        const code = r.read(4);
        if (code === NUMBER_END) break;
        if (code >= NUMBER_CHARS.length) {
          throw new Error(`reserved number code ${code}`);
        }
        text += NUMBER_CHARS[code];
      }
      // Number("") is 0, so an empty text needs its own check.
      const value = text === "" ? NaN : Number(text);
      if (!Number.isFinite(value)) {
        throw new Error(`${p.name} has no number ("${text}")`);
      }
      return value;
    }
  }
}

function decodeBlob(
  blob: string,
  defaults: CodecDefaults
): Record<string, ParamValue> {
  const r = new BitReader(blob);
  const version = r.gamma();
  if (version !== CODEC_VERSION) {
    throw new Error(
      version < CODEC_VERSION
        ? `old link version ${version}`
        : `unknown link version ${version}`
    );
  }
  const values = { ...defaults };
  const count = r.gamma() - 1;
  if (count > CODEC_PARAMS.length) throw new Error(`${count} entries`);
  let index = -1;
  for (let k = 0; k < count; k++) {
    index += r.gamma();
    const p = CODEC_PARAMS[index];
    if (!p) throw new Error(`param index ${index} out of range`);
    values[p.name] = readValue(r, p, defaults[p.name]);
  }
  if (!r.atPaddedEnd()) throw new Error("trailing data");
  return values;
}

export interface DecodedToken {
  // The seed, or null when the token has no readable one.
  seed: number | null;
  // `defaults` with what the blob lists; `defaults` alone for a bare seed
  // or an unreadable blob.
  values: Record<string, ParamValue>;
  // Why the token (or its blob) was ignored, else null.
  error: string | null;
}

// Reads `<seed>` / `<seed>.<blob>`. Never throws: a malformed or truncated
// blob, or one of another version, keeps the seed and reports the reason in
// `error`, with every param at its default - all or nothing, never a
// partial design.
export function decodeToken(
  token: string,
  defaults: CodecDefaults
): DecodedToken {
  // Trailing dots: the sentence punctuation after a pasted link (no valid
  // token ends in one).
  const text = token.replace(/\.+$/, "");
  const dot = text.indexOf(".");
  const seedText = dot < 0 ? text : text.slice(0, dot);
  const blob = dot < 0 ? "" : text.slice(dot + 1);
  if (!SEED_RE.test(seedText)) {
    return {
      seed: null,
      values: { ...defaults },
      error: `unreadable seed "${seedText}"`,
    };
  }
  const seed = Number.parseInt(seedText, 36) >>> 0;
  if (blob === "") return { seed, values: { ...defaults }, error: null };
  try {
    return { seed, values: decodeBlob(blob, defaults), error: null };
  } catch (e) {
    return {
      seed,
      values: { ...defaults },
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
