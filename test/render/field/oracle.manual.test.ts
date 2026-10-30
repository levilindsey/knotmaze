// K868 S1b: the oracle's manual runs (skip-gated like test/sweep.manual.test.ts).
//   K868=1 npx vitest run test/render/field/oracle.manual.test.ts
// K868=A|B|C picks one sheet; K868_SCENES=t90,y120 limits sheet A's scenes.
// Outputs go to the main checkout's .claude/probes/K868/{oracle,sheets}/.

import { describe, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
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
import {
  type Corner,
  FieldModel,
  type OracleParams,
  type OracleRender,
  cornerRadius,
  hexRgb,
  invertCamera,
  renderOracle,
} from "../../../src/render/field/oracle";
import { normS, pointAt } from "../../../src/render/field/geom";
import type { FieldScene, SceneArm } from "../../../src/render/field/scene";
import { ensureDir, fullView, loadSynthetic, outRoot, type View, writeRender, zoomView } from "./lib";
import { type Row, renderSheet, sheetHtml } from "./sheet";
import { cropScale, decodePng, encodePng } from "./png";

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
/**
 * Sheet B's registration measure on an S x S crop: the share of master's ink
 * (luminance < 128) with the oracle's ink (cov > 0.5) within d px, and the
 * share of the oracle's ink with master's within d px.
 */
function registration(rgba: ArrayLike<number>, cov: ArrayLike<number>, S: number, d: number): [number, number] {
  const m = new Uint8Array(S * S);
  const o = new Uint8Array(S * S);
  for (let p = 0; p < S * S; p++) {
    m[p] = 0.299 * rgba[4 * p] + 0.587 * rgba[4 * p + 1] + 0.114 * rgba[4 * p + 2] < 128 ? 1 : 0;
    o[p] = cov[p] > 0.5 ? 1 : 0;
  }
  const near = (a: Uint8Array, b: Uint8Array): number => {
    let n = 0;
    let hit = 0;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        if (!a[y * S + x]) continue;
        n++;
        search: for (let dy = -d; dy <= d; dy++)
          for (let dx = -d; dx <= d; dx++) {
            const X = x + dx;
            const Y = y + dy;
            if (dx * dx + dy * dy <= d * d && X >= 0 && Y >= 0 && X < S && Y < S && b[Y * S + X]) {
              hit++;
              break search;
            }
          }
      }
    return n ? hit / n : 1;
  };
  return [near(m, o), near(o, m)];
}

