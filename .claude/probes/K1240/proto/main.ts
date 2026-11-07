// K1240 S1 page: one outline, both looks. Loads a FieldScene JSON, builds
// the outline in the browser, draws it with WebGL2, and runs the Done 3
// pixel tests. Modes: ?scene=def&mode=border|fill|both (default both),
// optional crop &cx=<world>&cy=<world>&zoom=<css zoom> for sheets.
// Results land on window.__k1240 for the drivers.
import { buildOutline, type SceneIn } from "./outline";
import { buildDrawData, OutlineRenderer, chainColor, baseHueFor, parseColor, worldToDevice, scenePointAt } from "./draw";

declare global {
  interface Window { __k1240?: unknown }
}

const q = new URLSearchParams(location.search);
const sceneName = q.get("scene") ?? "def";
const mode = (q.get("mode") ?? "both") as "border" | "fill" | "both";
const crop = q.get("cx") !== null ? { cx: Number(q.get("cx")), cy: Number(q.get("cy")), zoom: Number(q.get("zoom") ?? 4) } : undefined;

const canvas = document.getElementById("c") as HTMLCanvasElement;
const logEl = document.getElementById("log") as HTMLElement;
const lines: string[] = [];
function say(s: string): void {
  lines.push(s);
  logEl.textContent = lines.join("\n");
  console.log(s);
}

