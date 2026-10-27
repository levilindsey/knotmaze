// K868 S1b: the oracle's manual runs (skip-gated like test/sweep.manual.test.ts).
//   K868=1 npx vitest run test/render/field/oracle.manual.test.ts
// K868=A|B|C picks one sheet; K868_SCENES=t90,y120 limits sheet A's scenes.
// Outputs go to the main checkout's .claude/probes/K868/{oracle,sheets}/.

import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  type CheckResult,
  captionLines,
  check1,
  checkContext,
  edtCheck,
  imageProbe,
  oracleProbe,
  runChecks,
} from "../../../src/render/field/checks";
import { FieldModel, type OracleRender, hexRgb, invertCamera, renderOracle } from "../../../src/render/field/oracle";
import { normS, pointAt } from "../../../src/render/field/geom";
import type { FieldScene, SceneArm } from "../../../src/render/field/scene";
import { ensureDir, fullView, loadSynthetic, outRoot, type View, writeRender, zoomView } from "./lib";
import { type Row, renderSheet, sheetHtml } from "./sheet";

const want = (k: string) => process.env.K868 === "1" || process.env.K868 === k;

/** Pixel-centre world coordinates of a render. */
const worldOf = (v: View) => {
  const inv = invertCamera(v.cam);
  return (i: number, j: number) => inv((v.rect.x0 + i + 0.5) / v.cam.dpr, (v.rect.y0 + j + 0.5) / v.cam.dpr);
};

const key = (r: CheckResult) => (r.id === 0 ? r.name : `${r.id} ${r.name}`);
const cell = (r: CheckResult | undefined) =>
  r ? `${r.status === "pass" ? "PASS" : r.status === "fail" ? "**FAIL**" : "n/a"} ${r.value.replace(/\|/g, "\\|")}` : "";

/** Image-path lines: measured values against the exact-field thresholds, uncoloured. */
const imageLines = (rs: CheckResult[]) =>
  rs.map(
    (r) =>
      `  image #${r.id} ${r.name}: ${r.value} [exact-field threshold ${r.threshold}${r.status === "fail" ? ", exceeded" : r.status === "pass" ? ", met" : ""}; n ${r.n}]`,
  );

/** Markdown table: one row per scene, one column per check. */
function reportMd(title: string, per: { scene: string; results: CheckResult[] }[]): string {
  const cols: string[] = [];
  for (const p of per) for (const r of p.results) if (!cols.includes(key(r))) cols.push(key(r));
  const lines = [`# ${title}`, "", `| scene | ${cols.join(" | ")} |`, `|---|${cols.map(() => "---").join("|")}|`];
  for (const p of per) lines.push(`| ${p.scene} | ${cols.map((c) => cell(p.results.find((r) => key(r) === c))).join(" | ")} |`);
  return lines.join("\n") + "\n";
}

function tileCheck1(model: FieldModel, v: View, r: OracleRender): CheckResult {
  return check1(checkContext(model), r.w, r.h, r.cov, r.F, v.ppu, worldOf(v));
}
const runA = want("A") ? it : it.skip;
const runC = want("C") ? it : it.skip;

const deg = (a: number) => ((a * 180) / Math.PI).toFixed(1);

/** Unit direction of an arm leaving its junction (chord over 2h). */
function armDir(model: FieldModel, arm: SceneArm): [number, number] {
  const p = model.polys[model.idxOf.get(arm.chain)!];
  const a = pointAt(p, normS(p, arm.s));
  const b = pointAt(p, normS(p, arm.s + arm.dir * 2 * model.h));
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  return [(b.x - a.x) / l, (b.y - a.y) / l];
}

/**
 * Master's round corner at cr (helper's reading of joinery.ts:2172-2185 and
 * rim_curve.ts:72-80): a quadratic Bezier from tip A to tip B with control
 * V' (the 0.97h rim lines' intersection), tips 1.25·cr·h along each arm from
 * the junction; its band straddles the rim, 0.254h inward and 0.185h
 * outward. Drawn into a render: rim red, band edges orange. Straight arms
 * through the junction centre only (the synthetic T and Y).
 */
