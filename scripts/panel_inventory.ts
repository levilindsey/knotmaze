// K339: the settings panel's inventory (docs/design/K339_inventory.md), so
// K341's second audit can rerun it after the design churn.
//
// It runs the REAL buildPanel() in Node against a recording Tweakpane stub
// (scripts/panel_inventory_stub.ts; the config below aliases "tweakpane" to
// it), then joins every folder, row and button it built with:
//   - the link codec (CODEC_PARAMS: index, type, options) and the short keys
//     of key=value links (regexed from url_state.ts's parseParams);
//   - DAILY_EXEMPT_KEYS (a param a daily keeps from the viewer) and
//     MAZE_PARAM_KEYS (a param that changes the maze itself);
//   - the visibility rules, as written in refreshCond (source text), plus the
//     rows' state at today's defaults, in knot mode and in real time
//     (dynamic: the panel's own syncFromParams);
//   - the callback each row's change runs (dynamic: the row's own handler);
//   - the commit whose diff first added the row's key to the panel file
//     (one `git log --follow -p` pass), and its ledger item;
//   - the source files that read the key (`.key` outside the ui plumbing; a
//     heuristic: short keys such as gap or shape also match other objects).
//
// Usage, from the checkout's root:
//   node node_modules/vite-node/vite-node.mjs --config scripts/panel_inventory.vite.config.mjs scripts/panel_inventory.ts [out.md]
// The default output is docs/design/K339_inventory.md. Nothing outside the
// output file is written; no browser, no build.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  record,
  stubElement,
  type RecBinding,
  type RecButton,
  type RecFolder,
  type RecItem,
} from "./panel_inventory_stub";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(ROOT, process.argv[2] ?? "docs/design/K339_inventory.md");
const rel = (p: string): string => path.relative(ROOT, p).replace(/\\/g, "/");
// CRLF checkouts (autocrlf) read as LF, so the source regexes hold anywhere.
const read = (p: string): string =>
  readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

// --- Browser globals the panel touches ------------------------------------
const mem = new Map<string, string>();
const storage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};
const define = (k: string, v: unknown): void => {
  Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
};
define("HTMLElement", class HTMLElement {});
define("localStorage", storage);
define("document", {
  createElement: () => stubElement(),
  head: stubElement(),
  body: stubElement(),
  documentElement: stubElement(),
  querySelector: () => null,
  addEventListener: () => {},
});
define("window", {
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {},
  localStorage: storage,
});
define("requestAnimationFrame", () => 0);

const { buildPanel } = await import("../src/ui/tweakpane_panel");
const { PARAM_DEFAULTS, ENUM_OPTIONS } = await import("../src/ui/url_state");
const { CODEC_PARAMS, CODEC_VERSION } = await import("../src/ui/param_codec");
const { DAILY_EXEMPT_KEYS, MAZE_PARAM_KEYS } = await import("../src/ui/daily_link");

const PANEL = "src/ui/tweakpane_panel.ts";
const panelSrc = read(PANEL);
const urlSrc = read("src/ui/url_state.ts");

// --- Settings defaults (SETTINGS_DEFAULTS is not exported: read its text) ---
function settingsDefaults(): { values: Record<string, unknown>; text: Record<string, string> } {
  const m = /const SETTINGS_DEFAULTS: PanelSettings = \{\n([\s\S]*?)\n\};/.exec(panelSrc);
  const values: Record<string, unknown> = {};
  const text: Record<string, string> = {};
  if (!m) throw new Error("SETTINGS_DEFAULTS not found in the panel file");
  let key = "";
  let acc = "";
  const flush = (): void => {
    if (!key) return;
    const raw = acc.trim().replace(/,$/, "").trim();
    try {
      values[key] = JSON.parse(raw);
      text[key] = raw;
    } catch {
      values[key] = false; // an expression (movePad: coarse pointer)
      text[key] = "expr";
    }
  };
  for (const line of m[1].split("\n")) {
    const e = /^ {2}(\w+):(.*)$/.exec(line);
    if (e) {
      flush();
      key = e[1];
      acc = e[2];
    } else acc += " " + line.trim();
  }
  flush();
  return { values, text };
}
const SET = settingsDefaults();

