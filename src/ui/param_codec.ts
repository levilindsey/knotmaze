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
  | { readonly name: string; readonly type: "number" | "boolean" | "color" }
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
  num("snappiness"), // Retired; removing it bumps the version.
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
  flag("mazeFabric"), // 45
  flag("deadEnds"),
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
  choice("appearSequence", ["instant", "trace", "bloom", "draw", "ink"]),
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
  choice("clock", ["turn", "realtime"]), // 84
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
  flag("confetti"), // 99
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
  flag("minoToward"), // 106
  flag("minoRefog"), // 107
  // K80 turns stage 1: the turn-aligned minotaur (game/minotaur_turns.ts).
  choice("minotaur", ["off", "hunter", "guard", "stalker"]), // 108
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
  choice("fire", ["off", "fuse"]), // 118
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
]);

// The format version a blob names first. Bump it for anything but an
// append (see above). 1-3 were the frozen tables K132 dropped; 5 removed
// K111 stage 2's highlightMode (index 108, K111 stage 3); 6 replaced the
// fogOfWar flag at 51 with the exploration enum (K76 stage 2c).
export const CODEC_VERSION = 6;

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
      const text = numberText(value);
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