const runA = want("A") ? it : it.skip;
const runB = want("B") ? it : it.skip;
const runC = want("C") ? it : it.skip;
const runD = want("D") ? it : it.skip;
const runE = want("E") ? it : it.skip;

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
  zoom = 6,
) {
  const zv = zoomView(s, base, at, radius, zoom);
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

  runB(
    "sheet B: a real scene, master next to the oracle",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const sceneDir = join(root, "scenes");
      const name = process.env.K868_REAL ?? "muse_hash";
      const zooms = (process.env.K868_ZOOMS ?? "j123,j49,tip").split(",").filter(Boolean);
      // Samples per pixel per axis. The oracle costs ~0.1-0.2 ms a sample on
      // an 86-chain scene, so the full frame defaults to 1 and the crops to 2.
      const ssFull = Number(process.env.K868_SS_FULL ?? 1);
      const ssZoom = Number(process.env.K868_SS_ZOOM ?? 2);
      // The export's panel covers x ≥ 910 CSS px (its diag); image checks stop at 900.
      const panelX = Number(process.env.K868_PANEL_X ?? 900);
      const load = (n: string) => JSON.parse(readFileSync(join(sceneDir, `${n}.json`), "utf8")) as FieldScene;
      const s = load(name);
      const h = s.look.halfWidth;
      // K883 (§3.8): the slider scales the approved corner, r(θ) =
      // (cr/3)·min(2h, 1.5h·tan(θ/2)), then the arm-span fit; no web cap.
      // The scene's own cr (master's mapping) is not used: K868_CR, default 3.
      const cr = Number(process.env.K868_CR ?? 3);
      const rOf = (_j: number, _i: number, theta: number, style: "round" | "sharp") => (style === "round" ? cornerRadius(cr, h, theta) : 0);
      const params: OracleParams = { rRound: 0, rOf, crMax: cr };
      const rText = `round corners r = (cr/3)·min(2h, 1.5h·tan(θ/2)) fitted inside the arms' spans, cr ${cr}`;
      const paper = hexRgb(s.look.paper);
      const ink = hexRgb(s.look.ink);
      const dir = ensureDir(join(root, "oracle", name));
      const rel = (p: string) => relative(sheets, p).replace(/\\/g, "/");
      const rows: Row[] = [];
      const perImg: { scene: string; results: CheckResult[] }[] = [];
      let t = Date.now();
      const model = new FieldModel(s, params);
      const msModel = Date.now() - t;
      const failed = model.corners.filter((c) => !c.ok).length;
      const fv = fullView(s);
      const full = renderOracle(model, fv.cam, fv.rect, ssFull);
      writeRender(dir, "full", full, { view: fv.label, r: rText, ss: ssFull });
      console.log(name, "model", msModel, "ms; full", full.ms, "ms");
      const c1f = check1(checkContext(model), full.w, full.h, full.cov, full.F, fv.ppu, worldOf(fv));
      rows.push({
        title: `${name}: full frame at the scene camera (master left, oracle right)`,
        tiles: [
          { src: rel(join(sceneDir, `${name}.master.png`)), width: fv.rect.w, label: `master: ${name}.master.png, ${fv.label}` },
          {
            src: rel(join(dir, "full.png")),
            width: full.w,
            label: `oracle, ${ssFull}x${ssFull} samples a pixel; ${rText}. Oracle #1: ${captionLines([c1f])[0]}`,
          },
        ],
        lines: [
          `oracle model ${msModel} ms: ${model.corners.length} corners, ${failed} rolling-ball solves failed (diagnostics below); render ${full.ms} ms`,
          ...model.diagnostics.slice(0, 5).map((d) => `FAIL diag: ${d}`),
          ...(model.diagnostics.length > 5 ? [`FAIL diag: ... and ${model.diagnostics.length - 5} more (oracle/${name}/b.json)`] : []),
        ],
        wrapAt: 2540,
      });
      await new Promise((r) => setTimeout(r, 0));
      for (const z of zooms) {
        const zs = load(`${name}.${z}`);
        const cam = { worldToCss: zs.camera.worldToCss, dpr: zs.camera.dpr };
        const [vw, vh] = zs.camera.viewport;
        const S = 512;
        const v: View = {
          name: z,
          cam,
          rect: { x0: Math.round((vw / 2) * cam.dpr) - S / 2, y0: Math.round((vh / 2) * cam.dpr) - S / 2, w: S, h: S },
          ppu: zs.camera.pxPerUnit,
          label: `${name}.${z}: S1a's 6x camera (${zs.camera.pxPerUnit.toFixed(1)} px/unit, h = ${(h * zs.camera.pxPerUnit).toFixed(1)} px), the centre ${S} px square of its ${vw}x${vh} frame`,
        };
        // Checks see only the frame left of the panel.
        const zm = new FieldModel({ ...zs, camera: { ...zs.camera, viewport: [Math.min(vw, panelX), vh] } }, params);
        const zr = renderOracle(zm, cam, v.rect, ssZoom);
        writeRender(dir, `${z}_6x`, zr, { view: v.label, r: rText, ss: ssZoom });
        const mImg = decodePng(readFileSync(join(sceneDir, `${name}.${z}.master.png`)));
        const mc = cropScale(mImg, v.rect.x0, v.rect.y0, S, S, 1);
        writeFileSync(join(dir, `${z}_6x_master.png`), encodePng(mc.w, mc.h, mc.rgba));
        // Registration aid: master's crop with the oracle's ink over it in red
        // (dark red: both; light red: the oracle only; black: master only).
        const ov = new Uint8Array(mc.rgba);
        for (let p = 0; p < S * S; p++) {
          const a = 0.6 * Math.min(1, Math.max(0, zr.cov[p]));
          ov[4 * p] = Math.round(ov[4 * p] * (1 - a) + 230 * a);
          ov[4 * p + 1] = Math.round(ov[4 * p + 1] * (1 - a) + 20 * a);
          ov[4 * p + 2] = Math.round(ov[4 * p + 2] * (1 - a) + 40 * a);
          ov[4 * p + 3] = 255;
        }
        writeFileSync(join(dir, `${z}_6x_overlay.png`), encodePng(S, S, ov));
        // One 1x pixel is 6 px in these crops.
        const reg = registration(mc.rgba, zr.cov, S, 6);
        const ctxZ = checkContext(zm);
        // #1 on master's pixels: its ink deeper than W + 1 px inside the oracle's regions.
        const mp = imageProbe(mc, cam, v.rect.x0, v.rect.y0, paper, ink, `master ${z} crop`);
        const m1 = check1(ctxZ, S, S, mp.covAt, zr.F, v.ppu, worldOf(v));
        const o1 = check1(ctxZ, S, S, zr.cov, zr.F, v.ppu, worldOf(v));
        t = Date.now();
        const rs = runChecks(zm, imageProbe(mImg, cam, 0, 0, paper, ink, `master ${z} 6x`)).filter((r) => r.id !== 2 && r.id !== 11);
        const msChecks = Date.now() - t;
        perImg.push({ scene: `${name}.${z} (master 6x)`, results: [m1, ...rs] });
        rows.push({
          title: `${name}.${z}: 6x crop (master left, oracle right)`,
          tiles: [
            { src: rel(join(dir, `${z}_6x_master.png`)), width: S, label: `master: ${v.label}. Master's #1: ${captionLines([m1])[0]}` },
            { src: rel(join(dir, `${z}_6x.png`)), width: S, label: `oracle at the same camera, ${ssZoom}x${ssZoom} samples a pixel. Oracle #1: ${captionLines([o1])[0]}` },
            { src: rel(join(dir, `${z}_6x_overlay.png`)), width: S, label: `overlay: master's crop with the oracle's ink in red (dark red: both draw ink; light red: only the oracle; black: only master). Registration: ${(100 * reg[0]).toFixed(1)}% of master's ink lies within 1 px (at 1x) of the oracle's ink, ${(100 * reg[1]).toFixed(1)}% of the oracle's within 1 px of master's` },
          ],
          lines: [
            `Checks on master's whole 6x screenshot left of x = ${panelX} CSS px (the panel), measured from the image against the exact-field thresholds; ${msChecks} ms. Oracle render ${zr.ms} ms.`,
            ...imageLines(rs),
          ],
        });
        console.log(name, z, "render", zr.ms, "ms; checks", msChecks, "ms");
        await new Promise((r) => setTimeout(r, 0));
      }
      writeFileSync(
        join(dir, "b.json"),
        JSON.stringify({ scene: name, r: rText, msModel, failedCorners: failed, diagnostics: model.diagnostics, oracleFull1: c1f, master: perImg }, null, 1),
      );
      writeFileSync(join(root, "oracle", `checks_${name}_master.md`), reportMd(`K868 checks: ${name}, master's 6x screenshots (image path)`, perImg));
      const html = sheetHtml(
        `K868 sheet B: ${name}, master next to the oracle`,
        [
          `Scene ${name} exported by S1a (master ${s.source?.kind === "app" ? s.source.build : ""}); h = ${h} world units = ${(h * s.camera.pxPerUnit).toFixed(1)} CSS px at the scene camera, W = ${s.look.band} world units = ${(s.look.band / h).toFixed(2)}h; cr = ${cr}.`,
          `Oracle: ${rText}. Rows: the full frame, then 6x crops at S1a's zoom cameras (512 px squares at the frame centre, the POI).`,
          "Captions: #k check: PASS/FAIL, measured value [threshold; n sites; skipped sites by reason]. #1 counts ink pixels deeper than W + 1 px inside the oracle's regions: on master's pixels it finds double strokes and fills. The image checks measure master's screenshot with the oracle's geometry; their thresholds are the exact field's, so read them as measurements.",
        ],
        rows,
      );
      const png = await renderSheet(sheets, `B_${name}`, html, 2600);
      console.log("sheet B:", png);
    },
    3600000,
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
          "Oracle fill at the K883 mapping r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)) (= 0.5·cr·h at 90°), per round corner.",
          "Overlay: master's rim at the same cr (red: the quadratic Bezier rim; orange: its band's edges, 0.254h in and 0.185h out of the rim).",
        ];
        for (const cr of [1, 2, 3, 4]) {
          const rOf = (_j: number, _i: number, theta: number, style: "round" | "sharp") => (style === "round" ? cornerRadius(cr, h, theta) : 0);
          const model = new FieldModel(s, { rRound: 0, rOf, crMax: cr });
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
          const t = cropTile(model, s, dir, sheets, `cr${cr}_6x`, at, radius / h, { cr, mapping: "(cr/3)·min(2h, 1.5h·tan(θ/2))" }, (r, v) => {
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
          "§3.8 rows: the oracle at the K883 mapping r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)), with master's corner rim at the same cr drawn over it (red rim, orange band edges). Master's numbers are the helper's reading of joinery.ts and rim_curve.ts, not a screenshot.",
          "Captions: #k PASS/FAIL value per check of the design's section 6 (#1 for that tile; #2, #5, #9 for the scene's exact field).",
        ],
        rows,
      );
      const png = await renderSheet(sheets, "C_radius", html, 2300);
      console.log("sheet C:", png);
    },
    3600000,
  );

  // Sheet D: S1a's full scenes, the image checks on master's 1x screenshots
  // (no oracle render; sheet B has the crops). K868_SCENES picks the scenes.
  runD(
    "sheet D: S1a's scenes, image checks on master's screenshots",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const sceneDir = join(root, "scenes");
      const names = (
        process.env.K868_SCENES ??
        "def.lightpaper,fat.lightpaper,ring.lightpaper,muse_default_tw,muse_hash,def.lightpaper.dsf3,g41_ring_tw42.lightpaper,user_tw42.lightpaper"
      )
        .split(",")
        .filter(Boolean);
      const panelX = Number(process.env.K868_PANEL_X ?? 900);
      const rel = (p: string) => relative(sheets, p).replace(/\\/g, "/");
      const rows: Row[] = [];
      const per: { scene: string; results: CheckResult[] }[] = [];
      for (const name of names) {
        const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
        const h = s.look.halfWidth;
        const cr = s.look.cuspRadius ?? 0;
        const rOf = (_j: number, _i: number, theta: number, style: "round" | "sharp") => (style === "round" ? cornerRadius(3, h, theta) : 0);
        void cr;
        const [vw, vh] = s.camera.viewport;
        let t = Date.now();
        const model = new FieldModel({ ...s, camera: { ...s.camera, viewport: [Math.min(vw, panelX), vh] } }, { rRound: 0, rOf, crMax: 3 });
        const msModel = Date.now() - t;
        const failed = model.corners.filter((c) => !c.ok).length;
        const mPath = join(sceneDir, `${name}.master.png`);
        const mImg = decodePng(readFileSync(mPath));
        const cam = { worldToCss: s.camera.worldToCss, dpr: s.camera.dpr };
        t = Date.now();
        const rs = runChecks(model, imageProbe(mImg, cam, 0, 0, hexRgb(s.look.paper), hexRgb(s.look.ink), `master ${name}`)).filter(
          (r) => r.id !== 2 && r.id !== 11,
        );
        const msChecks = Date.now() - t;
        per.push({ scene: `${name} (master, dpr ${s.camera.dpr})`, results: rs });
        const ppu = s.camera.pxPerUnit;
        rows.push({
          title: `${name}: master's screenshot, image checks`,
          tiles: [
            {
              src: rel(mPath),
              width: 1240,
              label: `master: ${name}.master.png at its scene camera, ${ppu.toFixed(2)} px/unit, dpr ${s.camera.dpr}, ${vw}x${vh} CSS px; h = ${(h * ppu).toFixed(1)} px, W = ${(s.look.band * ppu).toFixed(1)} px, cr ${cr}`,
            },
          ],
          lines: [
            `Checks on master's screenshot left of x = ${panelX} CSS px, with the oracle's geometry (K883: r = (cr/3)·min(2h, 1.5h·tan(θ/2)) at cr 3, fitted inside the arms' spans). Model ${msModel} ms: ${s.chains.length} chains, ${model.corners.length} corners, ${failed} corner solves failed. Checks ${msChecks} ms.`,
            ...imageLines(rs),
          ],
        });
        console.log(name, "model", msModel, "ms; checks", msChecks, "ms");
        await new Promise((r) => setTimeout(r, 0));
      }
      writeFileSync(join(root, "oracle", "checks_scenes_master.md"), reportMd("K868 checks: S1a's scenes, master's screenshots (image path)", per));
      const html = sheetHtml(
        "K868 sheet D: S1a's scenes, image checks on master's screenshots",
        [
          "One row per S1a scene: master's screenshot (light paper; the dsf 3 scenes draw at resolution 2 and the page upscales them) and the image checks of section 6 measured on it with the oracle's geometry. No oracle render here: sheet B shows master and the oracle side by side, with 6x crops.",
          "Captions: #k check: PASS/FAIL, measured value [threshold; n sites; skipped sites by reason]. The thresholds are the exact field's, so read the image results as measurements.",
        ],
        rows,
      );
      const png = await renderSheet(sheets, "D_scenes", html, 2600);
      console.log("sheet D:", png);
    },
    3600000,
  );

  // Sheet E (S2): G1 against the G2 corner candidates (§3.7) with curvature
  // combs; muse_hash's j123 and j49, G1 against the quintic; k42's depth.
  runE(
    "sheet E: G2 corners, curvature combs, k42 depth",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const rel = (p: string) => relative(sheets, p).replace(/\\/g, "/");
      const rows: Row[] = [];
      const byName = new Map(loadSynthetic().map((s) => [s.name, s]));
      const kinds = ["clothoid", "bezier5", "arcs3"] as const;
      // K883: the slider mapping at cr 3 (the scene's cr is master's mapping).
      const ruleOf =
        (h: number, _cr: number): OracleParams["rOf"] =>
        (_j, _i, theta, style) =>
          style === "round" ? cornerRadius(3, h, theta) : 0;
      const tile1x = (model: FieldModel, s: FieldScene, dir: string, base: string, at: [number, number], radius: number, show: number) => {
        const v = zoomView(s, base, at, radius, 1);
        const z = renderOracle(model, v.cam, v.rect, 4);
        writeRender(dir, base, z, { view: v.label });
        return { src: rel(join(dir, `${base}.png`)), width: show, label: `1x (${v.rect.w} px square, shown ${(show / v.rect.w).toFixed(1)}x)` };
      };
      const checksText = (m: FieldModel) => {
        const rs = runChecks(m, oracleProbe(m));
        const bad = rs.filter((r) => r.status === "fail");
        return bad.length ? `FAIL ${bad.map((r) => `#${r.id} ${r.value}`).join("; ")}` : `checks: ${rs.filter((r) => r.status === "pass").length} pass, none fail`;
      };
      const specs: { name: string; how: string; params: (h: number, cr: number) => OracleParams }[] = [
        { name: "t90", how: "§3.8 r at cr 3", params: (h, cr) => ({ rRound: 0, rOf: ruleOf(h, cr), crMax: 3 }) },
        { name: "y120", how: "§3.8 r at cr 3", params: (h, cr) => ({ rRound: 0, rOf: ruleOf(h, cr), crMax: 3 }) },
        { name: "acute30", how: "r = h under the web cap 1.5h (the cap bites: r = 1.5h·tan(θ/2)); §3.8's r here is 0.035h", params: (h) => ({ rRound: h, webCap: 1.5 * h }) },
        { name: "acute20", how: "r = h under the web cap 1.5h (the cap bites); §3.8's r here is 0 (a sharp V)", params: (h) => ({ rRound: h, webCap: 1.5 * h }) },
        { name: "curved", how: "§3.8 r at cr 3; curved arms", params: (h, cr) => ({ rRound: 0, rOf: ruleOf(h, cr), crMax: 3 }) },
      ];
      for (const spec of specs) {
        const s = byName.get(spec.name);
        if (!s) continue;
        const h = s.look.halfWidth;
        const base = spec.params(h, s.look.cuspRadius);
        const dir = join(root, "oracle", "E", spec.name);
        const g1 = new FieldModel(s, base);
        const pick = g1.corners.filter((c) => c.r > 0 && c.ok).sort((p, q) => p.theta - q.theta)[0];
        if (!pick) continue;
        const cornerOf = (m: FieldModel) => m.corners.find((c) => c.junction === pick.junction && c.index === pick.index)!;
        const inset = kinds.map((kind) => new FieldModel(s, { ...base, cornerCurve: kind, cornerSize: "inset" }));
        const tangent = kinds.map((kind) => new FieldModel(s, { ...base, cornerCurve: kind, cornerSize: "tangent" }));
        const models = [g1, ...inset];
        const names = ["G1", ...kinds];
        const stretch = 1.5 * h;
        const combs = models.map((m) => combPoints(m, cornerOf(m), stretch));
        const peak = Math.max(...combs.flatMap((cb) => cb.pts.map((p) => Math.abs(p.k))));
        const S = h / peak;
        const at: [number, number] = [(pick.V[0] + pick.tA[0] + pick.tB[0]) / 3, (pick.V[1] + pick.tA[1] + pick.tB[1]) / 3];
        const web = Math.hypot(pick.tA[0] - pick.V[0], pick.tA[1] - pick.V[1]);
        const radius = Math.min(4.5 * h, Math.max(2.5 * h, web + 2 * h));
        const tiles = [];
        const lines: string[] = [
          `Corner j${pick.junction}/${pick.index}: θ ${deg(pick.theta)}°, r ${(pick.r / h).toFixed(3)}h (${spec.how}), G1 web r·cot(θ/2) = ${(pick.r / Math.tan(pick.theta / 2) / h).toFixed(3)}h. Comb scale: the row's peak |κ| = ${(peak * h).toFixed(3)}/h drawn ${1}h tall.`,
        ];
        for (let i = 0; i < models.length; i++) {
          const m = models[i];
          tiles.push(tile1x(m, s, dir, `${names[i]}_1x`, at, radius, 3 * Math.round(2 * radius * s.camera.pxPerUnit)));
          const t = cropTile(m, s, dir, sheets, `${names[i]}_6x`, at, radius, { kind: names[i], size: "inset" }, (r, v) => drawComb(r, v, combs[i], S));
          t.tile.label = `${spec.name} ${names[i]}${i ? ", inset-sized" : ""}: ${cornerSummary(m, cornerOf(m), combs[i])}`;
          tiles.push(t.tile);
          console.log(spec.name, names[i], t.ms, "ms");
          await new Promise((r) => setTimeout(r, 0));
        }
        lines.push(`G1: ${cornerSummary(g1, cornerOf(g1), combs[0])}; ${checksText(g1)}`);
        for (let i = 0; i < kinds.length; i++) {
          lines.push(`${kinds[i]} inset-sized: ${cornerSummary(inset[i], cornerOf(inset[i]))}; ${checksText(inset[i])}`);
          lines.push(`${kinds[i]} tangent-sized: ${cornerSummary(tangent[i], cornerOf(tangent[i]))}; ${checksText(tangent[i])}`);
        }
        rows.push({ title: `${spec.name}: G1, then the clothoid pair, the quintic Bézier and the three-arc spline (inset-sized), each at 1x and 6x with its comb`, tiles, lines, wrapAt: 2300 });
      }

      // muse_hash: G1 against the quintic (inset-sized) at §3.8's r. Each
      // quintic crop takes about 17 min (the CPU oracle's polyline corners),
      // so K868_E_ROWS=synth skips them and writes E_g2_synth instead.
      const synthOnly = process.env.K868_E_ROWS === "synth";
      const sceneDir = join(root, "scenes");
      for (const jn of synthOnly ? [] : ["j123", "j49"]) {
        const s = JSON.parse(readFileSync(join(sceneDir, `muse_hash.${jn}.json`), "utf8")) as FieldScene;
        const h = s.look.halfWidth;
        const J = Number(jn.slice(1));
        const base: OracleParams = { rRound: 0, rOf: ruleOf(h, s.look.cuspRadius ?? 0), crMax: 3 };
        const dir = join(root, "oracle", "E", `muse_hash_${jn}`);
        let t0 = Date.now();
        const g1 = new FieldModel(s, base);
        const msG1 = Date.now() - t0;
        t0 = Date.now();
        const bz = new FieldModel(s, { ...base, cornerCurve: "bezier5", cornerSize: "inset" });
        const msBz = Date.now() - t0;
        const extra: string[] = [];
        if (jn === "j123") {
          t0 = Date.now();
          const cl = new FieldModel(s, { ...base, cornerCurve: "clothoid", cornerSize: "inset" });
          const msCl = Date.now() - t0;
          extra.push(`clothoid (inset) over the scene: ${sceneStats(cl)}; model ${msCl} ms`);
        }
        const round = g1.corners.filter((c) => c.r > 0 && c.ok).length;
        const here = (m: FieldModel) => m.corners.filter((c) => c.junction === J && c.r > 0 && c.ok);
        const cbs = [g1, bz].map((m) => here(m).map((c) => combPoints(m, c, 1.5 * h)));
        const peak = Math.max(1e-9, ...cbs.flat().flatMap((cb) => cb.pts.map((p) => Math.abs(p.k))));
        const S = (0.8 * h) / peak;
        const at = s.pois!.find((p) => p.name === jn)!.at;
        const tiles = [];
        const lines: string[] = [
          `${round} round corners with r > 0 in the scene; G1 model ${msG1} ms, quintic (inset) model ${msBz} ms: ${((msBz - msG1) / Math.max(1, round)).toFixed(1)} ms more per round corner.`,
          `quintic (inset) over the scene: ${sceneStats(bz)}`,
          ...extra,
        ];
        for (const [i, m] of [g1, bz].entries()) {
          const nm = i ? "bezier5" : "G1";
          const t = cropTile(m, s, dir, sheets, `${nm}`, at, 5 * h, { kind: nm }, (r, v) => {
            for (const cb of cbs[i]) drawComb(r, v, cb, S);
          }, 1);
          // At the scene's own camera (k = 1): muse_hash's h is already 51 px.
          t.tile.width = 2 * t.tile.width;
          t.tile.label = `muse_hash ${jn} ${nm}${i ? " (inset-sized)" : ""}: ${t.zv.label}`;
          tiles.push(t.tile);
          for (const c of here(m)) lines.push(`${nm} j${c.junction}/${c.index}: θ ${deg(c.theta)}°, r ${(c.r / h).toFixed(3)}h; ${cornerSummary(m, c)}`);
          console.log(jn, nm, t.ms, "ms");
          await new Promise((r) => setTimeout(r, 0));
        }
        rows.push({ title: `muse_hash ${jn}: G1 against the quintic Bézier at the same r (§3.8, web cap 1.5h)`, tiles, lines, wrapAt: 2300 });
      }

      // k42: the scene's depth samples against the diagram's (§3.3).
      const k42 = byName.get("k42");
      if (k42) {
        const h = k42.look.halfWidth;
        const dir = join(root, "oracle", "E", "k42");
        const tiles = [];
        const lines: string[] = [];
        for (const depth of ["scene", "diagram"] as const) {
          const m = new FieldModel(k42, { rRound: 0.5 * h, depth });
          const rs = runChecks(m, oracleProbe(m));
          const poi = k42.pois![0];
          const t = cropTile(m, k42, dir, sheets, `depth_${depth}`, poi.at, Math.min(poi.radius, 3 * h), { depth });
          t.tile.label = `k42, depth "${depth}": ${t.zv.label}`;
          tiles.push(t.tile);
          lines.push(`depth "${depth}": ${short(rs, [14, 2, 5, 9])}`);
        }
        rows.push({ title: `k42: the old depth rule (the scene's z samples) against the new one (the crossing diagram, §3.3)`, tiles, lines, wrapAt: 2300 });
      }

      const html = sheetHtml(
        "K868 sheet E: G2 corners and curvature combs",
        [
          "CPU oracle, supersampling 4x4. Synthetic rows: G1 (the rolling-ball arc), then the clothoid pair, the quintic Bézier (handle λ picked per corner: the lowest peak among one-hump λ) and the three-arc spline, each sized to G1's apex inset (the curve crosses V→q at vq − r) by moving both feet out along the arms by one centreline arc length σ. Each at 1x (the scene camera, h = 10 px, upscaled) and 6x with its comb.",
          "Comb: blue teeth from the curve to its curvature drawn on the convex side (one scale per row, the row's peak |κ| = h tall), magenta envelope, red the corner curve, green the joins; it runs 1.5h of centreline along each arm. A step in the envelope at a join is a curvature jump; G1's is 1/r minus the side's curvature.",
          "Captions: peak κ·h (G1: h/r), the joins' |Δκ|·h (G2 target ≤ 0.01; the arc spline's own steps), the apex inset from V (G1's), σ, the webs |V − join| (the cap is 1.5h), the least clearance to either side's centreline minus h (negative: inside the side, the polyline's chord sag), the hump fall (0: one hump), the checks of section 6 on that model. Tangent-sized lines keep G1's tangent points (σ = 0).",
          "muse_hash rows (S1a's export of the live app, h = 51 px): the scene's own camera, 5h around the junction, shown 2x; a comb on every round corner of the junction (one scale per row); scene-wide counts of built candidates and the model build times.",
          "k42 row: check #14 (depth) and the shared-area checks under each depth rule.",
        ],
        rows,
      );
      const png = await renderSheet(sheets, synthOnly ? "E_g2_synth" : "E_g2", html, 2500);
      console.log("sheet E:", png);
    },
    3600000,
  );
});

