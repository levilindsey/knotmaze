// K868 S3a6: the pop census's renderer. scripts/label_pops.ts drives it
// through Chrome; the header there says how to run it.
//
// It renders a recorded scene's label as the app does (label_app.ts: the
// FieldModel with the app's params, buildLabelPieces, the switch lines,
// buildBandStrips, the packed LabelPass, then the BandPass without depth)
// at a camera the driver fixes, and returns the band pass's coverage. The
// switch lines come from findSwitchLines, which the app's cached search
// must equal (its verifySwitch check). If a later stage changes the app's
// label path, change this file with it, or the census measures the old one.
//
// ?oracle=<served path of an oracle module> swaps the FieldModel, so a
// frozen copy of an older oracle can render the "before" frames.
//
// ?gpu=1 (K868 S3a7) renders with the GPU pieces (the app's labelGpu): the
// tables (label_tables.ts), buildLabelPiecesGpu and LabelPass's GPU tubes,
// as label_app.ts does with the flag on. ?gf=1 / ?gf=0 (K868 S3a8a) force the
// GPU pieces' fills on or off (S3a7's z-split windows); absent, the default.
//
// ?strips=ref (K868 S3a8b) builds the strips with the frozen S3a8a copy
// (test/render/label/fixtures/label_band_ref.ts): the cuts' kinks as they
// were before call 2, for the stage's raster census.
import type { FieldScene } from "../src/render/field/scene";
import type { FieldModel, OracleParams } from "../src/render/field/oracle";
import { buildLabelPieces, buildLabelPiecesGpu, labelLimits } from "../src/render/label/label_pieces";
import { LabelTableBuilder } from "../src/render/label/label_tables";
import { LabelPass, type LabelCamera } from "../src/render/label/label_pass";
import { BandPass, buildBandStrips } from "../src/render/label/label_band";
import { findSwitchLines } from "../src/render/label/label_switch";

const q = new URLSearchParams(location.search);
const oraclePath = q.get("oracle") ?? "/src/render/field/oracle.ts";
const gpu = q.get("gpu") === "1";
const gfq = q.get("gf");
const gpuFills = gfq === null ? undefined : gfq === "1";
const stripsRef = q.get("strips") === "ref";
const tableBuilder = new LabelTableBuilder();
const logEl = document.getElementById("log")!;
const log = (s: string): void => {
  logEl.textContent += s + "\n";
  console.log(s);
};
const G = window as unknown as Record<string, unknown>;

const b64 = (u: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};

interface OracleModule {
  FieldModel: new (scene: FieldScene, params: OracleParams) => FieldModel;
  cornerRadius: (cr: number, h: number, theta: number) => number;
}

async function main(): Promise<void> {
  const O = (await import(/* @vite-ignore */ oraclePath)) as OracleModule;
  const refPath = "/test/render/label/fixtures/label_band_ref.ts";
  const build = stripsRef
    ? ((await import(/* @vite-ignore */ refPath)) as { buildBandStripsRef: typeof buildBandStrips }).buildBandStripsRef
    : buildBandStrips;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  // A lost context reads back zeros: the driver fails the run on it.
  canvas.addEventListener("webglcontextlost", () => {
    G.__popsLost = ((G.__popsLost as number) || 0) + 1;
    log("webglcontextlost");
  });
  const gl = canvas.getContext("webgl2", { antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error("no WebGL2");
  const pass = new LabelPass(gl, true);
  const band = new BandPass(gl);
  G.__pops = {
    oracle: oraclePath,
    gpu,
    strips: stripsRef ? "ref" : "src",
    /** One frame: the coverage (base64, w*h bytes, row 0 = top) and the
     * CPU build's time. The scene arrives as JSON text. */
    render(sceneJson: string, cam: LabelCamera, w: number, h: number) {
      const scene = JSON.parse(sceneJson) as FieldScene;
      scene.look.ctrlArc ??= 0.47;
      const hw = scene.look.halfWidth;
      const params: OracleParams = {
        rRound: 0,
        rOf: (_j, _i, th, st) => (st === "round" ? O.cornerRadius(3, hw, th) : 0),
        spans: "k883",
        crMax: 3,
        labelOnly: true,
      } as OracleParams;
      const t0 = performance.now();
      const m = new O.FieldModel(scene, params);
      const lim = labelLimits(m.polys.length, m.clusters.length);
      if (lim) return { error: `label limits: ${lim}` };
      const T = gpu ? tableBuilder.build(m) : null;
      const pieces = T ? buildLabelPiecesGpu(m, T, gpuFills) : buildLabelPieces(m);
      const lines = findSwitchLines(m);
      const strips = build(m, pieces, lines);
      const t1 = performance.now();
      pass.setPieces(pieces);
      pass.setTables(T);
      pass.render(cam, w, h, true);
      const { L, D2 } = pass.textures;
      band.setStrips(strips);
      const px = Math.sqrt(Math.abs(cam.a * cam.d - cam.b * cam.c));
      band.render(L!, D2!, cam, w, h, { W: strips.W * px, sigma: pieces.sigma, depth: false });
      const cov = band.read();
      return { cov: b64(cov), w: band.width, h: band.height, buildMs: t1 - t0, glError: gl.getError(), gpuFills: pieces.gpuFills === true };
    },
  };
  log(`label pops page ready (oracle ${oraclePath}, gpu ${gpu})`);
  G.__popsReady = true;
}

main().catch((e) => {
  log(`error: ${e instanceof Error ? e.stack : String(e)}`);
  G.__popsError = String(e);
});
