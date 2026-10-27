// K868 S1b: the oracle's manual runs (skip-gated like test/sweep.manual.test.ts).
//   K868=1 npx vitest run test/render/field/oracle.manual.test.ts
// K868=A|B|C picks one sheet; K868_SCENES=t90,y120 limits sheet A's scenes.
// Outputs go to the main checkout's .claude/probes/K868/{oracle,sheets}/.

import { describe, it } from "vitest";
import { join, relative } from "node:path";
import { FieldModel, renderOracle } from "../../../src/render/field/oracle";
import { ensureDir, fullView, loadSynthetic, outRoot, writeRender, zoomView } from "./lib";
import { type Row, renderSheet, sheetHtml } from "./sheet";

const want = (k: string) => process.env.K868 === "1" || process.env.K868 === k;
const runA = want("A") ? it : it.skip;

describe("K868 oracle (manual)", () => {
  runA(
    "sheet A: synthetic scenes",
    async () => {
      const root = outRoot();
      const sheets = ensureDir(join(root, "sheets"));
      const rows: Row[] = [];
      for (const s of loadSynthetic()) {
        const h = s.look.halfWidth;
        const model = new FieldModel(s, { rRound: 0.5 * h });
        const dir = join(root, "oracle", s.name);
        const fv = fullView(s);
        const full = renderOracle(model, fv.cam, fv.rect, 4);
        writeRender(dir, "full", full, { view: fv.label, rRound: 0.5 * h });
        const tiles = [{ src: relative(sheets, join(dir, "full.png")).replace(/\\/g, "/"), width: full.w * 2, label: `${fv.label}; shown at 2x` }];
        const lines: string[] = [];
        for (const poi of s.pois ?? []) {
          const zv = zoomView(s, `${poi.name}_6x`, poi.at, poi.radius, 6);
          const z = renderOracle(model, zv.cam, zv.rect, 4);
          writeRender(dir, zv.name, z, { view: zv.label, rRound: 0.5 * h });
          tiles.push({ src: relative(sheets, join(dir, `${zv.name}.png`)).replace(/\\/g, "/"), width: z.w, label: zv.label });
          lines.push(`render ${zv.name}: ${z.ms} ms`);
        }
        lines.unshift(`render full: ${full.ms} ms; corners ${model.corners.length}, clusters ${model.clusters.length}`);
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
      const html = sheetHtml(
        "K868 sheet A: synthetic scenes, CPU oracle",
        [
          "h = 1 world unit = 10 CSS px at 1x, W = 0.38h. Left: the scene camera (1x) shown at 2x; right: 6x zoom renders around each POI.",
          "Round corners: rolling ball r = 0.5h; sharp corners: V. Supersampling 4x4 per device pixel.",
        ],
        rows,
      );
      const png = await renderSheet(sheets, "A_synthetic", html);
      console.log("sheet A:", png);
    },
    1800000,
  );
});
