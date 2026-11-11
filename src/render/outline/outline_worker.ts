// K1240 S4: the redesign's builds off the main thread (rp=outline).
// One module worker, one OutlineModel: a scene comes in, the draw's arrays
// go back (transferred). A new diagram (diagramKey), or a frame the carried
// structure cannot take (paintFrame's "run count changed" when an arm's s
// moves), restructures; the reply says why (cause), and the app logs it.
// Why a worker of its own and not main or K7's physics worker:
// outline_app.ts's header.
import { OutlineModel, diagramKey } from "./outline_model";
import type { SceneIn } from "./outline";

export interface OutlineRequest {
  id: number;
  scene: SceneIn;
}

/** One frame's draw data. idx and run come only with a new structure. */
export interface OutlineReply {
  id: number;
  error?: string;
  restructured: boolean;
  /** Why it restructured (null when it did not): "first", "key: <part>
   *  <old> -> <new>" or "update threw: <message>". */
  cause: string | null;
  key: string;
  ks: number;
  /** Worker wall ms: this message, the model's structure, its last frame. */
  ms: number;
  structureMs: number;
  frameMs: number;
  /** The last frame's parts (OutlineModel.parts). */
  parts: { frame: number; zChains: number; fill: number; paint: number; band: number } | null;
  idx: Uint32Array | null;
  run: Int32Array | null;
  /** K1291: each section run's chain (the scene chain index = the app's). */
  runChain: Int32Array;
  pos: Float32Array;
  pkey: Float32Array;
  w: Float32Array;
  s: Float32Array;
  tex: Float32Array;
  texW: number;
  texH: number;
  /** band_gpu: per vertex pos, (s, dC, z) and BAND_SLOTS pass ids; the tables. */
  bandPos: Float32Array;
  bandAttr: Float32Array;
  bandSlots: Int32Array;
  bandCount: number;
  chainTex: Float32Array;
  chainTexH: number;
  passTex: Float32Array;
  passTexH: number;
  ink: [number, number, number];
  h: number;
  W: number;
  zt: number;
  /** K1291 s2: per band vertex its scene chain (-1 none); per scene chain (base, n, closed length or -1, 0) in chainTex. */
  bandChain: Int16Array;
  chainInfo: Float32Array;
}

/** Where two diagram keys first differ: the part (chains | crossings |
 *  junctions) and the differing tokens. */
export function keyDiff(a: string, b: string): string {
  const pa = a.split(" | "); const pb = b.split(" | ");
  const names = ["chains", "crossings", "junctions"];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === pb[i]) continue;
    const ta = (pa[i] ?? "").split(" "); const tb = (pb[i] ?? "").split(" ");
    let k = 0; while (k < ta.length && k < tb.length && ta[k] === tb[k]) k++;
    return `${names[i] ?? `part ${i}`} (${ta.length} -> ${tb.length}) at ${k}: ${ta[k] ?? "-"} -> ${tb[k] ?? "-"}`;
  }
  return "same";
}

interface Scope {
  onmessage: ((e: MessageEvent<OutlineRequest>) => void) | null;
  postMessage(m: unknown, transfer: Transferable[]): void;
}
const scope = self as unknown as Scope;
let model: OutlineModel | null = null;

scope.onmessage = (e: MessageEvent<OutlineRequest>): void => {
  const { id, scene } = e.data;
  const t0 = performance.now();
  try {
    let cause: string | null = null;
    const key = diagramKey(scene);
    if (!model || model.key !== key) {
      cause = model ? `key: ${keyDiff(model.key, key)}` : "first";
      model = new OutlineModel(scene);
    } else {
      try {
        model.update(scene);
      } catch (err) {
        cause = `update threw: ${err instanceof Error ? err.message : String(err)}`;
        model = new OutlineModel(scene);
      }
    }
    const restructured = cause !== null;
    const m = model;
    const pd = m.pd;
    // The paint arrays are the model's own (paintFrame writes them in
    // place): copies go; the band is new each frame and goes itself.
    const r: OutlineReply = {
      id,
      restructured,
      cause,
      key: m.key,
      ks: m.ks,
      ms: performance.now() - t0,
      structureMs: m.structureMs,
      frameMs: restructured ? 0 : m.frameMs,
      parts: restructured ? null : m.parts,
      idx: restructured ? pd.idx.slice() : null,
      run: restructured ? pd.run.slice() : null,
      runChain: Int32Array.from(pd.sp.runs, (q) => q.pi),
      pos: pd.pos.slice(),
      pkey: pd.key.slice(),
      w: pd.w.slice(),
      s: pd.s.slice(),
      tex: pd.tex.slice(),
      texW: pd.texW,
      texH: pd.texH,
      bandPos: m.band.pos,
      bandAttr: m.band.attr,
      bandSlots: m.band.slots,
      bandCount: m.band.count,
      chainTex: m.band.chainTex,
      chainTexH: m.band.chainTexH,
      passTex: m.band.passTex,
      passTexH: m.band.passTexH,
      ink: m.band.ink,
      h: m.band.h,
      W: m.band.W,
      zt: m.band.zt,
      bandChain: m.band.chain,
      chainInfo: m.band.chainInfo,
    };
    const tr: Transferable[] = [r.pos.buffer, r.pkey.buffer, r.w.buffer, r.s.buffer, r.tex.buffer, r.bandPos.buffer, r.bandAttr.buffer, r.bandSlots.buffer, r.chainTex.buffer, r.passTex.buffer, r.bandChain.buffer, r.chainInfo.buffer];
    if (r.idx) tr.push(r.idx.buffer);
    if (r.run) tr.push(r.run.buffer);
    scope.postMessage(r, tr);
  } catch (err) {
    model = null;
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) }, []);
  }
};