function drawMasterRim(r: OracleRender, v: View, c: [number, number], uA: [number, number], uB: [number, number], h: number, cr: number): number {
  const w = 0.97 * h;
  const theta = Math.acos(Math.max(-1, Math.min(1, uA[0] * uB[0] + uA[1] * uB[1])));
  const bis = [uA[0] + uB[0], uA[1] + uB[1]];
  const bl = Math.hypot(bis[0], bis[1]);
  const Vm = [c[0] + (bis[0] / bl) * (w / Math.sin(theta / 2)), c[1] + (bis[1] / bl) * (w / Math.sin(theta / 2))];
  const d = 1.25 * cr * h - w / Math.tan(theta / 2);
  if (d <= 0) return d;
  const A = [Vm[0] + d * uA[0], Vm[1] + d * uA[1]];
  const B = [Vm[0] + d * uB[0], Vm[1] + d * uB[1]];
  const [a, b, cc, dd, e, f] = v.cam.worldToCss;
  const plot = (x: number, y: number, col: [number, number, number]) => {
    const px = Math.floor((a * x + cc * y + e) * v.cam.dpr - v.rect.x0);
    const py = Math.floor((b * x + dd * y + f) * v.cam.dpr - v.rect.y0);
    if (px < 0 || py < 0 || px >= r.w || py >= r.h) return;
    const o = (py * r.w + px) * 4;
    r.rgba[o] = col[0];
    r.rgba[o + 1] = col[1];
    r.rgba[o + 2] = col[2];
  };
  for (let i = 0; i <= 6000; i++) {
    const t = i / 6000;
    const x = (1 - t) * (1 - t) * A[0] + 2 * t * (1 - t) * Vm[0] + t * t * B[0];
    const y = (1 - t) * (1 - t) * A[1] + 2 * t * (1 - t) * Vm[1] + t * t * B[1];
    const tx = 2 * (1 - t) * (Vm[0] - A[0]) + 2 * t * (B[0] - Vm[0]);
    const ty = 2 * (1 - t) * (Vm[1] - A[1]) + 2 * t * (B[1] - Vm[1]);
    const tl = Math.hypot(tx, ty);
    let nx = -ty / tl;
    let ny = tx / tl;
    if (nx * (x - c[0]) + ny * (y - c[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    plot(x + 0.185 * h * nx, y + 0.185 * h * ny, [240, 140, 0]);
    plot(x - 0.254 * h * nx, y - 0.254 * h * ny, [240, 140, 0]);
    if (i % 3 === 0) plot(x, y, [220, 30, 30]);
  }
  return d;
}

/** A 6x crop tile of a model around a world point, with its #1. */
function cropTile(
  model: FieldModel,
  s: FieldScene,
  dir: string,
  sheets: string,
  base: string,
  at: [number, number],
  radius: number,
  meta: object,
  draw?: (r: OracleRender, v: View) => void,
) {
  const zv = zoomView(s, base, at, radius, 6);
  const z = renderOracle(model, zv.cam, zv.rect, 4);
  const c1 = tileCheck1(model, zv, z);
  draw?.(z, zv);
  writeRender(dir, base, z, { view: zv.label, ...meta });
  return { tile: { src: relative(sheets, join(dir, `${base}.png`)).replace(/\\/g, "/"), width: z.w, label: "" }, zv, c1, ms: z.ms };
}

/** Compact check lines for a caption. */
const short = (rs: CheckResult[], ids: number[]) =>
  rs
    .filter((r) => ids.includes(r.id))
    .map((r) => `#${r.id} ${r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "n/a"} ${r.value}`)
    .join("; ");

/** θ, r and the web length ℓ = r·cot(θ/2) of every corner. */
const cornerText = (model: FieldModel) =>
  model.corners
    .map((c) => `${deg(c.theta)}° ${c.style}${c.style === "round" ? ` r ${(c.r / model.h).toFixed(2)}h ℓ ${(c.r / Math.tan(c.theta / 2) / model.h).toFixed(2)}h` : ""}${c.ok ? "" : " SOLVE FAILED"}`)
    .join(", ");

describe("K868 oracle (manual)", () => {
  runA(
    "sheet A: synthetic scenes",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const rows: Row[] = [];
      const per: { scene: string; results: CheckResult[] }[] = [];
      const perImg: { scene: string; results: CheckResult[] }[] = [];
      for (const s of loadSynthetic()) {
        const h = s.look.halfWidth;
        const model = new FieldModel(s, { rRound: 0.5 * h });
        const dir = join(root, "oracle", s.name);
        const fv = fullView(s);
        const full = renderOracle(model, fv.cam, fv.rect, 4);
        writeRender(dir, "full", full, { view: fv.label, rRound: 0.5 * h });
        const c1 = tileCheck1(model, fv, full);
        const tiles = [
          {
            src: relative(sheets, join(dir, "full.png")).replace(/\\/g, "/"),
            width: full.w * 2,
            label: `${fv.label}; shown at 2x. ${captionLines([c1])[0]}`,
          },
        ];
        const lines: string[] = [];
        const tileC1: CheckResult[] = [c1];
        for (const poi of s.pois ?? []) {
          const zv = zoomView(s, `${poi.name}_6x`, poi.at, poi.radius, 6);
          const z = renderOracle(model, zv.cam, zv.rect, 4);
          writeRender(dir, zv.name, z, { view: zv.label, rRound: 0.5 * h });
          const z1 = tileCheck1(model, zv, z);
          tileC1.push(z1);
          tiles.push({
            src: relative(sheets, join(dir, `${zv.name}.png`)).replace(/\\/g, "/"),
            width: z.w,
            label: `${zv.label}. ${captionLines([z1])[0]}`,
          });
          lines.push(`render ${zv.name}: ${z.ms} ms`);
          await new Promise((r) => setTimeout(r, 0));
        }
        // Checks on the oracle's exact field (the probe bisects run ends).
        const t0 = Date.now();
        const ctx = checkContext(model);
        const results = runChecks(model, oracleProbe(model));
        const bad1 = tileC1.filter((r) => r.status === "fail").length;
        results.unshift({
          ...c1,
          status: bad1 ? "fail" : "pass",
          value: `${tileC1.map((r) => r.value.split(" ")[0]).join(" / ")} px deeper than W + 1 px (full / 6x crops)`,
          n: tileC1.reduce((a, r) => a + r.n, 0),
        });
        await new Promise((r) => setTimeout(r, 0));
        results.unshift(edtCheck(ctx, full.w, full.h, full.F, fv.ppu, worldOf(fv), 0.02 * h));
        const msChecks = Date.now() - t0;
        // The image path on the oracle's own 1x render: the noise floor of
        // the screenshot checks in step 3.
        const look = s.look;
        const img = imageProbe(full, fv.cam, 0, 0, hexRgb(look.paper), hexRgb(look.ink), "oracle 1x image");
        const imgResults = runChecks(model, img).filter((r) => r.id !== 2 && r.id !== 11);
        per.push({ scene: s.name, results });
        perImg.push({ scene: s.name, results: imgResults });
        writeFileSync(join(dir, "checks.json"), JSON.stringify({ scene: s.name, rRound: 0.5 * h, oracle: results, image1x: imgResults }, null, 1));
        lines.unshift(
          `render full: ${full.ms} ms; checks ${msChecks} ms; corners ${model.corners.length}, clusters ${model.clusters.length}`,
          ...captionLines(results),
          "Image path on this 1x render (the noise floor of step 3's screenshot checks):",
          ...imageLines(imgResults),
        );
        for (const c of model.corners)
          lines.push(
            `corner ${s.junctions[c.junction].id}/${c.index}: theta ${((c.theta * 180) / Math.PI).toFixed(1)} deg, ${c.style}, r ${c.r.toFixed(3)}, solve ${c.ok ? "ok" : "FAILED"}`,
          );
        for (const d of model.diagnostics) lines.push(`FAIL diag: ${d}`);
        rows.push({ title: `${s.name} (r = 0.5h on round corners)`, tiles, lines });
        console.log(s.name, full.ms, "ms");
        // Let vitest's worker RPC breathe between CPU-bound scenes.
        await new Promise((r) => setTimeout(r, 0));
      }
      const oracleDir = ensureDir(join(root, "oracle"));
      writeFileSync(join(oracleDir, "checks_synthetic.md"), reportMd("K868 checks: synthetic scenes, oracle field (r = 0.5h)", per));
      writeFileSync(join(oracleDir, "checks_synthetic_image1x.md"), reportMd("K868 checks: synthetic scenes, image path on the oracle's 1x renders", perImg));
      const html = sheetHtml(
        "K868 sheet A: synthetic scenes, CPU oracle",
        [
          "h = 1 world unit = 10 CSS px at 1x, W = 0.38h. Left: the scene camera (1x) shown at 2x; right: 6x zoom renders around each POI.",
          "Round corners: rolling ball r = 0.5h; sharp corners: V. Supersampling 4x4 per device pixel.",
          "Captions: #k check: PASS/FAIL, measured value [threshold; n sites; skipped sites by reason]. Distances are CSS px at the scene camera (h = 10 px) unless a tile says otherwise. #EDT compares the oracle's exact F with a distance transform of its rasterised union (grid 0.02h).",
          "Check numbers follow the design's section 6. Each tile's caption carries #1 for that render; the row lists the scene's checks on the exact field, then the same checks measured from this 1x image (the noise floor of the screenshot checks).",
        ],
        rows,
      );
      const png = await renderSheet(sheets, "A_synthetic", html);
      console.log("sheet A:", png);
    },
    1800000,
  );

  runC(
    "sheet C: r sweep, web cap, cr mapping",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const rows: Row[] = [];
      const all = loadSynthetic();
      const byName = new Map(all.map((s) => [s.name, s]));
      const sweep = [0, 0.25, 0.5, 1, 2];
      const cap = 1.5;
      for (const name of ["t90", "y120", "acute30", "acute20", "x4_throughs"]) {
        const s = byName.get(name);
        if (!s) continue;
        const h = s.look.halfWidth;
        const poi = s.pois![0];
        const radius = Math.min(poi.radius, 3) * h;
        const dir = join(root, "oracle", "C", name);
        const tiles = [];
        const lines: string[] = [];
        const variants: { rr: number; capped: boolean }[] = [
          ...sweep.map((rr) => ({ rr, capped: false })),
          { rr: 1, capped: true },
          { rr: 2, capped: true },
        ];
        for (const { rr, capped } of variants) {
          const model = new FieldModel(s, { rRound: rr * h, webCap: capped ? cap * h : 0 });
          const base = `r${rr}${capped ? "_cap" : ""}_6x`;
          const t = cropTile(model, s, dir, sheets, base, poi.at, radius / h, { rRound: rr * h, webCap: capped ? cap * h : 0 });
          const rs = runChecks(model, oracleProbe(model));
          const tag = `r = ${rr}h${capped ? `, web cap ℓmax ${cap}h (r ≤ ℓmax·tan(θ/2))` : ""}`;
          t.tile.label = `${name}, ${tag}. ${t.zv.label}. Corners: ${cornerText(model)}. #1 ${t.c1.status === "pass" ? "PASS" : "FAIL"} ${t.c1.value}; ${short(rs, [2, 5, 9])}`;
          tiles.push(t.tile);
          lines.push(`${tag}: ${short(rs, [2, 4, 5, 8, 9])}; #1 ${t.c1.status === "pass" ? "PASS" : "FAIL"} ${t.c1.value.split(" (")[0]}`);
          console.log(name, base, t.ms, "ms");
          await new Promise((r) => setTimeout(r, 0));
        }
        rows.push({ title: `${name}: r sweep {0, 0.25h, 0.5h, h, 2h}, then h and 2h under the web cap`, tiles, lines, wrapAt: 1700 });
      }
      // §3.8: master's corner at cr against the oracle at the mapped r.
      for (const name of ["t90", "y120"]) {
        const s = byName.get(name);
        if (!s) continue;
        const h = s.look.halfWidth;
        const dir = join(root, "oracle", "C", `${name}_cr`);
        const tiles = [];
        const lines: string[] = [
          "Oracle fill at r(θ) = h·max(0, 1.25·cr·tan(θ/2) − 0.97) (= h·(1.25·cr − 0.97) at 90°), per round corner.",
          "Overlay: master's rim at the same cr (red: the quadratic Bezier rim; orange: its band's edges, 0.254h in and 0.185h out of the rim).",
        ];
        for (const cr of [1, 2, 3, 4]) {
          const rOf = (_j: number, _i: number, theta: number, style: "round" | "sharp") =>
            style === "round" ? h * Math.max(0, 1.25 * cr * Math.tan(theta / 2) - 0.97) : 0;
          const model = new FieldModel(s, { rRound: 0, rOf });
          const round = model.corners.filter((c) => c.style === "round" && c.theta < Math.PI - 1e-3 && c.ok);
          if (!round.length) continue;
          const c0 = round[0];
          const J = s.junctions[c0.junction];
          const uA = armDir(model, c0.armA);
          const uB = armDir(model, c0.armB);
          const at: [number, number] = [(c0.V[0] + c0.tA[0] + c0.tB[0]) / 3, (c0.V[1] + c0.tA[1] + c0.tB[1]) / 3];
          const span = Math.hypot(c0.tA[0] - c0.tB[0], c0.tA[1] - c0.tB[1]);
          const radius = Math.min(4.5 * h, Math.max(2.5 * h, 0.6 * span + 1.2 * h));
          let dTip = 0;
          const t = cropTile(model, s, dir, sheets, `cr${cr}_6x`, at, radius / h, { cr, mapping: "h·max(0, 1.25·cr·tan(θ/2) − 0.97)" }, (r, v) => {
            dTip = drawMasterRim(r, v, J.c, uA, uB, h, cr);
          });
          const rs = runChecks(model, oracleProbe(model));
          t.tile.label = `${name} at cr ${cr}: oracle r ${(c0.r / h).toFixed(2)}h at θ ${deg(c0.theta)}° (ℓ ${(c0.r / Math.tan(c0.theta / 2) / h).toFixed(2)}h); master's tips ${(dTip / h).toFixed(2)}h from V' along each rim line. ${t.zv.label}. #1 ${t.c1.status === "pass" ? "PASS" : "FAIL"} ${t.c1.value}; ${short(rs, [2, 5, 9])}`;
          tiles.push(t.tile);
          lines.push(`cr ${cr}: oracle r ${(c0.r / h).toFixed(2)}h, master tips ${(dTip / h).toFixed(2)}h from V'; ${short(rs, [2, 5])}`);
          console.log(name, "cr", cr, t.ms, "ms");
          await new Promise((r) => setTimeout(r, 0));
        }
        rows.push({ title: `${name}: §3.8, master's cr against the mapped r`, tiles, lines, wrapAt: 1700 });
      }
      const html = sheetHtml(
        "K868 sheet C: rolling-ball radius sweep, web-length cap, cr → r",
        [
          "Synthetic scenes, CPU oracle, h = 1 world unit = 10 CSS px at the scene camera; every tile is a 6x zoom of the scene camera (h = 60 px), W = 0.38h. Supersampling 4x4.",
          "Sweep rows: the rolling-ball radius r of every round corner (sharp corners stay V), then r = h and 2h under the web-length cap ℓmax = 1.5h (r ≤ ℓmax·tan(θ/2), so the web from V to each tangent point is at most 1.5h). ℓ in captions = r·cot(θ/2), the web length.",
          "§3.8 rows: the oracle at the proposed mapping r(θ) = h·max(0, 1.25·cr·tan(θ/2) − 0.97), with master's corner rim at the same cr drawn over it (red rim, orange band edges). Master's numbers are the helper's reading of joinery.ts and rim_curve.ts, not a screenshot.",
          "Captions: #k PASS/FAIL value per check of the design's section 6 (#1 for that tile; #2, #5, #9 for the scene's exact field).",
        ],
        rows,
      );
      const png = await renderSheet(sheets, "C_radius", html, 2300);
      console.log("sheet C:", png);
    },
    3600000,
  );
});