type CombPt = { x: number; y: number; k: number };
interface Comb {
  pts: CombPt[];
  /** Index of A's outline point at the join, and of B's. */
  joinA: number;
  joinB: number;
  /** G1's arc curvature (signed) when the comb is G1's. */
  kArc?: number;
}

/** A stretch of A's outline, the corner curve (G2 if built, else G1's arc), a stretch of B's, in travel order. */
function combPoints(model: FieldModel, c: Corner, stretch: number): Comb {
  const g = c.g2 && c.g2.ok ? c.g2 : undefined;
  const sA = g ? g.sA : c.sTA;
  const sB = g ? g.sB : c.sTB;
  const n = 30;
  const pts: CombPt[] = [];
  for (let i = n; i >= 0; i--) {
    const e = model.outlineEnd(c, "A", sA + (c.armA.dir * stretch * i) / n);
    pts.push({ x: e.p[0], y: e.p[1], k: e.k });
  }
  const joinA = pts.length - 1;
  let kArc: number | undefined;
  if (g) for (let i = 0; i < g.curve.x.length; i++) pts.push({ x: g.curve.x[i], y: g.curve.y[i], k: g.curve.k[i] });
  else {
    const u0x = c.tA[0] - c.q[0];
    const u0y = c.tA[1] - c.q[1];
    const u1x = c.tB[0] - c.q[0];
    const u1y = c.tB[1] - c.q[1];
    const a0 = Math.atan2(u0y, u0x);
    const d = Math.atan2(u0x * u1y - u0y * u1x, u0x * u1x + u0y * u1y);
    kArc = Math.sign(d) / c.r;
    for (let i = 0; i <= 120; i++) {
      const a = a0 + (d * i) / 120;
      pts.push({ x: c.q[0] + c.r * Math.cos(a), y: c.q[1] + c.r * Math.sin(a), k: kArc });
    }
  }
  const joinB = pts.length;
  for (let i = 0; i <= n; i++) {
    const e = model.outlineEnd(c, "B", sB + (c.armB.dir * stretch * i) / n);
    pts.push({ x: e.p[0], y: e.p[1], k: e.k });
  }
  return { pts, joinA, joinB, kArc };
}