async function main(): Promise<void> {
  const res = await fetch(`../out/scenes/${sceneName}.json`);
  if (!res.ok) throw new Error(`scene ${sceneName}: HTTP ${res.status}`);
  const scene = (await res.json()) as SceneIn;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  canvas.width = scene.camera.viewport[0] * 2;
  canvas.height = scene.camera.viewport[1] * 2;
  canvas.style.width = `${scene.camera.viewport[0]}px`;
  canvas.style.height = `${scene.camera.viewport[1]}px`;

  const t0 = performance.now();
  const table = buildOutline(scene);
  const buildMs = performance.now() - t0;
  const data = buildDrawData(table, scene);
  const renderer = new OutlineRenderer(canvas, data);
  renderer.draw(scene, mode, crop);

  // ---- Done 3 tests -------------------------------------------------------
  const gl = canvas.getContext("webgl2")!;
  const px = new Uint8Array(4);
  const readAt = (wx: number, wy: number): [number, number, number] => {
    const [dx, dy] = worldToDevice(scene, wx, wy);
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(dx)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(dy)));
    gl.readPixels(x, canvas.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return [px[0], px[1], px[2]];
  };
  const nearCol = (c: [number, number, number], ref: [number, number, number], tol = 3): boolean =>
    Math.abs(c[0] - ref[0] * 255) <= tol && Math.abs(c[1] - ref[1] * 255) <= tol && Math.abs(c[2] - ref[2] * 255) <= tol;
  const baseHue = baseHueFor(scene.name);
  const colOf = (chain: number): [number, number, number] => chainColor(chain, scene.chains.length, baseHue);
  const tests: Record<string, unknown> = {};

  // Fill: every face's sample pixel carries its owner's colour.
  renderer.draw(scene, "fill", crop);
  {
    let okN = 0; let tot = 0; const misses: string[] = [];
    for (const f of table.faces) {
      if (f.hole || f.ownerChain < 0) continue;
      tot++;
      const c = readAt(f.sample[0], f.sample[1]);
      if (nearCol(c, colOf(f.ownerChain))) okN++;
      else if (misses.length < 5) misses.push(`face owner ${f.ownerChain} at ${f.sample.map((v) => v.toFixed(1))} got ${c}`);
    }
    tests.fillSamples = { ok: okN, total: tot, misses };
    say(`TEST fill samples: ${okN}/${tot} ${okN === tot ? "PASS" : "FAIL " + misses.join("; ")}`);
  }
  // Overlap: at each crossing the over chain owns the centre pixel.
  {
    let okN = 0; let tot = 0; const misses: string[] = [];
    for (const x of scene.crossings) {
      const overChain = x.over === "a" ? x.a.chain : x.b.chain;
      const overS = x.over === "a" ? x.a.s : x.b.s;
      const ci = scene.chains.findIndex((c) => c.id === overChain);
      if (ci < 0) continue;
      const [wx, wy] = scenePointAt(scene, ci, overS);
      tot++;
      const c = readAt(wx, wy);
      if (nearCol(c, colOf(ci))) okN++;
      else if (misses.length < 5) misses.push(`crossing at ${wx.toFixed(1)},${wy.toFixed(1)} want chain ${ci} got ${c}`);
    }
    tests.overlap = { ok: okN, total: tot, misses };
    say(`TEST overlap ownership: ${okN}/${tot} ${okN === tot ? "PASS" : "FAIL " + misses.join("; ")}`);
  }
  // Border: band pixels just inside the outline are ink, just outside not.
  renderer.draw(scene, "border", crop);
  {
    const ink = parseColor(scene.look.ink);
    const paper = parseColor(scene.look.paper);
    const ppd = scene.camera.pxPerUnit * 2;
    let inOk = 0; let outOk = 0; let tot = 0;
    for (const p of table.pieces) {
      const np = p.pts.length / 2;
      for (let i = 0; i < np; i += 3) {
        const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
        const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1];
        let dx = cx - x; let dy = cy - y;
        const l = Math.hypot(dx, dy);
        if (l < 1e-9) continue;
        dx /= l; dy /= l;
        tot++;
        const inw = Math.min(table.W * 0.5, 1.2 / ppd);
        if (nearCol(readAt(x + dx * inw, y + dy * inw), ink, 4)) inOk++;
        const outw = 1.6 / ppd;
        const oc = readAt(x - dx * outw, y - dy * outw);
        if (!nearCol(oc, ink, 4) || nearCol(oc, paper, 4)) outOk++;
      }
    }
    tests.borderBand = { inOk, outOk, total: tot };
    say(`TEST border band: inside ${inOk}/${tot}, outside-not-ink ${outOk}/${tot} ${inOk === tot && outOk === tot ? "PASS" : "CHECK"}`);
  }
  // Fill edge on the outline: just inside a piece point is fill, and the
  // fill boundary coincides with the piece polyline (same table).
  renderer.draw(scene, "fill", crop);
  {
    const paper = parseColor(scene.look.paper);
    const ppd = scene.camera.pxPerUnit * 2;
    let inOk = 0; let tot = 0;
    for (const p of table.pieces) {
      const np = p.pts.length / 2;
      for (let i = 0; i < np; i += 3) {
        const x = p.pts[2 * i]; const y = p.pts[2 * i + 1];
        const cx = p.cpts[2 * i]; const cy = p.cpts[2 * i + 1];
        let dx = cx - x; let dy = cy - y;
        const l = Math.hypot(dx, dy);
        if (l < 1e-9) continue;
        dx /= l; dy /= l;
        tot++;
        if (!nearCol(readAt(x + dx * (0.75 / ppd), y + dy * (0.75 / ppd)), paper, 4)) inOk++;
      }
    }
    tests.fillEdge = { inOk, total: tot };
    say(`TEST fill edge inside: ${inOk}/${tot} ${inOk === tot ? "PASS" : "CHECK"}`);
  }

  // GPU draw time (synchronous finish timing), median of 5.
  const times: Record<string, number> = {};
  for (const m of ["border", "fill", "both"] as const) {
    const ts: number[] = [];
    for (let i = 0; i < 5; i++) ts.push(renderer.timeDraw(scene, m));
    ts.sort((a, b) => a - b);
    times[m] = ts[2];
  }
  renderer.draw(scene, mode, crop);
  say(`build ${buildMs.toFixed(1)} ms | draw ms border=${times.border.toFixed(2)} fill=${times.fill.toFixed(2)} both=${times.both.toFixed(2)} | pieces=${table.pieces.length} faces=${table.faces.length} regions=${table.regions.length}`);
  say(table.diagnostics.join(" | "));
  window.__k1240 = { scene: sceneName, buildMs, drawMs: times, tests, pieces: table.pieces.length, faces: table.faces.length, regions: table.regions.length, corners: table.corners, cuts: table.cuts.length, diagnostics: table.diagnostics };
}

main().catch((e: Error) => {
  say(`ERROR: ${e.message}`);
  window.__k1240 = { error: e.message };
});