// --- Recording callbacks ----------------------------------------------------
let fired: string[] = [];
const callbacks = new Proxy({} as Record<string, unknown>, {
  get(_t, k) {
    if (typeof k !== "string") return undefined;
    if (k === "then") return undefined;
    if (k === "backgroundGamutColors") return () => ["#336699", "#996633", "#669933"];
    return () => {
      fired.push(k);
    };
  },
});

// --- Build the real panel ----------------------------------------------------
const defaults = structuredClone(PARAM_DEFAULTS) as Record<string, unknown>;
const params: Record<string, unknown> = { ...structuredClone(defaults), seed: 1471 };
const settings: Record<string, unknown> = { ...SET.values };
const api = buildPanel(params as never, settings as never, callbacks as never);

const items = record.items;
const bindings = items.filter((i): i is RecBinding => i.kind === "binding");
const folders = items.filter((i): i is RecFolder => i.kind === "folder");
const buttons = items.filter((i): i is RecButton => i.kind === "button");

const objKind = (b: RecBinding): "param" | "setting" | "view" | "seed" =>
  b.obj === params ? "param" : b.obj === settings ? "setting" : b.key === "seed" ? "seed" : "view";
const ancestors = (f: RecFolder | null): RecFolder[] => {
  const out: RecFolder[] = [];
  for (let x = f; x; x = x.parent) out.unshift(x);
  return out;
};
const folderPath = (f: RecFolder | null): string => ancestors(f).map((x) => x.title).join(" › ");
const effHidden = (it: RecItem): boolean => {
  const own = it.kind === "folder" ? it.api.hidden : it.api.hidden;
  return own || ancestors(it.parent).some((f) => f.api.hidden);
};

// Visibility in three states: today's defaults, knot mode, real time.
const snap = (): Map<RecItem, boolean> => new Map(items.map((it) => [it, effHidden(it)]));
const atDefaults = snap();
const ownAtDefaults = new Map(items.map((it) => [it, it.api.hidden]));
params.mazeFabric = false;
api.syncFromParams();
const inKnot = snap();
Object.assign(params, structuredClone(defaults));
params.mazeFabric = true;
const clocks = (ENUM_OPTIONS as Record<string, readonly string[]>).clock ?? ["turns", "realtime"];
const turnClock = clocks.find((c) => c !== "realtime") ?? "turns";
params.clock = turnClock;
api.syncFromParams();
const ownTurn = new Map(items.map((it) => [it, it.api.hidden]));
params.clock = "realtime";
api.syncFromParams();
const ownReal = new Map(items.map((it) => [it, it.api.hidden]));
Object.assign(params, structuredClone(defaults));
api.syncFromParams();

// The callback each row's change (or button's click) runs.
const effects = new Map<RecItem, string[]>();
for (const it of [...bindings, ...buttons]) {
  const pBefore = structuredClone(params);
  const sBefore = structuredClone(settings);
  fired = [];
  try {
    if (it.kind === "binding") {
      for (const h of it.api.handlers) h({ value: it.obj[it.key], last: true });
    } else {
      for (const h of it.api.handlers) h();
    }
  } catch (e) {
    fired.push(`(threw: ${(e as Error).message})`);
  }
  effects.set(it, [...new Set(fired)]);
  Object.assign(params, pBefore);
  Object.assign(settings, sBefore);
}
api.syncFromParams();

