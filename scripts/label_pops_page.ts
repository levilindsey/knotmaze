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
// With ?gpu=1 the band's tube edges come from the tables on the GPU (K868
// S3a8b2, label_band_gpu.ts) as in the app; ?edges=cpu keeps them on the CPU
// (buildBandStrips' cut pieces, S3a8b's lbp-on path). Each frame returns
// `edges` ("gpu" or "cpu") and `edgeError` (the edge program's compile
// failure, or null): the driver fails a ?gpu=1 run whose edges fell back.
//
// ?strips=ref (K868 S3a8b) builds the strips with the frozen S3a8a copy
// (test/render/label/fixtures/label_band_ref.ts): the cuts' kinks as they
// were before call 2, for the stage's raster census. It implies ?edges=cpu.
//
// __pops.edgeCheck(sceneJson) (K868 S3a8b2, call 5's browser same-answer
// check) runs the real edge vertex shader through transform feedback, with
// the outline point and outward normal captured beside s, and compares every
// vertex with refBandEdge (the Node float32 mirror).
//
// __pops.labels(x0, y0, x1, y1) (K868 S3a8b2) reads the last render's label
// words in a box, for attributing a band pixel to the strip and test that
// drew or dropped it (.claude/probes/S3a/crack22.ts).
import type { FieldScene } from "../src/render/field/scene";
import type { FieldModel, OracleParams } from "../src/render/field/oracle";
import { buildLabelPieces, buildLabelPiecesGpu, labelLimits } from "../src/render/label/label_pieces";
import { LabelTableBuilder, SEG_FLOATS, TBL_W } from "../src/render/label/label_tables";
import { LabelPass, type LabelCamera } from "../src/render/label/label_pass";
import { BandPass, buildBandStrips } from "../src/render/label/label_band";
import { bandEdgeSources, refBandEdge } from "../src/render/label/label_band_gpu";
import { findSwitchLines } from "../src/render/label/label_switch";

const q = new URLSearchParams(location.search);
const oraclePath = q.get("oracle") ?? "/src/render/field/oracle.ts";
const gpu = q.get("gpu") === "1";
const gfq = q.get("gf");
const gpuFills = gfq === null ? undefined : gfq === "1";
const stripsRef = q.get("strips") === "ref";
const edgesCpu = q.get("edges") === "cpu" || stripsRef;
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

/** The edge vertex shader with a capture of its outline point and outward
 * normal (vCap = q, side n; zero where the segment draws nothing), inserted
 * into the real text at three anchors. */
