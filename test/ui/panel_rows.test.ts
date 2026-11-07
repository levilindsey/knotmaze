// K795: every param has a panel row, or a stated reason it has none
// (brief docs/design/K795.md, item 2). The rows are found by a SOURCE
// SCAN of src/ui/tweakpane_panel.ts (building Tweakpane in Node is not
// worth it). A param has a row when:
// - `row(<parent>, p, "<key>", ...)` binds it;
// - a row helper, a `const <name>Row = (key...` or `(parent: Parent,
//   key...` whose body calls row(), is called with it:
//   chaseRow("minoFog", ...), turnRow(fMino, "minoSpeed", ...);
// - a view row binds it (VIEW_ROWS: the row shows a view object's value
//   and writes the param), or the custom color loop does (KEY_LIST).
// A param with none of these needs an EXEMPT entry saying why. Adding a
// param without a row fails here until it gets one or a reason.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PARAM_DEFAULTS } from "../../src/ui/url_state";

const PANEL = readFileSync(
  fileURLToPath(new URL("../../src/ui/tweakpane_panel.ts", import.meta.url)),
  "utf8"
);

// The params that have no panel row, each with its reason.
const EXEMPT: Readonly<Record<string, string>> = {
  physicsWorker:
    "phw: main.ts reads it once, when it creates the physics host, so a change needs a reload (K7)",
  mazeFabric:
    "mf: left the panel and the codec in K323 Stage A; `&mf=0` (knot mode) is a link-only probe flag until K326",
  labelGpu:
    "lbp: K868 S3a7's GPU pieces, a link-only stage flag (it takes effect with labelInk) until the coordinator turns it on",
  fieldBand:
    "fbb: K1040 S4b's form B passes for the border look's ink, a link-only stage flag (border look only) until Levi approves the junctions",
};

// View rows: `row(<parent>, <view>, "<viewKey>")` writes param `key`.
const VIEW_ROWS: ReadonlyArray<{ view: string; viewKey: string; key: string }> = [
  // The Clock rows (K795): the minotaur's list and the other games'.
  { view: "clockView", viewKey: "mino", key: "clock" },
  { view: "clockView", viewKey: "plain", key: "clock" },
  // The exponential slider shows a position, the param keeps the strength.
  { view: "gaView", viewKey: "gridAlign", key: "gridAlign" },
  // The backdrop speed and silk angle show their effective (auto) values.
  { view: "bgView", viewKey: "backgroundSpeed", key: "backgroundSpeed" },
  { view: "bgView", viewKey: "backgroundAngle", key: "backgroundAngle" },
];

// The custom color rows, made in a loop over this list.
const KEY_LIST = "customKeys";