/** Draws a comb into a render: teeth on the convex side, the envelope, the corner curve, the joins. */
function drawComb(r: OracleRender, v: View, cb: Comb, S: number): void {
  const [a, b, cc, dd, e, f] = v.cam.worldToCss;
  const px = (x: number, y: number): [number, number] => [(a * x + cc * y + e) * v.cam.dpr - v.rect.x0, (b * x + dd * y + f) * v.cam.dpr - v.rect.y0];
  const put = (x: number, y: number, col: readonly number[]) => {
    const i = Math.floor(x);
    const j = Math.floor(y);
    if (i < 0 || j < 0 || i >= r.w || j >= r.h) return;
    const o = (j * r.w + i) * 4;
    r.rgba[o] = col[0];
    r.rgba[o + 1] = col[1];
    r.rgba[o + 2] = col[2];
    r.rgba[o + 3] = 255;
  };
  const line = (p: [number, number], q: [number, number], col: readonly number[]) => {
    const n = Math.ceil(2 * Math.hypot(q[0] - p[0], q[1] - p[1])) + 1;
    for (let i = 0; i <= n; i++) put(p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n, col);
  };
  const P = cb.pts;
  const base: [number, number][] = [];
  const tip: [number, number][] = [];
  for (let i = 0; i < P.length; i++) {
    const p0 = P[Math.max(0, i - 1)];
    const p1 = P[Math.min(P.length - 1, i + 1)];
    let tx = p1.x - p0.x;
    let ty = p1.y - p0.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    base.push(px(P[i].x, P[i].y));
    // Convex side: −κ·S along the left normal (−ty, tx).
    tip.push(px(P[i].x + P[i].k * S * ty, P[i].y - P[i].k * S * tx));
  }
  const TEETH: readonly number[] = [40, 130, 255];
  const ENV: readonly number[] = [235, 0, 190];
  const CURVE: readonly number[] = [220, 30, 30];
  const JOIN: readonly number[] = [0, 170, 0];
  let run = Infinity;
  for (let i = 0; i < P.length; i++) {
    if (i) run += Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]);
    if (run >= 5 || i === cb.joinA || i === cb.joinB || i === cb.joinA + 1 || i === cb.joinB - 1) {
      line(base[i], tip[i], TEETH);
      run = 0;
    }
  }
  for (let i = cb.joinA + 1; i < cb.joinB; i++) line(base[i - 1], base[i], CURVE);
  for (let i = 1; i < P.length; i++) line(tip[i - 1], tip[i], ENV);
  for (const j of [cb.joinA, cb.joinB]) for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) put(base[j][0] + dx, base[j][1] + dy, JOIN);
}

