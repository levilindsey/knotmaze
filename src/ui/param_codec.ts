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
//   version       gamma(version)                 v1 = the single bit "1"
//   entry count   gamma(count + 1)
//   per changed param, in ascending table index:
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
// slider's range or step can change without touching what any link means.
// What a link DOES depend on is the table it was written with - the param
// ORDER, each param's codec type, each enum's option list and its order,
// and the DEFAULTS (a link lists only what differs from them). The tables
// are therefore frozen LITERALS, never derived from the live lists, and
// test/ui/param_codec.test.ts pins them:
//
// - A NEW param, or a NEW option of an existing enum: APPEND it (to the end
//   of the current table's params / of that enum's options) and update the
//   pin. No index moves, and older links simply lack the entry - they read
//   its default.
// - ANY other change to an existing entry (its default, position, type, an
//   option's name or position): add CODEC_V<n+1> as an edited copy of the
//   current table, register it in CODEC_TABLES, point CODEC_VERSION at it,
//   and keep every older table: a link decodes with the table of the
//   version it carries.
//
// A bare `?<seed>` means the v1 defaults. Once a v2 exists, the encoder
// writes a blob even with zero entries, so every new link names its
// version.

export type ParamValue = number | boolean | string;

export type CodecParam =
  | { readonly name: string; readonly type: "number"; readonly def: number }
  | { readonly name: string; readonly type: "boolean"; readonly def: boolean }
  | { readonly name: string; readonly type: "color"; readonly def: string }
  | {
      readonly name: string;
      readonly type: "enum";
      readonly def: string;
      readonly options: readonly string[];
    };

export interface CodecTable {
  readonly version: number;
  readonly params: readonly CodecParam[];
}

const num = (name: string, def: number): CodecParam =>
  Object.freeze({ name, type: "number", def });
const flag = (name: string, def: boolean): CodecParam =>
  Object.freeze({ name, type: "boolean", def });
const color = (name: string, def: string): CodecParam =>
  Object.freeze({ name, type: "color", def });
const choice = (
  name: string,
  def: string,
  options: readonly string[]
): CodecParam =>
  Object.freeze({ name, type: "enum", def, options: Object.freeze(options) });

const ANCHOR_OPTIONS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