function scanRows(src: string): Set<string> {
  const keys = new Set<string>();
  for (const m of src.matchAll(/\brow\(\s*[^,()]+,\s*p,\s*"(\w+)"/g)) keys.add(m[1]);
  // Row helpers: their key parameter comes first, or after the parent.
  const helpers = [...src.matchAll(/const (\w+Row) = \(\s*(parent: Parent,\s*)?key\b/g)];
  for (const h of helpers) {
    const body = src.slice(h.index, h.index + 800);
    if (!/\brow\(\s*[^,()]+,\s*p,\s*key\b/.test(body)) continue;
    const call = h[2]
      ? new RegExp(`\\b${h[1]}\\(\\s*[^,()"]+,\\s*"(\\w+)"`, "g")
      : new RegExp(`\\b${h[1]}\\(\\s*"(\\w+)"`, "g");
    for (const m of src.matchAll(call)) keys.add(m[1]);
  }
  for (const v of VIEW_ROWS) {
    const re = new RegExp(`\\brow\\(\\s*[^,()]+,\\s*${v.view},\\s*"${v.viewKey}"`);
    if (re.test(src)) keys.add(v.key);
  }
  const list = new RegExp(`const ${KEY_LIST} = \\[([^\\]]*)\\]`).exec(src);
  const loop = new RegExp(`${KEY_LIST}\\.forEach\\(\\(key[\\s\\S]{0,200}?\\brow\\(\\s*[^,()]+,\\s*p,\\s*key\\b`);
  if (list && loop.test(src)) {
    for (const m of list[1].matchAll(/"(\w+)"/g)) keys.add(m[1]);
  }
  return keys;
}

describe("K795: every param has a panel row or a reason", () => {
  const rows = scanRows(PANEL);
  const params = Object.keys(PARAM_DEFAULTS);

  it("finds the rows it is built to find", () => {
    // Guards the scan itself: a direct row, each helper shape, each view
    // row and the color loop.
    for (const k of ["weaveDensity", "minoFog", "minoSpeed", "minoWanderPace",
      "minoGuardAccuracyRt", "minoAccuracy", "minoStopMin", "backgroundScale",
      "clock", "gridAlign", "backgroundSpeed", "backgroundAngle",
      "backgroundAccent3", "beatTempo"]) {
      expect(rows.has(k), k).toBe(true);
    }
    for (const v of VIEW_ROWS) {
      const re = new RegExp(`\\brow\\(\\s*[^,()]+,\\s*${v.view},\\s*"${v.viewKey}"`);
      expect(re.test(PANEL), `${v.view}.${v.viewKey}`).toBe(true);
    }
  });

  it("gives every param a row or an exemption", () => {
    const missing = params.filter((k) => !rows.has(k) && !(k in EXEMPT));
    expect(missing).toEqual([]);
  });

  it("keeps the exemptions current", () => {
    for (const [k, why] of Object.entries(EXEMPT)) {
      expect(params, `${k} is not a param`).toContain(k);
      expect(rows.has(k), `${k} has a row now: drop its exemption`).toBe(false);
      expect(why.trim().length, `${k} needs a reason`).toBeGreaterThan(10);
    }
  });

  it("binds no row to a key that is not a param", () => {
    expect([...rows].filter((k) => !(k in PARAM_DEFAULTS))).toEqual([]);
  });
});

describe("K130/K495: stepped rows and the end glow row", () => {
  // The text of one row(...) call, from its key to its closing `);`.
  const rowText = (key: string): string => {
    const i = PANEL.indexOf(`"${key}"`);
    expect(i, `${key} row`).toBeGreaterThan(-1);
    const end = PANEL.indexOf("\n  );", i);
    expect(end, `${key} row end`).toBeGreaterThan(i);
    return PANEL.slice(i, end);
  };

  it("gives the four K130 rows no step, so Reset writes the exact default", () => {
    for (const k of ["backgroundIntensity", "pulseReach", "settleBudget", "loadSettle"]) {
      expect(rowText(k), k).not.toContain("step:");
    }
  });

  it("keeps the old steps' decimals in the four rows' change handlers", () => {
    expect(rowText("backgroundIntensity")).toContain("Math.round(params.backgroundIntensity * 100) / 100");
    expect(rowText("pulseReach")).toContain("Math.round(params.pulseReach * 100) / 100");
    expect(rowText("loadSettle")).toContain("Math.round(params.loadSettle * 100) / 100");
    expect(rowText("settleBudget")).toContain("Math.round(params.settleBudget)");
  });

  it("shows the end glow row only for the halo and beacon looks", () => {
    const i = PANEL.indexOf("revealEndGlowRow.hidden");
    expect(i).toBeGreaterThan(-1);
    const line = PANEL.slice(i, PANEL.indexOf(";", i));
    expect(line).toContain("revealLook");
    expect(line).toContain('"halo"');
    expect(line).toContain('"beacon"');
  });
});

describe("K1115: one general Reset fix in row/doReset", () => {
  it("re-anchors the step grid on the default inside row()", () => {
    const start = PANEL.indexOf("const row = (");
    const end = PANEL.indexOf("const button = (", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const rowSrc = PANEL.slice(start, end);
    expect(rowSrc).toContain("const reanchorStep");
    expect(rowSrc).toContain("reanchorStepBinding(api, opts?.step, def)");
    expect(PANEL).toContain("sc.origin = def");
    expect(rowSrc).toContain("reanchor: reanchorStep");
  });

  it("is used by both reset paths before they refresh", () => {
    const glyph = PANEL.indexOf('btn.addEventListener("pointerdown"');
    expect(glyph).toBeGreaterThan(-1);
    const glyphSrc = PANEL.slice(glyph, PANEL.indexOf("api.refresh?.();", glyph));
    expect(glyphSrc).toContain("obj[key] = def;");
    expect(glyphSrc).toContain("reanchorStep();");
    const dz = PANEL.indexOf("const doReset = (): void => {");
    expect(dz).toBeGreaterThan(-1);
    const dzSrc = PANEL.slice(dz, PANEL.indexOf("pane.refresh();", dz));
    expect(dzSrc).toContain("t.reanchor?.()");
    expect(dzSrc).toContain("Object.assign(params, PARAM_DEFAULTS);");
  });

  it("gains or loses no row's step for the fix", () => {
    // 136 stepped bindings today (K130's sweep surface); a new stepped
    // row updates this pin on purpose, like the codec's key order.
    expect(PANEL.match(/step:/g)).toHaveLength(136); // K778: + ruleUndos
    for (const k of ["backgroundIntensity", "pulseReach", "settleBudget", "loadSettle"]) {
      const i = PANEL.indexOf(`"${k}"`);
      expect(PANEL.slice(i, PANEL.indexOf("\n  );", i)), k).not.toContain("step:");
    }
  });
});