/** One corner's numbers for a caption (G1 from its comb, a G2 candidate from its record). */
function cornerSummary(model: FieldModel, c: Corner, cb?: Comb): string {
  const h = model.h;
  const g = c.g2;
  const f3 = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : String(x));
  if (!g) {
    const kA = model.outlineEnd(c, "A", c.sTA).k;
    const kB = model.outlineEnd(c, "B", c.sTB).k;
    const kArc = cb?.kArc ?? -1 / c.r;
    return `G1 arc: peak κ·h ${f3(h / c.r)}, joins |Δκ|·h ${f3(Math.abs(kArc - kA) * h)} / ${f3(Math.abs(kArc - kB) * h)}, inset ${f3((c.vq - c.r) / h)}h, web ${f3(c.r / Math.tan(c.theta / 2) / h)}h`;
  }
  if (!g.ok) return `not built (${g.note || "no curve"}); the corner keeps G1's arc`;
  const steps = g.curve.steps.length ? `, curvature steps ${g.curve.steps.map((x) => f3(x * h)).join(", ")}/h` : "";
  return (
    `peak κ·h ${f3(g.peak * h)} (G1 ${f3(h / c.r)}), joins |Δκ|·h ${f3(g.jumpA * h)} / ${f3(g.jumpB * h)}${steps}, inset ${f3(g.inset / h)}h (G1 ${f3(g.insetG1 / h)}h), σ ${f3(g.sigma / h)}h, ` +
    `webs ${f3(g.webA / h)}h / ${f3(g.webB / h)}h, clearance ${(Math.min(g.clearA, g.clearB) / h).toFixed(4)}h, hump fall ${(g.humpFall * h).toExponential(1)}${g.note ? `; ${g.note}` : ""}`
  );
}