// V1 (2026-10-11): the legacy URL_KEYS order; defaults = PARAM_DEFAULTS as
// of the short-link era (the same table legacy `s=` links were read with).
export const CODEC_V1: CodecTable = Object.freeze({
  version: 1,
  params: Object.freeze([
    num("gridSize", 18), // 0
    choice("shape", "rect", ["rect", "heart", "star", "fish", "tree", "ring"]),
    choice("startAnchor", "nw", ANCHOR_OPTIONS),
    choice("exitAnchor", "se", ANCHOR_OPTIONS),
    num("weaveDensity", 0.35),
    num("turnBias", 0.7), // 5
    num("slack", 0.55),
    num("simSpeed", 5),
    num("drag", 0.5),
    num("repulsion", 1.45),
    num("bend", 2), // 10
    num("smooth", 0.75),
    num("stiffness", 1),
    num("gridAlign", 0.1),
    num("threadWidth", 0.52),
    num("gap", 0.04), // 15
    num("moveSpeed", 1),
    num("cuspRadius", 3),
    num("fadeLength", 0.14),
    num("flowStrength", 0.3),
    num("flowSpeed", 0.5), // 20
    num("tugLimit", 2),
    num("snapBack", 4),
    choice("soundMode", "music", ["none", "manual", "random", "music"]),
    choice("pitchSpace", "chromatic", [
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
    num("octaves", 3), // 25
    num("soundSpeed", 1),
    num("volume", 0.33),
    num("reverb", 0.42),
    num("brightness", 0.5),
    num("sustain", 0.5), // 30
    num("shimmer", 0.4),
    num("pickPosition", 0.4),
    num("snappiness", 0.88),
    choice("rootNote", "seed", [
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
    num("tonicEmphasis", 0.5), // 35
    num("pulseSpacing", 2.5),
    num("hueShift", 300),
    num("gamutArc", 130),
    choice("palette", "pastel", ["pastel", "jewel", "ember", "moss", "ink"]),
    color("pathColor", "#eccc41"), // 40
    num("branchDensity", 0.35),
    num("fourWayFraction", 0.12),
    num("deadEndDensity", 0.25),
    choice("pluckStyle", "string", ["soft", "string"]),
    flag("mazeFabric", true), // 45
    flag("deadEnds", false),
    choice("pathViz", "gold", ["gold", "trail", "string"]),
    choice("cameraMode", "fit", ["fit", "follow"]),
    num("trailLength", 5),
    num("tension", 0.45), // 50
    flag("fogOfWar", false),
    num("fowRadius", 4),
    flag("fowIntro", false),
    choice("colorScheme", "segments", [
      "mono",
      "strands",
      "depth",
      "segments",
      "noise",
    ]),
    num("junctionBlend", 0), // 55
    choice("appearMode", "custom", [
      "instant",
      "ink-dust",
      "trace-burn",
      "trace-rainbow",
      "trace-roots",
      "bloom-comet",
      "random",
      "custom",
    ]),
    choice("appearSequence", "trace", [
      "instant",
      "trace",
      "bloom",
      "draw",
      "ink",
    ]),
    num("appearSpeed", 2.2),
    choice("appearFx", "burn", [
      "none",
      "rainbow",
      "comet",
      "dust",
      "burn",
      "roots",
    ]),
  ]),
});

// V2 (2026-10-11): junctionBlend defaults to 0.88 lattice units (the
// user's pick once the param became a fixed blend distance); an edited
// copy of V1, nothing else differs. V1 links - and the bare `?<seed>` -
// keep junctionBlend 0. New params since are APPENDED below (links
// written before them read their defaults).
export const CODEC_V2: CodecTable = Object.freeze({
  version: 2,
  params: Object.freeze([
    ...CODEC_V1.params.map((p) =>
      p.name === "junctionBlend" ? num("junctionBlend", 0.88) : p
    ),
    // Render-only plucks + the physics checkbox (2026-10-11).
    num("pluckSize", 1), // 60
    num("pluckGhost", 0.35),
    choice("pluckReach", "run", ["run", "lobe"]),
    flag("physics", true),
  ]),
});

// V3 (2026-10-11): pluckSize defaults to 1.75 (Levi: "bigger default for
// plucks" - at 1 the median tapped lobe swung at the amplitude floor,
// subtle at default zoom); an edited copy of V2, nothing else differs. V2
// links keep pluckSize 1. New params since are APPENDED below, and new enum
// options at the end of their list: shape's "circle" (option 6,
// 2026-10-12) - v1 and v2 links can never name it.
export const CODEC_V3: CodecTable = Object.freeze({
  version: 3,
  params: Object.freeze([
    ...CODEC_V2.params.map((p) =>
      p.name === "pluckSize"
        ? num("pluckSize", 1.75)
        : p.name === "shape"
          ? choice("shape", "rect", ["rect", "heart", "star", "fish", "tree", "ring", "circle"])
          : p
    ),
    // The last three maze-plan knobs (2026-10-12, K20): until now every
    // link read them from DEFAULT_MAZE_PARAMS, so changing one there would
    // have moved every old link's maze. Defaults = those values exactly.
    num("entranceClearance", 2.5), // 64
    num("exitClearance", 5),
    num("junctionSpacing", 2),
    // Shader backgrounds (K21, 2026-10-12).
    choice("background", "vellum", [
      "none",
      "vellum",
      "mist",
      "wash",
      "silk",
      "aurora",
      "contours",
    ]), // 67
    num("backgroundIntensity", 0.5),
    // Traversal pulse reach (K75, 2026-10-12): the trains used to run
    // whole arms; links written before it read 3.
    num("pulseReach", 3), // 69
  ]),
});

// V4 (2026-10-12, K73): trailLength defaults to 10 (Levi: "make
// recentPath highlight about twice as far" - pathViz trail kept 5 lattice
// units of recent path lit); an edited copy of V3, nothing else differs.
// V3 links keep trailLength 5, and so do the dailies (DAILY_V1 pins codec
// v3's defaults). New params since are APPENDED below.
// K74 (2026-10-13, pre-launch, edited in place - no new version): dead ends
// on by default, at density 0.5 with 20-unit long tails, and exitClearance
// 5 -> 12. v4 links written before it now read these defaults too.
const K74_V4_DEFAULTS: Readonly<Record<string, CodecParam>> = Object.freeze({
  trailLength: num("trailLength", 10),
  deadEndDensity: num("deadEndDensity", 0.5),
  deadEnds: flag("deadEnds", true),
  exitClearance: num("exitClearance", 12),
});
export const CODEC_V4: CodecTable = Object.freeze({
  version: 4,
  params: Object.freeze([
    ...CODEC_V3.params.map((p) => K74_V4_DEFAULTS[p.name] ?? p),
    // The background's animation speed (K79, 2026-10-13): -1 = auto, each
    // effect's own pace - the drift every earlier link had (vellum static).
    num("backgroundSpeed", -1), // 70
    // K74's long-tail dead ends: the junction-free tail length, doubled
    // lattice units (0 = the older spread placement).
    num("deadEndLength", 20), // 71
    // The background's shape params and custom colors (K79 stage B,
    // 2026-10-13). Defaults = the look every earlier link had: scale,
    // detail, fibers and grain 1 (the designed pattern), angle -1 (auto,
    // the seed's), colors from the design's gamut. The custom defaults are
    // the page ink and the gamut accents at the default design's hue (195).
    num("backgroundScale", 1), // 72
    num("backgroundDetail", 1),
    num("backgroundFibers", 1),
    num("backgroundGrain", 1),
    num("backgroundAngle", -1), // 76
    choice("backgroundColorMode", "gamut", ["gamut", "custom"]),
    color("backgroundBase", "#151b28"),
    color("backgroundAccent1", "#7ab8cd"),
    color("backgroundAccent2", "#cdb17a"),
    color("backgroundAccent3", "#aa7acd"), // 81
  ]),
});

// Every table ever published, oldest first (never edit or drop one).
export const CODEC_TABLES: readonly CodecTable[] = Object.freeze([
  CODEC_V1,
  CODEC_V2,
  CODEC_V3,
  CODEC_V4,
]);
// The table new links are written with (typed wide: encodeToken still
// compares it with 1, the version whose all-default links are bare seeds).
export const CODEC_VERSION: number = 4;

export function codecTable(version: number): CodecTable | undefined {
  return CODEC_TABLES.find((t) => t.version === version);
}

// What a link of `version` means where it lists nothing: that table's
// defaults, plus - for params only later tables have - the default of the
// first table that has them (a link that predates a param reads the
// default it was introduced with).
export function codecDefaults(version: number): Record<string, ParamValue> {
  const out: Record<string, ParamValue> = {};
  for (const t of CODEC_TABLES) {
    if (t.version < version) continue;
    for (const p of t.params) {
      if (!Object.hasOwn(out, p.name)) out[p.name] = p.def;
    }
  }
  return out;
}

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

// One changed param, ready to write: its table index + its value's bits.
interface Entry {
  index: number;
  write: (w: BitWriter) => void;
}

// The entry for `value` if it differs from the param's default, else
// null. Also null for a value the table cannot express (wrong type, an
// option the table lacks, a malformed color, a non-finite number): the
// link then leaves it out, so it reads back as the default.
function entryFor(p: CodecParam, index: number, value: unknown): Entry | null {
  switch (p.type) {
    case "boolean":
      if (typeof value !== "boolean" || value === p.def) return null;
      return { index, write: () => {} };
    case "enum": {
      if (typeof value !== "string" || value === p.def) return null;
      const option = p.options.indexOf(value);
      if (option < 0) return null;
      return { index, write: (w) => w.gamma(option + 1) };
    }
    case "color": {
      if (typeof value !== "string" || !COLOR_RE.test(value)) return null;
      if (value.toLowerCase() === p.def.toLowerCase()) return null;
      const rgb = Number.parseInt(value.slice(1), 16);
      return { index, write: (w) => w.write(rgb, 24) };
    }
    case "number": {
      if (typeof value !== "number") return null;
      const text = numberText(value);
      if (text === null || text === numberText(p.def)) return null;
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

// `p` with its default replaced by base's value for it, when the param's
// type can hold that value - so "changed" means "differs from base"
// (DELTA blobs, below). A value it cannot hold leaves the table default.
function rebased(
  p: CodecParam,
  base: Readonly<Record<string, unknown>>
): CodecParam {
  if (!Object.hasOwn(base, p.name)) return p;
  const v = base[p.name];
  switch (p.type) {
    case "number":
      return typeof v === "number" && Number.isFinite(v) ? { ...p, def: v } : p;
    case "boolean":
      return typeof v === "boolean" ? { ...p, def: v } : p;
    case "color":
      return typeof v === "string" && COLOR_RE.test(v) ? { ...p, def: v } : p;
    case "enum":
      return typeof v === "string" && p.options.includes(v)
        ? { ...p, def: v }
        : p;
  }
}

// The entries of the current table that `values` changes, measured
// against `ref(p)`'s default.
function changedEntries(
  values: Readonly<Record<string, unknown>>,
  omit: ReadonlySet<string>,
  ref: (p: CodecParam) => CodecParam
): Entry[] {
  const table = codecTable(CODEC_VERSION)!;
  const entries: Entry[] = [];
  table.params.forEach((p, index) => {
    if (omit.has(p.name) || !Object.hasOwn(values, p.name)) return;
    const entry = entryFor(ref(p), index, values[p.name]);
    if (entry) entries.push(entry);
  });
  return entries;
}

function writeBlob(entries: readonly Entry[]): string {
  const w = new BitWriter();
  w.gamma(CODEC_VERSION);
  w.gamma(entries.length + 1);
  let previous = -1;
  for (const e of entries) {
    w.gamma(e.index - previous);
    previous = e.index;
    e.write(w);
  }
  return w.toBase64Url();
}

// The link token for a design: `<seed>` or `<seed>.<blob>` (no "?"). Every
// param of the current table whose value differs from its default is
// written, except any named in `omit`; params `values` lacks count as
// default.
export function encodeToken(
  seed: number,
  values: Readonly<Record<string, unknown>>,
  omit: ReadonlySet<string> = NO_NAMES
): string {
  const seedText = (seed >>> 0).toString(36);
  const entries = changedEntries(values, omit, (p) => p);
  if (entries.length === 0 && CODEC_VERSION === 1) return seedText;
  return `${seedText}.${writeBlob(entries)}`;
}

// DELTA BLOBS (2026-10-12, the daily links): the same bitstream as a
// token's blob, but measured against a BASE design instead of the table's
// defaults - it lists every param of the current table whose value
// differs from base's, and decodes back onto base (a listed boolean is
// base's flipped). The daily link `?daily=<n>.<delta>` uses it with base =
// that day's pinned design, so a daily with a tweaked look keeps naming
// its day. "" when nothing differs. `base` must hold every current param.
export function encodeDelta(
  values: Readonly<Record<string, unknown>>,
  base: Readonly<Record<string, unknown>>,
  omit: ReadonlySet<string> = NO_NAMES
): string {
  const entries = changedEntries(values, omit, (p) => rebased(p, base));
  return entries.length === 0 ? "" : writeBlob(entries);
}

function readValue(r: BitReader, p: CodecParam): ParamValue {
  switch (p.type) {
    case "boolean":
      return !p.def;
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

// A token blob (base undefined: entries land on the version's defaults)
// or a delta blob (entries land on base, measured against it).
function decodeBlob(
  blob: string,
  base?: Readonly<Record<string, ParamValue>>
): Record<string, ParamValue> {
  const r = new BitReader(blob);
  const version = r.gamma();
  const table = codecTable(version);
  if (!table) throw new Error(`unknown version ${version}`);
  const values = base ? { ...base } : codecDefaults(version);
  const count = r.gamma() - 1;
  if (count > table.params.length) throw new Error(`${count} entries`);
  let index = -1;
  for (let k = 0; k < count; k++) {
    index += r.gamma();
    const p = table.params[index];
    if (!p) throw new Error(`param index ${index} out of range`);
    values[p.name] = readValue(r, base ? rebased(p, base) : p);
  }
  if (!r.atPaddedEnd()) throw new Error("trailing data");
  return values;
}

export interface DecodedDelta {
  // base with the delta's entries applied; base itself (a copy) when the
  // delta is empty or unreadable.
  values: Record<string, ParamValue>;
  // Why the delta was ignored, else null.
  error: string | null;
}

// Reads a delta blob (encodeDelta) onto `base`. Never throws: an
// unreadable delta - malformed, truncated, unknown version - leaves base
// untouched (all-or-nothing, like a token's blob) and says why.
export function decodeDelta(
  blob: string,
  base: Readonly<Record<string, ParamValue>>
): DecodedDelta {
  const text = blob.replace(/\.+$/, "");
  if (text === "") return { values: { ...base }, error: null };
  try {
    return { values: decodeBlob(text, base), error: null };
  } catch (e) {
    return {
      values: { ...base },
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface DecodedToken {
  // The seed, or null when the token has no readable one.
  seed: number | null;
  // Every param the token's version knows: its default (codecDefaults)
  // unless the blob lists it (a bare seed: the v1 defaults). The current
  // defaults when the token is unreadable - its version is unknown then.
  values: Record<string, ParamValue>;
  // Why the token (or its blob) was ignored, else null.
  error: string | null;
}

// Reads `<seed>` / `<seed>.<blob>`. Never throws: a malformed or truncated
// blob, or one of an unknown version, keeps the seed and reports the
// reason in `error`, with every param at its current default.
export function decodeToken(token: string): DecodedToken {
  // Trailing dots: the sentence punctuation after a pasted link (no valid
  // token ends in one).
  const text = token.replace(/\.+$/, "");
  const dot = text.indexOf(".");
  const seedText = dot < 0 ? text : text.slice(0, dot);
  const blob = dot < 0 ? "" : text.slice(dot + 1);
  if (!SEED_RE.test(seedText)) {
    return {
      seed: null,
      values: codecDefaults(CODEC_VERSION),
      error: `unreadable seed "${seedText}"`,
    };
  }
  const seed = Number.parseInt(seedText, 36) >>> 0;
  if (blob === "") return { seed, values: codecDefaults(1), error: null };
  try {
    return { seed, values: decodeBlob(blob), error: null };
  } catch (e) {
    return {
      seed,
      values: codecDefaults(CODEC_VERSION),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