function captureVs(): string {
  let v = bandEdgeSources(TBL_W, false).vs;
  const put = (anchor: string, text: string, after: boolean): void => {
    const i = v.indexOf(anchor);
    if (i < 0 || v.indexOf(anchor, i + 1) >= 0) throw new Error(`edge capture: anchor not found once: ${anchor}`);
    const at = after ? i + anchor.length : i;
    v = v.slice(0, at) + text + v.slice(at);
  };
  put("out float vD;", "out vec4 vCap; ", false);
  put("void main() {", "\n  vCap = vec4(0.0);", true);
  put("  vec2 dq = (uM * vec3(q, 1.0)).xy;", "  vCap = vec4(q, sd * n);\n", false);
  return v;
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

  /** The scene and the app's params (parsed outside the timed build). */
  const setup = (sceneJson: string): { scene: FieldScene; params: OracleParams } => {
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
    return { scene, params };
  };

  // The capture program, made on the first edgeCheck.
  let cap: { prog: WebGLProgram; vao: WebGLVertexArrayObject; seg: WebGLBuffer; out: WebGLBuffer } | null = null;
  const captureProgram = (): NonNullable<typeof cap> => {
    if (cap) return cap;
    const sh = (type: number, src: string): WebGLShader => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`edge capture compile: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, captureVs()));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, "#version 300 es\nprecision highp float;\nout vec4 o;\nvoid main() { o = vec4(0.0); }"));
    gl.transformFeedbackVaryings(prog, ["vCap", "vSv"], gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`edge capture link: ${gl.getProgramInfoLog(prog)}`);
    const seg = gl.createBuffer()!;
    const out = gl.createBuffer()!;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, seg);
    const a = gl.getAttribLocation(prog, "aSeg");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, SEG_FLOATS * 4, 0);
    gl.vertexAttribDivisor(a, 2);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    cap = { prog, vao, seg, out };
    return cap;
  };

  G.__pops = {
    oracle: oraclePath,
    gpu,
    edges: gpu && !edgesCpu ? "gpu" : "cpu",
    strips: stripsRef ? "ref" : "src",
    /** One frame: the coverage (base64, w*h bytes, row 0 = top) and the
     * CPU build's time. The scene arrives as JSON text. */
    render(sceneJson: string, cam: LabelCamera, w: number, h: number) {
      const { scene, params } = setup(sceneJson);
      const t0 = performance.now();
      const m = new O.FieldModel(scene, params);
      const lim = labelLimits(m.polys.length, m.clusters.length);
      if (lim) return { error: `label limits: ${lim}` };
      const T = gpu ? tableBuilder.build(m) : null;
      const pieces = T ? buildLabelPiecesGpu(m, T, gpuFills) : buildLabelPieces(m);
      const lines = findSwitchLines(m);
      // As label_app.ts: the GPU draws the tube edges when the tables are on
      // and the edge program compiles; the strips then leave them out.
      const gpuEdges = !!T && !edgesCpu && band.edgesReady(false);
      const strips = stripsRef ? build(m, pieces, lines) : buildBandStrips(m, pieces, lines, { tubeEdges: !gpuEdges });
      const t1 = performance.now();
      pass.setPieces(pieces);
      pass.setTables(T);
      pass.render(cam, w, h, true);
      const { L, D2, tbl } = pass.textures;
      band.setStrips(strips);
      const px = Math.sqrt(Math.abs(cam.a * cam.d - cam.b * cam.c));
      const edges = gpuEdges && T && tbl ? { T, tbl, h: pieces.h } : null;
      band.render(L!, D2!, cam, w, h, { W: strips.W * px, sigma: pieces.sigma, depth: false, edges });
      const cov = band.read();
      return {
        cov: b64(cov),
        w: band.width,
        h: band.height,
        buildMs: t1 - t0,
        glError: gl.getError(),
        gpuFills: pieces.gpuFills === true,
        edges: edges ? "gpu" : "cpu",
        edgeError: band.edgeError[0],
      };
    },
    /** The last render's label words (L) in the box x0..x1, y0..y1
     * (inclusive, rows as cov: row 0 = the canvas's top), row by row; 0
     * outside the canvas. For attributing a band pixel (K868 S3a8b2). */
    labels(x0: number, y0: number, x1: number, y1: number): number[] {
      const L = pass.read();
      const out: number[] = [];
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) out.push(x >= 0 && y >= 0 && x < pass.width && y < pass.height ? L[y * pass.width + x] : 0);
      return out;
    },
    /** Call 5's browser same-answer check on one scene: every vertex of every
     * edge instance from the real vertex shader (transform feedback) against
     * refBandEdge. Differences in world units; okMismatch counts instances
     * whose draw-or-skip differs. */
    edgeCheck(sceneJson: string, tol = 1e-4) {
      const { scene, params } = setup(sceneJson);
      const m = new O.FieldModel(scene, params);
      const lim = labelLimits(m.polys.length, m.clusters.length);
      if (lim) return { error: `label limits: ${lim}` };
      const T = tableBuilder.build(m);
      pass.setTables(T);
      const tbl = pass.textures.tbl;
      if (!tbl) return { error: "no tables texture" };
      const c = captureProgram();
      const nInst = 2 * T.nSegs;
      const nV = 4 * nInst;
      const loc = (n: string): WebGLUniformLocation | null => gl.getUniformLocation(c.prog, n);
      gl.useProgram(c.prog);
      gl.uniformMatrix3fv(loc("uM"), false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
      gl.uniform2f(loc("uSize"), 1, 1);
      gl.uniform1f(loc("uW"), 1);
      gl.uniform1f(loc("uH"), m.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tbl);
      gl.uniform1i(loc("uTbl"), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, c.seg);
      gl.bufferData(gl.ARRAY_BUFFER, T.segs.subarray(0, SEG_FLOATS * T.nSegs), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, c.out);
      gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, nV * 5 * 4, gl.STREAM_READ);
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, c.out);
      gl.bindVertexArray(c.vao);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArraysInstanced(gl.POINTS, 0, 4, nInst);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindVertexArray(null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      const res = new Float32Array(nV * 5);
      gl.bindBuffer(gl.COPY_READ_BUFFER, c.out);
      gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, res);
      gl.bindBuffer(gl.COPY_READ_BUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.useProgram(null);
      const glError = gl.getError();
      let maxQ = 0;
      let maxN = 0;
      let maxS = 0;
      let okMismatch = 0;
      let diffs = 0;
      let skipped = 0;
      let worst = "";
      for (let i = 0; i < nInst; i++) {
        const si = i >> 1;
        const ci = T.segs[SEG_FLOATS * si];
        const k = T.segs[SEG_FLOATS * si + 1];
        const r = refBandEdge(T, ci, k, (i & 1) as 0 | 1, m.h);
        if (!r.ok) skipped++;
        for (let vid = 0; vid < 4; vid++) {
          const o = (4 * i + vid) * 5;
          const atB = (vid & 1) === 1;
          const gok = res[o + 2] !== 0 || res[o + 3] !== 0;
          if (gok !== r.ok) okMismatch++;
          const dS = Math.abs(res[o + 4] - (atB ? r.sb : r.sa));
          let dQ = 0;
          let dN = 0;
          if (r.ok && gok) {
            dQ = Math.max(Math.abs(res[o] - (atB ? r.bx : r.ax)), Math.abs(res[o + 1] - (atB ? r.by : r.ay)));
            dN = Math.max(Math.abs(res[o + 2] - (atB ? r.nbx : r.nax)), Math.abs(res[o + 3] - (atB ? r.nby : r.nay)));
          }
          if (dQ > tol || dN > tol || dS > tol) {
            diffs++;
            if (!worst) worst = `chain ${ci} k ${k} side ${i & 1} vertex ${vid}: dq ${dQ.toExponential(2)} dn ${dN.toExponential(2)} ds ${dS.toExponential(2)}`;
          }
          maxQ = Math.max(maxQ, dQ);
          maxN = Math.max(maxN, dN);
          maxS = Math.max(maxS, dS);
        }
      }
      return { instances: nInst, vertices: nV, skipped: skipped, okMismatch, diffs, maxQ, maxN, maxS, worst, glError };
    },
  };
  log(`label pops page ready (oracle ${oraclePath}, gpu ${gpu}, edges ${gpu && !edgesCpu ? "gpu" : "cpu"})`);
  G.__popsReady = true;
}

main().catch((e) => {
  log(`error: ${e instanceof Error ? e.stack : String(e)}`);
  G.__popsError = String(e);
});