/** Scene-wide counts for a G2 model: built, failed, notes, worst numbers. */
function sceneStats(m: FieldModel): string {
  const h = m.h;
  const gs = m.corners.filter((c) => c.r > 0 && c.ok && c.g2).map((c) => c.g2!);
  const ok = gs.filter((g) => g.ok);
  const notes = new Map<string, number>();
  for (const g of gs) if (g.note) notes.set(g.note.split(/[:(\d]/)[0].trim(), (notes.get(g.note.split(/[:(\d]/)[0].trim()) ?? 0) + 1);
  const mx = (xs: number[]) => (xs.length ? Math.max(...xs) : NaN);
  const mn = (xs: number[]) => (xs.length ? Math.min(...xs) : NaN);
  const overCap = ok.filter((g) => Math.max(g.webA, g.webB) > 1.5 * h + 1e-9).length;
  return (
    `${ok.length} of ${gs.length} built; worst join |Δκ|·h ${mx(ok.map((g) => Math.max(g.jumpA, g.jumpB) * h)).toFixed(4)}, least clearance ${(mn(ok.map((g) => Math.min(g.clearA, g.clearB))) / h).toFixed(4)}h, ` +
    `worst hump fall ${(mx(ok.map((g) => g.humpFall)) * h).toExponential(1)}, worst inset miss ${(mx(ok.map((g) => Math.abs(g.inset - g.insetG1))) / h).toFixed(4)}h, webs over 1.5h: ${overCap}` +
    (notes.size ? `; notes: ${[...notes].map(([k, v]) => `${v}x "${k}"`).join(", ")}` : "")
  );
}