// --- Static text: row variables, folders, buttons, refreshCond --------------
const rowVarKey = new Map<string, string>(); // variable -> key
for (const m of panelSrc.matchAll(
  /(?:const|let)\s+(\w+)\s*=\s*(?:row|chaseRow|turnRow|chanceRow|paceRow|shapeRow)\(\s*[^"]*?"(\w+)"/g
)) {
  rowVarKey.set(m[1], m[2]);
}
const folderVarTitle = new Map<string, string>();
for (const m of panelSrc.matchAll(/(?:const|let)\s+(\w+)\s*=\s*folder\(\s*"([^"]+)"/g)) {
  folderVarTitle.set(m[1], m[2]);
}
const buttonVarTitle = new Map<string, string>();
for (const m of panelSrc.matchAll(/(?:const|let)\s+(\w+)\s*=\s*button\(\s*\w+,\s*"([^"]+)"/g)) {
  buttonVarTitle.set(m[1], m[2]);
}
const condStart = panelSrc.indexOf("refreshCond = (): void => {");
const condEnd = panelSrc.indexOf("\n  };\n  refreshCond();", condStart);
if (condStart < 0 || condEnd < 0) throw new Error("refreshCond not found in the panel file");
const condBody = panelSrc.slice(condStart, condEnd);
const clean = (e: string): string =>
  e.replace(/\/\/[^\n]*/g, "").replace(/params\./g, "").replace(/\s+/g, " ").trim();
const locals: Array<[string, string]> = [];
for (const m of condBody.matchAll(/const (\w+)\s*=\s*([^;]+);/g)) locals.push([m[1], clean(m[2])]);
const listRule = new Map<string, string>(); // list variable -> its rule
for (const m of condBody.matchAll(/for \(const (\w+) of (\w+)\) \1\.hidden\s*=\s*([^;]+);/g)) {
  listRule.set(m[2], clean(m[3]));
}
for (const m of condBody.matchAll(/(\w+)\.forEach\(\((\w+), \w+\) => \{\s*\2\.hidden\s*=([^;]+);/g)) {
  listRule.set(m[1], clean(m[3]));
}
const varRule = new Map<string, string>(); // row / folder / button variable -> rule
for (const m of condBody.matchAll(/(\w+)\.hidden\s*=\s*([^;]+);/g)) {
  if (m[1] === "r") continue; // the list loops above
  varRule.set(m[1], clean(m[2]));
}
const keyRule = new Map<string, string>();
for (const [v, rule] of varRule) {
  const k = rowVarKey.get(v);
  if (k) keyRule.set(k, rule);
}
const folderRule = new Map<string, string>();
for (const [v, rule] of varRule) {
  const t = folderVarTitle.get(v);
  if (t) folderRule.set(t, rule);
}
const buttonRule = new Map<string, string>();
for (const [v, rule] of varRule) {
  const t = buttonVarTitle.get(v);
  if (t) buttonRule.set(t, rule);
}
const customKeys = [
  ...(/const customKeys = \[([\s\S]*?)\]/.exec(panelSrc)?.[1] ?? "").matchAll(/"(\w+)"/g),
].map((m) => m[1]);

const ruleOf = (b: RecBinding): string => {
  const own = keyRule.get(b.key);
  if (own) return own;
  if (customKeys.includes(b.key) && listRule.has("colorRows")) {
    return `${listRule.get("colorRows")} (colorRows; i = ${customKeys.indexOf(b.key)})`;
  }
  // A real-time row (rtRows) hides under the turn clock and shows in real time.
  if (ownTurn.get(b) === true && ownReal.get(b) === false && listRule.has("rtRows")) {
    return `${listRule.get("rtRows")} (rtRows)`;
  }
  return "";
};

// --- Codec, short keys, daily lists ------------------------------------------
const codecIndex = new Map<string, number>();
const codecEntry = new Map<string, { type: string; options?: readonly string[] }>();
(CODEC_PARAMS as ReadonlyArray<{ name: string; type: string; options?: readonly string[] }>).forEach(
  (c, i) => {
    codecIndex.set(c.name, i);
    codecEntry.set(c.name, c);
  }
);
const shortKey = new Map<string, string>([["seed", "?<seed>"], ["appearMode", "am"]]);
for (const m of urlSrc.matchAll(/(\w+):\s*[^,;:]*?read\w*\(\s*query\s*,\s*"([^"]+)"/g)) {
  if (!shortKey.has(m[1])) shortKey.set(m[1], m[2]);
}
for (const k of Object.keys(defaults)) {
  if (shortKey.has(k)) continue;
  const m = new RegExp(`\\b${k}:[^\\n]*read\\w*\\(\\s*query\\s*,\\s*"([^"]+)"`).exec(urlSrc);
  if (m) shortKey.set(k, m[1]);
}
const exempt = new Set<string>(DAILY_EXEMPT_KEYS as readonly string[]);
const mazeKeys = new Set<string>(MAZE_PARAM_KEYS as readonly string[]);

// --- Git: the commit that first added each name to the panel file ------------
const wanted = new Set<string>([
  ...bindings.map((b) => b.key),
  ...folders.map((f) => f.title),
  ...buttons.map((b) => b.title),
]);
const firstSeen = new Map<string, { sha: string; date: string; subject: string }>();
try {
  const log = execFileSync(
    "git",
    ["-C", ROOT, "log", "--follow", "--reverse", "-p", "-U0", "--no-color",
      "--format=@@@C %h %ad %s", "--date=short", "--", PANEL],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024 }
  );
  let cur = { sha: "", date: "", subject: "" };
  for (const line of log.split("\n")) {
    if (line.startsWith("@@@C ")) {
      const [sha, date, ...rest] = line.slice(5).split(" ");
      cur = { sha, date, subject: rest.join(" ") };
      continue;
    }
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    for (const m of line.matchAll(/"([^"\n]+)"/g)) {
      if (wanted.has(m[1]) && !firstSeen.has(m[1])) firstSeen.set(m[1], cur);
    }
  }
} catch (e) {
  console.error(`git log failed: ${(e as Error).message}`);
}
const itemOf = (subject: string): string =>
  /\b(K\d+[a-z]?)\b/.exec(subject)?.[1] ??
  /\b(P\d+(?:\.\d+)?(?: [Ss]tage \d+\w*)?)\b/.exec(subject)?.[1] ??
  /\b(G\d+)\b/.exec(subject)?.[1] ??
  subject.slice(0, 32);
const addedBy = (name: string): string => {
  const c = firstSeen.get(name);
  return c ? `${itemOf(c.subject)} ${c.sha} ${c.date}` : "";
};

// --- Readers: `.key` in src outside the ui plumbing --------------------------
const PLUMBING = new Set([
  "src/ui/tweakpane_panel.ts",
  "src/ui/url_state.ts",
  "src/ui/param_codec.ts",
  "src/ui/daily_link.ts",
]);
const srcFiles: Array<{ file: string; text: string }> = [];
const walk = (dir: string): void => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.ts$/.test(name) && !PLUMBING.has(rel(p))) srcFiles.push({ file: rel(p), text: read(rel(p)) });
  }
};
walk(path.join(ROOT, "src"));
const readersOf = (key: string): string => {
  const re = new RegExp(`\\.${key}\\b`, "g");
  const hits = srcFiles
    .map((f) => ({ f: f.file.replace(/^src\//, ""), n: (f.text.match(re) ?? []).length }))
    .filter((h) => h.n > 0)
    .sort((a, b) => b.n - a.n || a.f.localeCompare(b.f));
  if (!hits.length) return "none found";
  const shown = hits.slice(0, 3).map((h) => `${h.f} (${h.n})`);
  return hits.length > 3 ? `${shown.join(", ")}, +${hits.length - 3}` : shown.join(", ");
};

// --- Formatting ----------------------------------------------------------------
const esc = (s: string): string => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const fmtVal = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(Math.round(v * 1e6) / 1e6) : String(v);
const optionsText = (opts: Record<string, unknown> | undefined): string => {
  const o = opts?.options;
  if (!o) return "";
  const pairs: Array<[string, string]> = Array.isArray(o)
    ? (o as Array<{ text: string; value: unknown }>).map((x) => [String(x.text), fmtVal(x.value)])
    : Object.entries(o as Record<string, unknown>).map(([t, v]) => [t, fmtVal(v)]);
  return pairs.map(([t, v]) => (t === v ? v : `${t}=${v}`)).join(" / ");
};
const typeText = (b: RecBinding): string => {
  const kind = objKind(b);
  const def =
    kind === "setting"
      ? SET.text[b.key] === "expr"
        ? "coarse pointer"
        : fmtVal(SET.values[b.key])
      : kind === "seed"
        ? "random"
        : fmtVal(defaults[b.key]);
  const codec = codecEntry.get(b.key);
  const v = kind === "setting" ? SET.values[b.key] : defaults[b.key];
  const type =
    codec?.type ??
    (kind === "seed" ? "text" : typeof v === "boolean" ? "boolean" : typeof v === "number" ? "number" : typeof v);
  const o = b.opts ?? {};
  const parts = [`${type} ${def}`];
  if (o.min !== undefined || o.max !== undefined) {
    parts.push(`[${fmtVal(o.min)}, ${fmtVal(o.max)}]${o.step !== undefined ? ` step ${fmtVal(o.step)}` : ""}`);
  }
  const opt = optionsText(b.opts);
  if (opt) parts.push(opt);
  if (kind === "view") parts.push("(view slider)");
  return parts.join("; ");
};
const kindText = (b: RecBinding): string => {
  const k = objKind(b);
  if (k === "setting") return "setting";
  if (k === "seed") return "design (seed)";
  const base = exempt.has(b.key) ? "pref" : "design";
  return mazeKeys.has(b.key) ? `${base}, maze` : base;
};
const shows = (it: RecItem): string => {
  const parts = [`maze ${atDefaults.get(it) ? "no" : "yes"}`, `knot ${inKnot.get(it) ? "no" : "yes"}`];
  const closed = ancestors(it.parent).filter((f) => !f.expanded);
  if (closed.length) parts.push(`in closed ${closed.map((f) => f.title).join(" › ")}`);
  return parts.join(", ");
};

// --- The document ----------------------------------------------------------------
let sha = "";
try {
  sha = execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["-C", ROOT, "status", "--porcelain", "--", "src"], { encoding: "utf8" }).trim();
  if (dirty) sha += "+";
} catch {
  sha = "unknown";
}
const L: string[] = [];
L.push("# K339 panel inventory (generated)");
L.push("");
L.push(
  `Generated by \`scripts/panel_inventory.ts\` from \`src\` at \`${sha}\` (codec v${CODEC_VERSION}). Do not edit by hand: rerun it (usage in its header). The design and the findings are in \`K339_panel_audit.md\`.`
);
L.push("");
L.push("Columns:");
L.push("- **Folder**: the folder path, outermost first.");
L.push("- **Label · key**: the label the panel shows, then the param or setting key (the label is the key when no `label` is given).");
L.push("- **Codec**: the index in `CODEC_PARAMS`, then the short key of a key=value link.");
L.push("- **Type · default · range**: the codec type (else the value's), today's default, the slider range and step, and the options (`label=value` where they differ).");
L.push("- **Kind**: `design`, a link param a daily fixes; `pref`, a link param in `DAILY_EXEMPT_KEYS` (a daily keeps the viewer's value); `setting`, a `PanelSettings` viewer preference kept per browser, never in a link; `maze` marks a `MAZE_PARAM_KEYS` param (it changes the maze itself).");
L.push("- **Hidden when**: the row's line in `refreshCond`, with `params.` dropped (blank: it shows whenever its folder shows). Its folders' rules apply too (see Folders).");
L.push("- **Shows**: whether the row shows at today's defaults (maze mode), and in knot mode (`mf=0`); `in closed X` means a collapsed folder hides it until opened.");
L.push("- **Effect**: the `PanelCallbacks` its change runs (onRegenerate rebuilds the design; the others apply live or restart the solve).");
L.push("- **Added**: the commit whose diff first added the key to the panel file, and the ledger item in its subject.");
L.push("- **Read by**: the source files that read `.key`, outside the ui plumbing (panel, url_state, param_codec, daily_link), with counts; a heuristic.");
L.push("");
L.push("The helpers `refreshCond` defines:");
L.push("");
for (const [n, e] of locals) L.push(`- \`${n}\` = \`${e}\``);
L.push("");
L.push("## Folders");
L.push("");
L.push("| Folder | Starts | Hidden when | Rows | Shows | Added |");
L.push("|---|---|---|---|---|---|");
for (const f of folders) {
  const n = bindings.filter((b) => b.parent === f).length + buttons.filter((b) => b.parent === f).length;
  L.push(
    `| ${esc(folderPath(f))} | ${f.expanded ? "open" : "closed"} | ${esc(folderRule.get(f.title) ?? "")} | ${n} | ${shows(f)} | ${esc(addedBy(f.title))} |`
  );
}
L.push("");
L.push("## Rows");
L.push("");
L.push("| # | Folder | Label · key | Codec | Type · default · range | Kind | Hidden when | Shows | Effect | Added | Read by |");
L.push("|---|---|---|---|---|---|---|---|---|---|---|");
let n = 0;
for (const it of items) {
  if (it.kind === "folder") continue;
  n++;
  if (it.kind === "button") {
    L.push(
      `| ${n} | ${esc(folderPath(it.parent))} | button "${esc(it.title)}"${it.label ? ` (label ${esc(it.label)})` : ""} | | | | ${esc(buttonRule.get(it.title) ?? "")} | ${shows(it)} | ${esc((effects.get(it) ?? []).join(", "))} | ${esc(addedBy(it.title))} | |`
    );
    continue;
  }
  const b = it;
  const label = String(b.opts?.label ?? b.key);
  const idx = codecIndex.get(b.key);
  const codec = objKind(b) === "setting" ? "" : `${idx ?? "-"} · ${shortKey.get(b.key) ?? "-"}`;
  L.push(
    `| ${n} | ${esc(folderPath(b.parent))} | ${esc(label === b.key ? `\`${b.key}\`` : `${label} · \`${b.key}\``)} | ${codec} | ${esc(typeText(b))} | ${kindText(b)} | ${esc(ruleOf(b))} | ${shows(b)} | ${esc((effects.get(b) ?? []).join(", "))} | ${esc(addedBy(b.key))} | ${esc(objKind(b) === "seed" ? "" : readersOf(b.key))} |`
  );
}
L.push("");

// Cross-checks.
const rowKeys = new Set(bindings.map((b) => b.key));
const noRow = Object.keys(defaults).filter((k) => !rowKeys.has(k));
const noCodec = bindings.filter((b) => objKind(b) === "param" || objKind(b) === "view").filter((b) => !codecIndex.has(b.key));
const codecNoDefault = [...codecIndex.keys()].filter((k) => !(k in defaults));
const exemptNoRow = [...exempt].filter((k) => !rowKeys.has(k));
const exemptNotParam = [...exempt].filter((k) => !(k in defaults));
L.push("## Cross-checks");
L.push("");
L.push(`- Rows: ${bindings.length} bindings and ${buttons.length} buttons in ${folders.length} folders (${folders.filter((f) => f.parent).length} nested).`);
L.push(`- Params with no row: ${noRow.length ? noRow.map((k) => `\`${k}\` (codec ${codecIndex.get(k) ?? "-"})`).join(", ") : "none"}.`);
L.push(`- Param rows with no codec entry: ${noCodec.length ? noCodec.map((b) => `\`${b.key}\``).join(", ") : "none"}.`);
L.push(`- Codec entries with no default: ${codecNoDefault.length ? codecNoDefault.map((k) => `\`${k}\``).join(", ") : "none"}.`);
L.push(`- \`DAILY_EXEMPT_KEYS\` (${exempt.size}): ${[...exempt].map((k) => `\`${k}\``).join(", ")}.`);
L.push(`- Exempt keys with no row: ${exemptNoRow.length ? exemptNoRow.map((k) => `\`${k}\``).join(", ") : "none"}; exempt keys that are not params: ${exemptNotParam.length ? exemptNotParam.map((k) => `\`${k}\``).join(", ") : "none"}.`);
L.push(`- Settings rows (viewer preferences outside the link): ${bindings.filter((b) => objKind(b) === "setting").map((b) => `\`${b.key}\``).join(", ")}.`);
L.push(`- Rows hidden at today's defaults: ${bindings.filter((b) => atDefaults.get(b)).length} of ${bindings.length}; shown in knot mode: ${bindings.filter((b) => !inKnot.get(b)).length}.`);
L.push("");
L.push("## Tooltips");
L.push("");
for (const b of bindings) {
  const tip = String((b.api.element as Record<string, unknown>).title ?? "");
  L.push(`- \`${b.key}\`: ${esc(tip)}`);
}
for (const b of buttons) {
  const tip = String((b.api.element as Record<string, unknown>).title ?? "");
  L.push(`- button "${b.title}": ${esc(tip)}`);
}
L.push("");

writeFileSync(OUT, L.join("\n"), "utf8");
console.log(
  `${rel(OUT)}: ${bindings.length} rows, ${buttons.length} buttons, ${folders.length} folders; ` +
    `${noRow.length} params without a row; git names found ${firstSeen.size}/${wanted.size}`
);
